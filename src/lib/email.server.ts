/**
 * Order confirmation emails, sent via the Resend HTTP API (plain fetch — no
 * SDK/dependency needed). Configure with:
 *   RESEND_API_KEY     - from resend.com (free tier is plenty for this volume)
 *   ORDER_EMAIL_FROM   - e.g. "Hiplastics Malaysia <orders@hiplastics.my>"
 *                        (must be a domain verified in your Resend account)
 *
 * If RESEND_API_KEY isn't set, sending is silently skipped (logged once) so
 * local/dev environments and deployments that haven't configured it yet don't
 * break checkout — email is a nice-to-have layered on top of the order
 * record, never a requirement for placing an order.
 */

type OrderForEmail = {
  order_no: string;
  customer_name: string;
  customer_email: string;
  payment_method: "cod" | "toyyibpay";
  currency: string;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  coupon_code?: string;
  total: number;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postcode: string;
};

type OrderItemForEmail = { name: string; qty: number; unit_price: number; line_total: number };

function money(n: number, currency: string) {
  return `${currency} ${Number(n || 0).toFixed(2)}`;
}

function trackUrl(orderNo: string) {
  const base = (process.env.APP_BASE_URL || process.env.PUBLIC_SITE_URL || "https://hiplastics.my").replace(/\/+$/, "");
  return `${base}/track`;
}

function buildHtml(order: OrderForEmail, items: OrderItemForEmail[], kind: "cod" | "paid") {
  const rows = items
    .map(
      (i) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(i.name)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${i.qty}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${money(i.unit_price, order.currency)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${money(i.line_total, order.currency)}</td>
      </tr>`,
    )
    .join("");

  const heading =
    kind === "cod"
      ? "Order received — cash on delivery"
      : "Payment received — your order is confirmed";

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111;">
    <h2 style="margin:0 0 4px;">${heading}</h2>
    <p style="color:#555;margin:0 0 20px;">Order <strong>${escapeHtml(order.order_no)}</strong></p>
    <p>Hi ${escapeHtml(order.customer_name)},</p>
    <p>Thanks for your order! Here's a summary:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
      <thead>
        <tr style="text-align:left;color:#555;font-size:12px;text-transform:uppercase;">
          <th style="padding-bottom:6px;">Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Unit</th><th style="text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <table style="width:100%;margin-top:10px;font-size:14px;">
      <tr><td style="color:#555;">Subtotal</td><td style="text-align:right;">${money(order.subtotal, order.currency)}</td></tr>
      ${order.discount ? `<tr><td style="color:#555;">Discount${order.coupon_code ? ` (${escapeHtml(order.coupon_code)})` : ""}</td><td style="text-align:right;">-${money(order.discount, order.currency)}</td></tr>` : ""}
      <tr><td style="color:#555;">Shipping</td><td style="text-align:right;">${money(order.shipping, order.currency)}</td></tr>
      <tr><td style="color:#555;">SST</td><td style="text-align:right;">${money(order.tax, order.currency)}</td></tr>
      <tr><td style="font-weight:bold;padding-top:6px;">Total</td><td style="text-align:right;font-weight:bold;padding-top:6px;">${money(order.total, order.currency)}</td></tr>
    </table>
    <p style="margin-top:20px;color:#555;">Delivering to:<br>${escapeHtml(order.address1)}${order.address2 ? `, ${escapeHtml(order.address2)}` : ""}<br>${escapeHtml(order.postcode)} ${escapeHtml(order.city)}, ${escapeHtml(order.state)}</p>
    <p style="margin-top:24px;">
      <a href="${trackUrl(order.order_no)}" style="background:#1f8fd1;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;">Track your order</a>
    </p>
    <p style="margin-top:16px;color:#999;font-size:12px;">You'll need your order number (${escapeHtml(order.order_no)}) and this email address to look it up.</p>
  </div>`;
}

function escapeHtml(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function wrap(inner: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111;">${inner}</div>`;
}

function ctaButton(href: string, label: string) {
  return `<p style="margin-top:24px;"><a href="${href}" style="background:#1f8fd1;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;">${escapeHtml(label)}</a></p>`;
}

let warnedOnce = false;

/**
 * Shared low-level sender. Never throws — logs and returns false on
 * failure, so every caller can safely fire-and-forget (`.catch(() =>
 * undefined)`), matching the original order-confirmation behavior.
 */
async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM;
  if (!apiKey || !from) {
    if (!warnedOnce) {
      warnedOnce = true;
      console.warn("[email] RESEND_API_KEY / ORDER_EMAIL_FROM not set — skipping transactional emails.");
    }
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error("[email] Resend API error", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] failed to send", e);
    return false;
  }
}

/** Fire-and-forget order confirmation email. Never throws — logs and returns on failure. */
export async function sendOrderConfirmationEmail(
  order: OrderForEmail,
  items: OrderItemForEmail[],
  kind: "cod" | "paid",
) {
  await sendViaResend(
    order.customer_email,
    kind === "cod"
      ? `Order ${order.order_no} received — Hiplastics Malaysia`
      : `Payment confirmed for order ${order.order_no} — Hiplastics Malaysia`,
    buildHtml(order, items, kind),
  );
}

type OrderStatusForEmail = {
  order_no: string;
  customer_name: string;
  customer_email: string;
  courier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  delivery_note?: string | null;
};

/**
 * Order status update email — sent when an admin marks an order "shipped"
 * or "delivered"/"completed". Previously the only way a customer found out
 * was the admin manually messaging them on WhatsApp; this adds an automatic
 * email alongside that, using the same tracking info already entered in
 * the admin Deliveries panel.
 */
export async function sendOrderStatusEmail(order: OrderStatusForEmail, status: "shipped" | "delivered" | "completed") {
  const isShipped = status === "shipped";
  const heading = isShipped ? "Your order has shipped!" : "Your order has been delivered";
  const trackingBlock =
    isShipped && (order.courier || order.tracking_number)
      ? `<table style="width:100%;margin-top:14px;font-size:14px;border:1px solid #eee;border-radius:8px;">
          <tr><td style="padding:10px 12px;color:#555;">Courier</td><td style="padding:10px 12px;text-align:right;font-weight:bold;">${escapeHtml(order.courier || "—")}</td></tr>
          <tr><td style="padding:10px 12px;color:#555;border-top:1px solid #eee;">Tracking No.</td><td style="padding:10px 12px;text-align:right;font-weight:bold;border-top:1px solid #eee;">${escapeHtml(order.tracking_number || "—")}</td></tr>
        </table>`
      : "";
  const note = order.delivery_note ? `<p style="margin-top:14px;color:#555;">${escapeHtml(order.delivery_note)}</p>` : "";
  const html = wrap(`
    <h2 style="margin:0 0 4px;">${heading}</h2>
    <p style="color:#555;margin:0 0 20px;">Order <strong>${escapeHtml(order.order_no)}</strong></p>
    <p>Hi ${escapeHtml(order.customer_name)},</p>
    <p>${isShipped ? "Your order is on its way." : "Your order has arrived — we hope you love it!"}</p>
    ${trackingBlock}
    ${note}
    ${order.tracking_url ? ctaButton(order.tracking_url, "Track shipment") : ctaButton(trackUrl(order.order_no), "Track your order")}
  `);
  await sendViaResend(order.customer_email, `Order ${order.order_no} ${isShipped ? "shipped" : "delivered"} — Hiplastics Malaysia`, html);
}

/**
 * Low-stock alert, sent to the store owner (not the customer) whenever an
 * order pushes a product's stock at or below a threshold. Configure the
 * recipient with ADMIN_ALERT_EMAIL (falls back to site.email if unset).
 */
export async function sendLowStockAlertEmail(product: { name: string; slug: string; stock: number }) {
  const to = process.env.ADMIN_ALERT_EMAIL || "sales@hiplastics.com.my";
  const html = wrap(`
    <h2 style="margin:0 0 12px;">Low stock alert</h2>
    <p><strong>${escapeHtml(product.name)}</strong> (${escapeHtml(product.slug)}) has only <strong>${product.stock}</strong> unit(s) left.</p>
    <p style="color:#555;">Restock it soon, or it'll go out of stock and stop appearing as purchasable on the site.</p>
  `);
  await sendViaResend(to, `Low stock: ${product.name} (${product.stock} left) — Hiplastics Malaysia`, html);
}

/**
 * Back-in-stock notification, sent to every customer who asked to be
 * notified for a product (see stock_notify_requests table / requestStockNotify
 * server fn) once an admin restocks it above zero.
 */
export async function sendBackInStockEmail(to: string, product: { name: string; slug: string }) {
  const url = `${(process.env.APP_BASE_URL || process.env.PUBLIC_SITE_URL || "https://hiplastics.my").replace(/\/+$/, "")}/products/${product.slug}`;
  const html = wrap(`
    <h2 style="margin:0 0 12px;">Good news — it's back in stock!</h2>
    <p><strong>${escapeHtml(product.name)}</strong> is available again.</p>
    ${ctaButton(url, "View product")}
  `);
  await sendViaResend(to, `${product.name} is back in stock — Hiplastics Malaysia`, html);
}

/**
 * Abandoned cart reminder — sent by the daily cron (see
 * routes/api/public/cart-reminder-cron.ts) to signed-in customers who left
 * items in their cart for a while without checking out.
 */
export async function sendCartReminderEmail(
  to: string,
  name: string,
  items: { name: string; qty: number }[],
) {
  const lines = items.map((i) => `<li>${escapeHtml(i.name)} × ${i.qty}</li>`).join("");
  const url = `${(process.env.APP_BASE_URL || process.env.PUBLIC_SITE_URL || "https://hiplastics.my").replace(/\/+$/, "")}/cart`;
  const html = wrap(`
    <h2 style="margin:0 0 12px;">You left something in your cart</h2>
    <p>Hi ${escapeHtml(name || "there")},</p>
    <p>These items are still waiting for you:</p>
    <ul style="font-size:14px;color:#333;line-height:1.8;">${lines}</ul>
    ${ctaButton(url, "Complete your order")}
  `);
  await sendViaResend(to, "You left something in your cart — Hiplastics Malaysia", html);
}
