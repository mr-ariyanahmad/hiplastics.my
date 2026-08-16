import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type OrderRow = {
  id: string;
  order_no: string;
  access_token: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  notes: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  payment_method: "cod" | "toyyibpay";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  status: string;
  courier?: string;
  tracking_number?: string;
  tracking_url?: string;
  shipped_at?: string | null;
  delivered_at?: string | null;
  delivery_note?: string;
  admin_note?: string;
  bill_code: string;
  transaction_id: string;
  paid_at: string | null;
  created_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  slug: string;
  name: string;
  image_url: string;
  unit_price: number;
  qty: number;
  line_total: number;
};

const lineSchema = z.object({ slug: z.string().min(1), qty: z.number().int().min(1).max(999) });

export const cartStock = createServerFn({ method: "POST" })
  .inputValidator((d: { lines: { slug: string; qty: number }[] }) =>
    z.object({ lines: z.array(z.object({ slug: z.string(), qty: z.number().int().min(1).max(999) })).max(50) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getCartStockInfo } = await import("./shop.server");
    try {
      const r = await getCartStockInfo(data.lines);
      return { ok: true as const, items: r.items };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed to check stock" };
    }
  });

export const quoteCart = createServerFn({ method: "POST" })
  .inputValidator((d: { items: { slug: string; qty: number }[]; state: string; coupon_code?: string }) =>
    z.object({ items: z.array(lineSchema).max(50), state: z.string().max(60), coupon_code: z.string().max(40).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { priceCart } = await import("./shop.server");
    try {
      const r = await priceCart(data.items, data.state, data.coupon_code);
      return { ok: true as const, ...r };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed to price cart" };
    }
  });

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        items: z.array(lineSchema).min(1).max(50),
        customer_name: z.string().min(2).max(120),
        customer_email: z.string().email().max(160),
        customer_phone: z.string().min(6).max(30),
        company: z.string().max(120).optional(),
        address1: z.string().min(3).max(200),
        address2: z.string().max(200).optional(),
        city: z.string().min(2).max(80),
        state: z.string().min(2).max(60),
        postcode: z.string().min(4).max(10),
        notes: z.string().max(600).optional(),
        payment_method: z.enum(["cod", "toyyibpay"]),
        access_token: z.string().min(10, "You must be signed in to place an order."),
        coupon_code: z.string().max(40).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { createOrder } = await import("./shop.server");
    try {
      const r = await createOrder(data);
      return { ok: true as const, ...r };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Could not place order" };
    }
  });

export const checkCoupon = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; subtotal: number }) =>
    z.object({ code: z.string().min(1).max(40), subtotal: z.number().min(0) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getAdminClient } = await import("@/integrations/hiplastics/admin.server");
    const admin = getAdminClient();
    const { data: row, error } = await admin.rpc("check_coupon", { p_code: data.code, p_subtotal: data.subtotal });
    if (error) return { ok: false as const, error: error.message };
    const r = Array.isArray(row) ? row[0] : row;
    if (!r?.ok) return { ok: false as const, error: r?.message || "Invalid coupon code." };
    return { ok: true as const, discount: Number(r.discount) || 0 };
  });

export const myOrders = createServerFn({ method: "POST" })
  .inputValidator((d: { access_token: string }) =>
    z.object({ access_token: z.string().min(10) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { listMyOrders } = await import("./shop.server");
    try {
      const r = await listMyOrders(data.access_token);
      return { ok: true as const, orders: r.orders as unknown as OrderRow[] };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Could not load your orders" };
    }
  });

export const getOrder = createServerFn({ method: "POST" })
  .inputValidator((d: { orderNo: string; token?: string; email?: string }) =>
    z
      .object({
        orderNo: z.string().min(4).max(40),
        token: z.string().max(60).optional(),
        email: z.string().max(160).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { loadOrder } = await import("./shop.server");
    try {
      const r = await loadOrder(data.orderNo, { token: data.token, email: data.email });
      return { ok: true as const, order: r.order as unknown as OrderRow, items: r.items as unknown as OrderItemRow[] };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Order not found" };
    }
  });

export const adminListOrders = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdminToken, listOrders } = await import("./shop.server");
    await requireAdminToken(data.token);
    const r = await listOrders();
    return { orders: r.orders as unknown as OrderRow[], items: r.items as unknown as OrderItemRow[] };
  });

/** Public: "Notify me when back in stock" — shown on out-of-stock products. */
export const requestStockNotify = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; email: string }) =>
    z.object({ slug: z.string().min(1).max(200), email: z.string().email().max(160) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getAdminClient } = await import("@/integrations/hiplastics/admin.server");
    const admin = getAdminClient();
    try {
      const { error } = await admin
        .from("stock_notify_requests")
        .upsert(
          { product_slug: data.slug, email: data.email.toLowerCase().trim(), notified_at: null },
          { onConflict: "product_slug,email", ignoreDuplicates: false },
        );
      if (error) throw new Error(error.message);
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Could not save your request" };
    }
  });

/**
 * Debounced cart snapshot save, called from CartSnapshotSync while a
 * signed-in customer has items in their cart. Powers the abandoned-cart
 * reminder cron (routes/api/public/cart-reminder-cron.ts).
 */
export const saveCartSnapshot = createServerFn({ method: "POST" })
  .inputValidator((d: { access_token: string; items: { slug: string; name: string; qty: number }[] }) =>
    z
      .object({
        access_token: z.string().min(10),
        items: z.array(z.object({ slug: z.string(), name: z.string(), qty: z.number().int().min(1) })).max(50),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { getAdminClient } = await import("@/integrations/hiplastics/admin.server");
    const admin = getAdminClient();
    const { data: authData, error: authErr } = await admin.auth.getUser(data.access_token);
    if (authErr || !authData?.user) return { ok: false as const };
    if (!data.items.length) {
      // Cart emptied (checked out or cleared) — nothing to remind about.
      await admin.from("cart_snapshots").delete().eq("user_id", authData.user.id);
      return { ok: true as const };
    }
    await admin.from("cart_snapshots").upsert(
      {
        user_id: authData.user.id,
        customer_email: authData.user.email ?? "",
        customer_name: (authData.user.user_metadata?.full_name as string) || "",
        items: data.items,
        reminder_sent_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    return { ok: true as const };
  });

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) =>
    z
      .object({
        token: z.string().min(10),
        id: z.string().uuid(),
        status: z.enum(["new", "processing", "shipped", "delivered", "completed", "cancelled"]).optional(),
        payment_status: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
        courier: z.string().max(80).optional(),
        tracking_number: z.string().max(120).optional(),
        tracking_url: z.string().max(400).optional(),
        delivery_note: z.string().max(600).optional(),
        admin_note: z.string().max(600).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdminToken, setOrderStatus } = await import("./shop.server");
    await requireAdminToken(data.token);
    const { token: _t, id, ...patch } = data;
    void _t;
    return setOrderStatus(id, patch);
  });
