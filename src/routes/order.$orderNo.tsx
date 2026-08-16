import { RouteError } from "@/components/RouteError";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, XCircle, Download, Loader2, ShieldCheck, Star, ClipboardList, Truck, PackageCheck } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { getOrder, type OrderRow, type OrderItemRow } from "@/lib/shop.functions";
import { money } from "@/lib/cart";
import { site } from "@/lib/site";
import { usePublicData } from "@/hooks/usePublicData";

export const Route = createFileRoute("/order/$orderNo")({
  validateSearch: (s: Record<string, unknown>) => ({
    t: typeof s.t === "string" ? s.t : undefined,
    email: typeof s.email === "string" ? s.email : undefined,
  }),
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.orderNo} | ${site.name}` },
      { name: "description", content: "Track your Hiplastics Malaysia order status, payment and delivery details." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: `Order ${params.orderNo} — ${site.name}` },
      { property: "og:description", content: "Order status and invoice." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: OrderPage,
});

function OrderPage() {
  const { orderNo } = Route.useParams();
  const { t, email: emailFromSearch } = Route.useSearch();
  const fetchOrder = useServerFn(getOrder);
  const { settings } = usePublicData();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [email, setEmail] = useState(emailFromSearch ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(!!t || !!emailFromSearch);

  async function load(withEmail?: string) {
    setBusy(true); setErr(null);
    const res = await fetchOrder({ data: { orderNo, token: t, email: withEmail } });
    if (res.ok) { setOrder(res.order); setItems(res.items); }
    else setErr(res.error);
    setBusy(false);
  }

  useEffect(() => {
    if (t) load();
    else if (emailFromSearch) load(emailFromSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, emailFromSearch, orderNo]);

  if (!order) {
    return (
      <SiteLayout>
        <section className="section-pad">
          <div className="container-page mx-auto max-w-md">
            <h1 className="text-2xl font-bold text-foreground">Track order {orderNo}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Enter the email used at checkout to view this order.</p>
            <form onSubmit={(e) => { e.preventDefault(); load(email); }} className="mt-5 space-y-3">
              <input required type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm" />
              {err && <p className="text-sm text-destructive">{err}</p>}
              <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} View order
              </button>
            </form>
          </div>
        </section>
      </SiteLayout>
    );
  }

  const paid = order.payment_status === "paid";
  const failed = order.payment_status === "failed";
  const cod = order.payment_method === "cod";
  const cur = order.currency || "MYR";
  const isCancelled = order.status === "cancelled" || order.payment_status === "refunded";
  const stampLabel = isCancelled ? (order.status === "cancelled" ? "Cancelled" : "Refunded") : paid ? "Paid" : null;

  const deliverySteps = [
    { key: "processing", label: "Order confirmed & packing" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
  ] as const;
  // rankOf used to return -1 for any status it didn't recognise (e.g. a
  // status string with different casing), which silently marked every step
  // as "not done" and — combined with the icon issue below — left the
  // circles looking completely blank instead of just muted.
  const rankOf = (s: string) => {
    const i = ["new", "processing", "shipped", "delivered", "completed"].indexOf((s || "").toLowerCase().trim());
    return i === -1 ? 0 : i;
  };
  // Icons were previously looked up indirectly via a `step.icon` component
  // reference stored in the steps array; render them explicitly instead so
  // there's no chance of the reference resolving to nothing in production.
  function StepIcon({ stepKey, className }: { stepKey: (typeof deliverySteps)[number]["key"]; className?: string }) {
    if (stepKey === "processing") return <ClipboardList className={className} />;
    if (stepKey === "shipped") return <Truck className={className} />;
    return <PackageCheck className={className} />;
  }
  const accentColor = settings.invoice_accent_color || "var(--color-primary)";

  return (
    <SiteLayout>
      <section className="section-pad bg-surface">
        <div className="container-page mx-auto max-w-3xl">
          <div className={`flex items-start gap-3 rounded-lg border p-4 print:hidden ${paid || cod ? "border-primary/40 bg-primary/5" : failed ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}>
            {paid ? <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" /> : failed ? <XCircle className="h-6 w-6 shrink-0 text-destructive" /> : <Clock className="h-6 w-6 shrink-0 text-muted-foreground" />}
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {paid ? "Payment successful — order confirmed" : failed ? "Payment failed" : cod ? "Order received (Cash on delivery)" : "Awaiting payment"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Order <strong className="text-foreground">{order.order_no}</strong> · placed {new Date(order.created_at).toLocaleString()}
              </p>
              {failed && <p className="mt-1 text-sm text-destructive">Your order was not confirmed. Please place the order again or contact us.</p>}
            </div>
          </div>

          {order.status === "completed" && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 print:hidden">
              <div className="flex items-center gap-2 text-amber-900">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                <p className="text-sm font-semibold">Order completed! How was it? Your review helps other shoppers.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map((i) => (
                  <Link
                    key={i.id}
                    to="/products/$slug"
                    params={{ slug: i.slug }}
                    hash="reviews"
                    className="inline-flex items-center gap-1.5 rounded-md bg-amber-400 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-300"
                  >
                    <Star className="h-3.5 w-3.5" /> Rate {i.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Printable invoice */}
          <div
            id="invoice"
            style={settings.invoice_accent_color ? ({ "--invoice-accent": settings.invoice_accent_color } as React.CSSProperties) : undefined}
            className="relative mt-6 overflow-hidden rounded-xl border border-border bg-white shadow-sm print:shadow-none"
          >
            {/* Header band */}
            <div className="flex flex-wrap items-start justify-between gap-4 bg-gradient-to-r from-[var(--invoice-accent,var(--color-primary))]/5 to-transparent p-6">
              <div className="flex items-center gap-3">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt={settings.name || site.name} className="h-14 w-14 shrink-0 rounded-lg border border-border/60 bg-white object-contain p-1.5" />
                ) : (
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[var(--invoice-accent,var(--color-primary))] text-2xl font-extrabold text-white">
                    {(settings.name || site.name).slice(0, 1)}
                  </div>
                )}
                <div>
                  <div className="text-xl font-extrabold leading-tight text-[var(--invoice-accent,var(--color-primary))]">{settings.name || site.name}</div>
                  <div className="text-xs text-muted-foreground">{settings.address || site.address}</div>
                  <div className="text-xs text-muted-foreground">{settings.email || site.email} · {settings.phone || site.phone}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold tracking-tight text-foreground">INVOICE</div>
                <div className="mt-1 font-mono text-sm font-semibold text-muted-foreground">{order.order_no}</div>
                <div className="text-xs text-muted-foreground">Date: {new Date(order.created_at).toLocaleDateString()}</div>
              </div>
            </div>

            {stampLabel && (
              <div
                className={`pointer-events-none absolute right-8 top-24 -rotate-12 select-none rounded border-4 px-4 py-1 text-2xl font-extrabold uppercase tracking-widest opacity-25 ${
                  isCancelled ? "border-destructive text-destructive" : "border-[var(--invoice-accent,var(--color-primary))] text-[var(--invoice-accent,var(--color-primary))]"
                }`}
              >
                {stampLabel}
              </div>
            )}

            {/* Status banner */}
            <div className={`mx-6 flex items-center gap-2 rounded-lg border p-3 text-sm font-semibold ${paid || cod ? "border-[var(--invoice-accent,var(--color-primary))]/30 bg-[var(--invoice-accent,var(--color-primary))]/5 text-[var(--invoice-accent,var(--color-primary))]" : "border-border bg-secondary text-muted-foreground"}`}>
              {paid || cod ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Clock className="h-4 w-4 shrink-0" />}
              {paid ? "Payment Successful — Order Confirmed" : cod ? "Order Confirmed — Cash on Delivery" : `Payment ${order.payment_status}`}
            </div>

            {/* Delivery timeline */}
            {(order.courier || order.tracking_number || ["processing", "shipped", "delivered", "completed"].includes(order.status)) && (
              <div className="mx-6 mt-4 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between text-xs">
                  {deliverySteps.map((step, idx) => {
                    const done = rankOf(order.status) >= rankOf(step.key) || order.status === "completed";
                    const lineFilled = done && rankOf(order.status) > rankOf(step.key);
                    return (
                      <div key={step.key} className="flex flex-1 items-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2"
                            style={
                              done
                                ? { borderColor: accentColor, backgroundColor: accentColor, color: "#fff" }
                                : { borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }
                            }
                          >
                            <StepIcon stepKey={step.key} className="h-4 w-4" />
                          </div>
                          <span className={done ? "font-semibold text-foreground" : "text-muted-foreground"}>{step.label}</span>
                        </div>
                        {idx < deliverySteps.length - 1 && (
                          <div
                            className="mx-2 mt-[-18px] h-0.5 flex-1"
                            style={lineFilled ? { backgroundColor: accentColor } : { borderTop: "2px dashed var(--color-border)" }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                {(order.courier || order.tracking_number) && (
                  <p className="mt-4 text-sm text-foreground">
                    {order.courier} {order.tracking_number && <>· Tracking <strong>{order.tracking_number}</strong></>}
                    {order.tracking_url && (
                      <>
                        {" "}·{" "}
                        <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--invoice-accent,var(--color-primary))] underline">
                          Track parcel
                        </a>
                      </>
                    )}
                  </p>
                )}
                {order.delivery_note && <p className="mt-1 text-xs text-muted-foreground">{order.delivery_note}</p>}
              </div>
            )}

            <div className="p-6">
              <div className="grid gap-4 border-b border-border pb-4 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-[var(--invoice-accent,var(--color-primary))]">From (Seller)</div>
                  <div className="mt-1 font-semibold text-foreground">{settings.name || site.name}</div>
                  <div className="text-muted-foreground">{settings.address || site.address}</div>
                  <div className="text-muted-foreground">{settings.email || site.email} · {settings.phone || site.phone}</div>
                </div>
                <div className="sm:text-right">
                  <div className="text-xs font-bold uppercase tracking-wide text-[var(--invoice-accent,var(--color-primary))]">Invoice Details</div>
                  <div className="mt-1 text-muted-foreground">Invoice No. <span className="font-semibold text-foreground">{order.order_no}</span></div>
                  <div className="text-muted-foreground">Payment Status <span className="font-semibold uppercase text-foreground">{order.payment_status}</span></div>
                  <div className="text-muted-foreground">Fulfillment <span className="font-semibold capitalize text-foreground">{order.status}</span></div>
                </div>
              </div>

              <div className="grid gap-4 border-b border-border py-4 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-[var(--invoice-accent,var(--color-primary))]">Bill To</div>
                  <div className="mt-1 font-semibold text-foreground">{order.customer_name}</div>
                  {order.company && <div className="text-muted-foreground">{order.company}</div>}
                  <div className="text-muted-foreground">{order.address1}{order.address2 ? `, ${order.address2}` : ""}</div>
                  <div className="text-muted-foreground">{order.postcode} {order.city}, {order.state}</div>
                  <div className="text-muted-foreground">{order.customer_phone} · {order.customer_email}</div>
                </div>
                <div className="sm:text-right">
                  <div className="text-xs font-bold uppercase tracking-wide text-[var(--invoice-accent,var(--color-primary))]">Payment Method</div>
                  <div className="mt-1 text-foreground">{cod ? "Cash on delivery" : "Online (FPX / DuitNow QR)"}</div>
                  {order.transaction_id && <div className="text-muted-foreground">Ref: {order.transaction_id}</div>}
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--invoice-accent,var(--color-primary))]/10 text-left text-xs font-bold uppercase tracking-wide text-[var(--invoice-accent,var(--color-primary))]">
                    <th className="rounded-l-md py-2 pl-2">Item</th><th className="py-2 text-center">Qty</th><th className="py-2 text-right">Unit Price</th><th className="rounded-r-md py-2 pr-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-b border-border">
                      <td className="py-2.5 pl-2 text-foreground">{i.name}</td>
                      <td className="py-2.5 text-center">{i.qty}</td>
                      <td className="py-2.5 text-right">{money(i.unit_price, cur)}</td>
                      <td className="py-2.5 pr-2 text-right font-semibold">{money(i.line_total, cur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <dl className="ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{money(order.subtotal, cur)}</dd></div>
                {Number((order as unknown as { discount?: number }).discount ?? 0) > 0 && (
                  <div className="flex justify-between text-[var(--invoice-accent,var(--color-primary))]">
                    <dt>
                      Discount
                      {(order as unknown as { coupon_code?: string }).coupon_code ? ` (${(order as unknown as { coupon_code?: string }).coupon_code})` : ""}
                    </dt>
                    <dd>−{money((order as unknown as { discount?: number }).discount ?? 0, cur)}</dd>
                  </div>
                )}
                <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>{money(order.shipping, cur)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">SST</dt><dd>{money(order.tax, cur)}</dd></div>
                <div className="flex justify-between border-t-2 border-[var(--invoice-accent,var(--color-primary))]/20 pt-2 text-base font-extrabold"><dt>Total</dt><dd className="text-[var(--invoice-accent,var(--color-primary))]">{money(order.total, cur)}</dd></div>
              </dl>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-6 py-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--invoice-accent,var(--color-primary))]" />
                <span>{settings.invoice_footer_note || "Thank you for your purchase! If you have any questions, feel free to contact us."}</span>
              </div>
              <span className="italic text-[var(--invoice-accent,var(--color-primary))]">Best regards, {settings.invoice_signature_name || `${site.name} Team`}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 print:hidden">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              <Download className="h-4 w-4" /> Download invoice (PDF)
            </button>
            <Link to="/products" className="inline-flex items-center rounded-md border border-border px-4 py-2.5 text-sm font-semibold">Continue shopping</Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground print:hidden">
            Bookmark this page, or look it up anytime at <Link to="/track" className="font-semibold text-primary underline">Track Your Order</Link> using your order number and email.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
