/**
 * Server-only shop logic: pricing, order creation, ToyyibPay payments.
 * Never imported from client code — only from server function handlers.
 */
import { getAdminClient } from "@/integrations/hiplastics/admin.server";
import { randomBytes } from "node:crypto";
import { sendOrderConfirmationEmail, sendOrderStatusEmail, sendLowStockAlertEmail } from "./email.server";
import { normalizeMyPhone } from "./site";

/** Stock at or below this triggers a low-stock alert email to the admin. */
const LOW_STOCK_THRESHOLD = 5;

export type CartLine = { slug: string; qty: number };

export type ShopSettings = {
  currency: string;
  shipping_flat: number;
  shipping_east: number;
  free_shipping_over: number;
  sst_percent: number;
  cod_enabled: boolean;
  online_payment_enabled: boolean;
};

const EAST_STATES = ["sabah", "sarawak", "labuan"];

export function getBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.PUBLIC_SITE_URL ||
    "https://hiplastics.my"
  ).replace(/\/$/, "");
}

export function toyyibConfig() {
  const secret = process.env.TOYYIBPAY_SECRET_KEY || "";
  const category = process.env.TOYYIBPAY_CATEGORY_CODE || "";
  const sandbox = String(process.env.TOYYIBPAY_SANDBOX || "").toLowerCase() === "true";
  const host = sandbox ? "https://dev.toyyibpay.com" : "https://toyyibpay.com";
  return { secret, category, sandbox, host };
}

export async function loadShopSettings(): Promise<ShopSettings> {
  const admin = getAdminClient();
  const { data } = await admin.from("site_settings").select("*").eq("id", 1).maybeSingle();
  const s = (data ?? {}) as Record<string, unknown>;
  const num = (v: unknown, d: number) => (v === null || v === undefined || v === "" ? d : Number(v));
  return {
    currency: (s.currency as string) || "MYR",
    shipping_flat: num(s.shipping_flat, 15),
    shipping_east: num(s.shipping_east, 25),
    free_shipping_over: num(s.free_shipping_over, 0),
    sst_percent: num(s.sst_percent, 6),
    cod_enabled: s.cod_enabled !== false,
    online_payment_enabled: s.online_payment_enabled !== false,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function priceCart(lines: CartLine[], state: string, couponCode?: string) {
  const admin = getAdminClient();
  const slugs = lines.map((l) => l.slug);
  const { data: rows, error } = await admin
    .from("products")
    .select("id, slug, name, price, image_url, image_urls, is_active, is_purchasable, stock")
    .in("slug", slugs);
  if (error) throw new Error(error.message);

  const settings = await loadShopSettings();
  const items = lines.map((l) => {
    const p = (rows ?? []).find((r) => r.slug === l.slug);
    if (!p) throw new Error(`Product not available: ${l.slug}`);
    if (p.is_active === false || p.is_purchasable === false)
      throw new Error(`${p.name} is not available for online purchase.`);
    const qty = Math.max(1, Math.min(999, Math.floor(l.qty)));
    const stock = Math.max(0, Number(p.stock) || 0);
    if (stock <= 0) throw new Error(`${p.name} is out of stock.`);
    if (qty > stock)
      throw new Error(`Only ${stock} unit(s) of ${p.name} left in stock. Please reduce the quantity.`);
    const unit = round2(Number(p.price) || 0);
    if (unit <= 0) throw new Error(`${p.name} has no price set.`);
    const imgs = Array.isArray(p.image_urls) ? (p.image_urls as string[]).filter(Boolean) : [];
    return {
      product_id: p.id as string,
      slug: p.slug as string,
      name: p.name as string,
      image_url: imgs[0] || (p.image_url as string) || "",
      unit_price: unit,
      qty,
      stock,
      line_total: round2(unit * qty),
    };
  });

  const subtotal = round2(items.reduce((s, i) => s + i.line_total, 0));

  let discount = 0;
  let coupon_code: string | undefined;
  if (couponCode && couponCode.trim()) {
    const { data: cData, error: cErr } = await admin.rpc("check_coupon", {
      p_code: couponCode.trim(),
      p_subtotal: subtotal,
    });
    if (cErr) throw new Error(cErr.message);
    const row = Array.isArray(cData) ? cData[0] : cData;
    if (!row?.ok) throw new Error(row?.message || "Invalid coupon code.");
    discount = round2(Number(row.discount) || 0);
    coupon_code = couponCode.trim().toUpperCase();
  }

  const isEast = EAST_STATES.includes((state || "").trim().toLowerCase());
  let shipping = isEast ? settings.shipping_east : settings.shipping_flat;
  if (settings.free_shipping_over > 0 && subtotal >= settings.free_shipping_over) shipping = 0;
  shipping = round2(shipping);
  const discountedSubtotal = Math.max(0, round2(subtotal - discount));
  const tax = round2(((discountedSubtotal + shipping) * settings.sst_percent) / 100);
  const total = round2(discountedSubtotal + shipping + tax);
  return { items, subtotal, shipping, tax, discount, coupon_code, total, settings };
}

function makeOrderNo() {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  // 10 hex chars ≈ 40 bits of entropy — makes the order-lookup-by-email path
  // (no token needed, see loadOrder) infeasible to brute-force even without
  // rate limiting. The previous 4-char Math.random() suffix (~20 bits) was
  // guessable within a single day's keyspace by a scripted attacker.
  const rand = randomBytes(5).toString("hex").toUpperCase();
  return `HP-${ymd}-${rand}`;
}

export type CheckoutInput = {
  items: CartLine[];
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postcode: string;
  notes?: string;
  payment_method: "cod" | "toyyibpay";
  /** Logged-in customer's Supabase access token. Required — no guest checkout. */
  access_token: string;
  coupon_code?: string;
};

/**
 * Atomically reserve stock for every cart line. Uses a single row-locked
 * UPDATE per line (hiplastics.reserve_stock), so two customers racing for
 * the last unit can never both succeed. If any line fails (out of stock by
 * the time we get here, or someone else just bought it), everything already
 * reserved in this call is rolled back before throwing.
 */
/**
 * supabase-js's query/rpc builders are lazily-executed "thenables" — they
 * only become a real Promise (with .catch/.finally) once awaited, so
 * chaining `.catch()` directly on them throws "...catch is not a function".
 * This wraps an rpc call in a real try/catch so best-effort calls (stock
 * restore, coupon release) can safely swallow errors without crashing the
 * caller, e.g. order cancellation.
 */
async function safeRpc(admin: ReturnType<typeof getAdminClient>, fn: string, args: Record<string, unknown>) {
  try {
    await admin.rpc(fn, args);
  } catch {
    /* best-effort — caller doesn't need this to succeed to proceed */
  }
}

async function reserveStockForOrder(
  admin: ReturnType<typeof getAdminClient>,
  items: { slug: string; qty: number; name: string }[],
) {
  const reserved: { slug: string; qty: number }[] = [];
  try {
    for (const it of items) {
      const { data, error } = await admin.rpc("reserve_stock", { p_slug: it.slug, p_qty: it.qty });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.ok) {
        const left = Number(row?.remaining ?? 0);
        throw new Error(
          left > 0
            ? `Only ${left} unit(s) of ${it.name} left in stock. Please reduce the quantity and try again.`
            : `${it.name} just went out of stock. Please remove it from your cart.`,
        );
      }
      reserved.push({ slug: it.slug, qty: it.qty });
    }
  } catch (e) {
    // Roll back everything this call already reserved.
    for (const r of reserved) {
      await safeRpc(admin, "restore_stock", { p_slug: r.slug, p_qty: r.qty });
    }
    throw e;
  }
}

async function restoreStockForOrder(
  admin: ReturnType<typeof getAdminClient>,
  items: { slug: string; qty: number }[],
) {
  for (const it of items) {
    await safeRpc(admin, "restore_stock", { p_slug: it.slug, p_qty: it.qty });
  }
}

async function releaseCouponIfAny(admin: ReturnType<typeof getAdminClient>, couponCode?: string) {
  if (!couponCode) return;
  await safeRpc(admin, "release_coupon", { p_code: couponCode });
}

/**
 * Live stock/availability snapshot for the given cart slugs — used by the
 * cart page to show per-line stock and auto-handle deleted/out-of-stock
 * items, without throwing (unlike priceCart, which is the strict gate used
 * right before checkout).
 */
export async function getCartStockInfo(slugs: string[]) {
  if (!slugs.length) return { items: [] as { slug: string; name: string; price: number; stock: number; available: boolean }[] };
  const admin = getAdminClient();
  const { data: rows, error } = await admin
    .from("products")
    .select("slug, name, price, stock, is_active, is_purchasable")
    .in("slug", slugs);
  // IMPORTANT: previously this error was silently discarded, so a transient
  // DB/network hiccup would make every product look "not found" and the
  // cart page would auto-remove every item on every load. Throw instead so
  // the caller (cartStock server fn) reports ok:false and the cart page
  // leaves the cart untouched rather than wiping it on an error.
  if (error) throw new Error(error.message);
  return {
    items: slugs.map((slug) => {
      const p = (rows ?? []).find((r) => r.slug === slug);
      if (!p) return { slug, name: slug, price: 0, stock: 0, available: false };
      const available = p.is_active !== false && p.is_purchasable !== false;
      return {
        slug,
        name: p.name as string,
        price: round2(Number(p.price) || 0),
        stock: Math.max(0, Number(p.stock) || 0),
        available,
      };
    }),
  };
}

export async function createOrder(input: CheckoutInput) {
  if (!input.items.length) throw new Error("Your cart is empty.");
  const admin = getAdminClient();

  // No guest checkout — every order must belong to a signed-in customer.
  const { data: authData, error: authErr } = await admin.auth.getUser(input.access_token);
  if (authErr || !authData?.user) throw new Error("Please sign in to place an order.");
  const userId = authData.user.id;

  // Re-price against the live database — never trust client-supplied prices/stock.
  const priced = await priceCart(input.items, input.state, input.coupon_code);

  if (input.payment_method === "cod" && !priced.settings.cod_enabled)
    throw new Error("Cash on delivery is currently unavailable.");
  if (input.payment_method === "toyyibpay" && !priced.settings.online_payment_enabled)
    throw new Error("Online payment is currently unavailable.");

  // Reserve stock BEFORE creating the order row. This is the authoritative,
  // race-condition-safe gate: it re-checks stock at the exact moment of
  // purchase, not just when the cart was last priced.
  await reserveStockForOrder(admin, priced.items);

  // Redeem the coupon atomically too — same race-condition-safe pattern as
  // stock. If someone else used the last redemption between quote and now,
  // give the stock back and fail cleanly rather than under-charge silently.
  if (priced.coupon_code) {
    const { data: redeemed, error: redeemErr } = await admin.rpc("redeem_coupon", { p_code: priced.coupon_code });
    if (redeemErr || !redeemed) {
      await restoreStockForOrder(admin, priced.items);
      throw new Error("This coupon just became unavailable. Please remove it and try again.");
    }
  }

  const order_no = makeOrderNo();
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      order_no,
      user_id: userId,
      customer_name: input.customer_name,
      customer_email: input.customer_email.toLowerCase().trim(),
      // Store in "+60XXXXXXXXXX" form so every downstream use (admin
      // WhatsApp button, confirmation email, invoice) has a number WhatsApp
      // can actually resolve — customers commonly type the local 0-prefixed
      // format, which wa.me links silently fail on.
      customer_phone: `+${normalizeMyPhone(input.customer_phone)}`,
      company: input.company ?? "",
      address1: input.address1,
      address2: input.address2 ?? "",
      city: input.city,
      state: input.state,
      postcode: input.postcode,
      notes: input.notes ?? "",
      subtotal: priced.subtotal,
      shipping: priced.shipping,
      tax: priced.tax,
      discount: priced.discount,
      coupon_code: priced.coupon_code ?? "",
      total: priced.total,
      currency: priced.settings.currency,
      payment_method: input.payment_method,
      payment_status: "pending",
      status: "new",
      // Stock was already deducted above, at reservation time.
      stock_applied: true,
    })
    .select()
    .single();
  if (error) {
    // Order row failed to create — give the stock back.
    await restoreStockForOrder(admin, priced.items);
    await releaseCouponIfAny(admin, priced.coupon_code);
    throw new Error(error.message);
  }

  const { error: itemsErr } = await admin.from("order_items").insert(
    priced.items.map(({ stock: _stock, ...i }) => ({ ...i, order_id: order.id })),
  );
  if (itemsErr) {
    // Line items failed — undo the order and give stock back so nothing is stuck reserved.
    await admin.from("orders").delete().eq("id", order.id);
    await restoreStockForOrder(admin, priced.items);
    await releaseCouponIfAny(admin, priced.coupon_code);
    throw new Error(itemsErr.message);
  }

  // Order placed — this cart is no longer "abandoned", so clear any saved
  // snapshot for this customer to stop the reminder cron from emailing them.
  // (Awaited inside try/catch, not `.catch()` — the Postgrest query builder
  // isn't a real Promise until awaited, so it doesn't have a .catch method.)
  try {
    await admin.from("cart_snapshots").delete().eq("user_id", userId);
  } catch {
    /* best-effort cleanup — never block order placement on this */
  }

  const trackUrl = `/order/${order.order_no}?t=${order.access_token}`;

  if (input.payment_method === "cod") {
    sendOrderConfirmationEmail(
      order as unknown as Parameters<typeof sendOrderConfirmationEmail>[0],
      priced.items.map((i) => ({ name: i.name, qty: i.qty, unit_price: i.unit_price, line_total: i.line_total })),
      "cod",
    ).catch(() => undefined);
    return { order_no: order.order_no, token: order.access_token as string, trackUrl, paymentUrl: null };
  }

  let paymentUrl: { billCode: string; url: string };
  try {
    paymentUrl = await createToyyibBill({
      orderNo: order.order_no,
      total: priced.total,
      name: input.customer_name,
      email: input.customer_email,
      phone: input.customer_phone,
      token: order.access_token as string,
    });
  } catch (e) {
    // Payment gateway failed to create a bill — don't leave stock stuck
    // reserved against a dead order. Cancel it and give the stock back.
    await admin
      .from("orders")
      .update({
        status: "cancelled",
        payment_status: "failed",
        stock_applied: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    await restoreStockForOrder(admin, priced.items);
    await releaseCouponIfAny(admin, priced.coupon_code);
    throw e;
  }

  await admin
    .from("orders")
    .update({ bill_code: paymentUrl.billCode, updated_at: new Date().toISOString() })
    .eq("id", order.id);

  return { order_no: order.order_no, token: order.access_token as string, trackUrl, paymentUrl: paymentUrl.url };
}

async function createToyyibBill(a: {
  orderNo: string;
  total: number;
  name: string;
  email: string;
  phone: string;
  token: string;
}) {
  const cfg = toyyibConfig();
  if (!cfg.secret || !cfg.category)
    throw new Error(
      "Online payment is not configured yet (TOYYIBPAY_SECRET_KEY / TOYYIBPAY_CATEGORY_CODE missing).",
    );
  const base = getBaseUrl();
  const body = new URLSearchParams({
    userSecretKey: cfg.secret,
    categoryCode: cfg.category,
    billName: `Order ${a.orderNo}`.slice(0, 30),
    billDescription: `Hiplastics order ${a.orderNo}`.slice(0, 100),
    billPriceSetting: "1",
    billPayorInfo: "1",
    billAmount: String(Math.round(a.total * 100)),
    billReturnUrl: `${base}/order/${a.orderNo}?t=${a.token}`,
    billCallbackUrl: `${base}/api/public/toyyibpay-callback`,
    billExternalReferenceNo: a.orderNo,
    billTo: a.name,
    billEmail: a.email,
    billPhone: a.phone.replace(/[^\d+]/g, ""),
    billSplitPayment: "0",
    billPaymentChannel: "0",
    billChargeToCustomer: "1",
    billExpiryDays: "3",
    // DuitNow QR — shown alongside FPX on the ToyyibPay hosted payment page.
    // chargeDuitNowQR=0 means the DuitNow QR processing fee is absorbed by
    // the merchant (us), not passed on to the customer.
    enableDuitNowQR: "1",
    chargeDuitNowQR: "0",
  });
  const res = await fetch(`${cfg.host}/index.php/api/createBill`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Payment gateway error: ${text.slice(0, 200)}`);
  }
  const billCode = Array.isArray(parsed) ? (parsed[0] as { BillCode?: string })?.BillCode : undefined;
  if (!billCode) throw new Error(`Payment gateway error: ${text.slice(0, 200)}`);
  return { billCode, url: `${cfg.host}/${billCode}` };
}

/** Ask ToyyibPay for the authoritative status of a bill. */
export async function syncBillStatus(orderNo: string) {
  const admin = getAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("order_no", orderNo).maybeSingle();
  if (!order || order.payment_method !== "toyyibpay" || !order.bill_code) return order;
  if (order.payment_status === "paid") return order;

  const cfg = toyyibConfig();
  if (!cfg.secret) return order;
  const res = await fetch(`${cfg.host}/index.php/api/getBillTransactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ billCode: order.bill_code, billpaymentStatus: "1" }),
  });
  const text = await res.text();
  let rows: Array<{ billpaymentStatus?: string; billpaymentInvoiceNo?: string; billpaymentAmount?: string }> = [];
  try {
    rows = JSON.parse(text);
  } catch {
    return order;
  }
  const paid = Array.isArray(rows) && rows.find((r) => r.billpaymentStatus === "1");
  if (!paid) return order;
  const { data: updated } = await admin
    .from("orders")
    .update({
      payment_status: "paid",
      status: order.status === "new" ? "processing" : order.status,
      transaction_id: paid.billpaymentInvoiceNo ?? "",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      confirmation_email_sent: true,
    })
    .eq("id", order.id)
    .eq("confirmation_email_sent", false) // atomic guard: only the first flip sends the email
    .select()
    .maybeSingle();
  await applyStockOnce(order.id as string).catch(() => undefined);
  if (updated) {
    const { data: items } = await admin.from("order_items").select("name, qty, unit_price, line_total").eq("order_id", order.id);
    sendOrderConfirmationEmail(
      updated as unknown as Parameters<typeof sendOrderConfirmationEmail>[0],
      (items ?? []) as Parameters<typeof sendOrderConfirmationEmail>[1],
      "paid",
    ).catch(() => undefined);
  }
  return updated ?? order;
}

/**
 * Called by the ToyyibPay server-to-server callback.
 * The POSTed payload is treated only as a hint: the authoritative payment
 * status is always re-fetched from ToyyibPay via getBillTransactions.
 */
export async function applyCallback(p: {
  refno: string;
  status: string;
  billcode: string;
  order_id: string;
  transaction_id?: string;
}) {
  const admin = getAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, status, bill_code, order_no, payment_method, customer_name, customer_email, currency, subtotal, shipping, tax, discount, coupon_code, total, address1, address2, city, state, postcode")
    .eq("order_no", p.order_id)
    .maybeSingle();
  if (!order) return { ok: false };
  if (order.bill_code && p.billcode && order.bill_code !== p.billcode) return { ok: false };
  if (order.payment_method !== "toyyibpay" || !order.bill_code) return { ok: false };

  // Verify with ToyyibPay directly — never trust the posted status field.
  const cfg = toyyibConfig();
  if (!cfg.secret) return { ok: false };
  let rows: Array<{ billpaymentStatus?: string; billpaymentInvoiceNo?: string }> = [];
  try {
    const res = await fetch(`${cfg.host}/index.php/api/getBillTransactions`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ billCode: order.bill_code, billpaymentStatus: "1" }),
    });
    rows = JSON.parse(await res.text());
  } catch {
    return { ok: false };
  }
  const verifiedPaid = Array.isArray(rows) && rows.find((r) => r.billpaymentStatus === "1");
  if (!verifiedPaid) {
    // Not paid according to the gateway — never downgrade an already-paid order.
    return { ok: true, paid: false };
  }

  const { data: updatedOrder } = await admin
    .from("orders")
    .update({
      payment_status: "paid",
      status: order.status === "new" ? "processing" : order.status,
      transaction_id: verifiedPaid.billpaymentInvoiceNo ?? "",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      confirmation_email_sent: true,
    })
    .eq("id", order.id)
    .eq("confirmation_email_sent", false) // atomic guard: only the first flip sends the email
    .select()
    .maybeSingle();
  if (updatedOrder) {
    const { data: items } = await admin.from("order_items").select("name, qty, unit_price, line_total").eq("order_id", order.id);
    sendOrderConfirmationEmail(
      updatedOrder as unknown as Parameters<typeof sendOrderConfirmationEmail>[0],
      (items ?? []) as Parameters<typeof sendOrderConfirmationEmail>[1],
      "paid",
    ).catch(() => undefined);
  }
  await applyStockOnce(order.id as string).catch(() => undefined);
  return { ok: true, paid: true };
}


export async function loadOrder(orderNo: string, opts: { token?: string; email?: string }) {
  const admin = getAdminClient();
  await syncBillStatus(orderNo).catch(() => undefined);
  const { data: order } = await admin.from("orders").select("*").eq("order_no", orderNo).maybeSingle();
  if (!order) throw new Error("Order not found.");
  const okToken = opts.token && String(order.access_token) === opts.token;
  const okEmail =
    opts.email && String(order.customer_email).toLowerCase() === opts.email.toLowerCase().trim();
  if (!okToken && !okEmail) throw new Error("Order not found. Check the order number and email.");
  const { data: items } = await admin.from("order_items").select("*").eq("order_id", order.id);
  // admin_note is for internal staff eyes only — never send it to a customer,
  // even though the rest of the row is safe to show them.
  const { admin_note: _adminNote, ...safeOrder } = order as Record<string, unknown>;
  return { order: safeOrder, items: items ?? [] };
}

export async function listOrders() {
  const admin = getAdminClient();
  const { data: orders } = await admin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  const ids = (orders ?? []).map((o) => o.id);
  const { data: items } = ids.length
    ? await admin.from("order_items").select("*").in("order_id", ids)
    : { data: [] as unknown[] };
  return { orders: orders ?? [], items: (items ?? []) as Record<string, unknown>[] };
}

/** A logged-in customer's own order history — never another customer's. */
export async function listMyOrders(accessToken: string) {
  const admin = getAdminClient();
  const { data: authData, error: authErr } = await admin.auth.getUser(accessToken);
  if (authErr || !authData?.user) throw new Error("Please sign in to view your orders.");
  const { data: orders, error } = await admin
    .from("orders")
    .select("*")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  // Same reasoning as loadOrder(): admin_note is internal-only.
  return { orders: (orders ?? []).map(({ admin_note: _n, ...o }) => o) };
}

export type OrderPatch = {
  status?: string;
  payment_status?: string; // pending | paid | failed | refunded
  courier?: string;
  tracking_number?: string;
  tracking_url?: string;
  delivery_note?: string;
  admin_note?: string;
};

export async function setOrderStatus(id: string, patch: OrderPatch) {
  const admin = getAdminClient();
  const now = new Date().toISOString();
  const isRestockingEvent =
    patch.status === "cancelled" || patch.payment_status === "failed" || patch.payment_status === "refunded";

  // If we're about to restock, do it BEFORE the status update using the
  // pre-update stock_applied flag, so we never restock the same order twice.
  if (isRestockingEvent) {
    const { data: order } = await admin
      .from("orders")
      .select("id, stock_applied, coupon_code")
      .eq("id", id)
      .maybeSingle();
    if (order?.stock_applied) {
      const { data: items } = await admin.from("order_items").select("slug, qty").eq("order_id", id);
      for (const it of items ?? []) {
        await safeRpc(admin, "restore_stock", { p_slug: it.slug, p_qty: it.qty });
      }
      (patch as Record<string, unknown>).stock_applied = false;
    }
    if (order?.coupon_code) {
      await releaseCouponIfAny(admin, order.coupon_code);
    }
  }

  const update: Record<string, unknown> = { ...patch, updated_at: now };
  if (patch.status === "shipped") update.shipped_at = now;
  if (patch.status === "delivered" || patch.status === "completed") update.delivered_at = now;
  if (patch.payment_status === "paid") update.paid_at = now;
  const { data: updatedOrder, error } = await admin.from("orders").update(update).eq("id", id).select().maybeSingle();
  if (error) throw new Error(error.message);
  // Stock is now deducted at order-creation time, so this is only a safety
  // net for legacy orders created before that change (stock_applied=false).
  if (patch.payment_status === "paid" || patch.status === "processing") await applyStockOnce(id);

  // Notify the customer when the order ships or is delivered/completed —
  // previously the only notification was a manual WhatsApp message the
  // admin had to remember to send from the Deliveries panel.
  if (
    (patch.status === "shipped" || patch.status === "delivered" || patch.status === "completed") &&
    updatedOrder?.customer_email
  ) {
    sendOrderStatusEmail(
      {
        order_no: updatedOrder.order_no as string,
        customer_name: updatedOrder.customer_name as string,
        customer_email: updatedOrder.customer_email as string,
        courier: updatedOrder.courier as string | null,
        tracking_number: updatedOrder.tracking_number as string | null,
        tracking_url: updatedOrder.tracking_url as string | null,
        delivery_note: updatedOrder.delivery_note as string | null,
      },
      patch.status,
    ).catch(() => undefined);
  }

  return { ok: true };
}

/** Decrement product stock exactly once per order. */
export async function applyStockOnce(orderId: string) {
  const admin = getAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, stock_applied")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.stock_applied) return;
  const { data: items } = await admin.from("order_items").select("slug, qty").eq("order_id", orderId);
  for (const it of items ?? []) {
    const { data: p } = await admin.from("products").select("id, name, slug, stock").eq("slug", it.slug).maybeSingle();
    if (!p) continue;
    const prevStock = Number(p.stock) || 0;
    const next = Math.max(0, prevStock - (Number(it.qty) || 0));
    await admin.from("products").update({ stock: next }).eq("id", p.id);
    // Fire the low-stock alert only on the crossing (prev above threshold,
    // now at/below it) so restocking doesn't retrigger it on every sale.
    if (next <= LOW_STOCK_THRESHOLD && prevStock > LOW_STOCK_THRESHOLD) {
      sendLowStockAlertEmail({ name: p.name as string, slug: p.slug as string, stock: next }).catch(() => undefined);
    }
  }
  await admin.from("orders").update({ stock_applied: true }).eq("id", orderId);
}

export async function requireAdminToken(accessToken: string) {
  const admin = getAdminClient();
  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data?.user) throw new Error("Not authenticated");
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) throw new Error("Not authorized — admin role required");
  return true;
}
