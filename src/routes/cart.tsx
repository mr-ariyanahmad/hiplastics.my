import { RouteError } from "@/components/RouteError";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShoppingCart, Trash2, ShieldCheck, LogIn, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { useCart, money } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { quoteCart, placeOrder, cartStock } from "@/lib/shop.functions";
import { site } from "@/lib/site";
import codLogo from "@/assets/payment-cod.png";
import duitnowLogo from "@/assets/payment-duitnow.png";
import fpxLogo from "@/assets/payment-fpx.jpg";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: `Cart & Checkout | ${site.name}` },
      { name: "description", content: "Review your cart and check out securely with cash on delivery or online payment (ToyyibPay) in Malaysia." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: `Cart & Checkout — ${site.name}` },
      { property: "og:description", content: "Secure checkout for retail display accessories across Malaysia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: CartPage,
});

const STATES = [
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Perak", "Perlis",
  "Pulau Pinang", "Sabah", "Sarawak", "Selangor", "Terengganu", "Kuala Lumpur", "Labuan", "Putrajaya",
];

type Quote = { subtotal: number; shipping: number; tax: number; discount: number; coupon_code?: string; total: number; settings: { currency: string; sst_percent: number; cod_enabled: boolean; online_payment_enabled: boolean } };

function CartPage() {
  const { items, setQty, remove, clear } = useCart();
  const { user, session, loading: authLoading } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const quote = useServerFn(quoteCart);
  const submit = useServerFn(placeOrder);
  const stockCheck = useServerFn(cartStock);

  const [form, setForm] = useState({
    customer_name: "", customer_email: "", customer_phone: "", company: "",
    address1: "", address2: "", city: "", state: "Selangor", postcode: "", notes: "",
  });
  // FPX and DuitNow QR are shown as two distinct cards, but ToyyibPay's hosted
  // payment page presents both channels together for any bill we create — so
  // both selections submit as payment_method "toyyibpay"; `uiMethod` only
  // drives which card is highlighted.
  const [uiMethod, setUiMethod] = useState<"cod" | "fpx" | "qr">("fpx");
  const method: "cod" | "toyyibpay" = uiMethod === "cod" ? "cod" : "toyyibpay";
  const [q, setQ] = useState<Quote | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stockMap, setStockMap] = useState<Record<string, { name: string; price: number; basePrice: number; stock: number; available: boolean }>>({});
  const [stockNotice, setStockNotice] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  const lines = items.map((i) => ({ slug: i.slug, qty: i.qty }));
  const linesKey = JSON.stringify(lines);

  // Live stock + tiered-price check: catches deleted products and
  // out-of-stock items even if they were fine when added to the cart, and
  // auto-corrects the cart so checkout never fails on a stale line. Runs on
  // qty changes too (not just which slugs are in the cart) so the per-unit
  // price shown updates immediately when a quantity crosses a bulk-pricing
  // threshold, instead of staying stuck at the price it was added at.
  useEffect(() => {
    if (!items.length) { setStockMap({}); return; }
    let cancelled = false;
    stockCheck({ data: { lines: items.map((i) => ({ slug: i.slug, qty: i.qty })) } }).then((r) => {
      if (cancelled || !r.ok) return;
      const map: Record<string, { name: string; price: number; basePrice: number; stock: number; available: boolean }> = {};
      for (const it of r.items) map[it.slug] = it;
      setStockMap(map);

      const notices: string[] = [];
      for (const line of items) {
        const info = map[line.slug];
        if (!info || !info.available) {
          notices.push(`${line.name} is no longer available and was removed from your cart.`);
          remove(line.slug);
        } else if (info.stock <= 0) {
          notices.push(`${line.name} just went out of stock and was removed from your cart.`);
          remove(line.slug);
        } else if (line.qty > info.stock) {
          notices.push(`${line.name} quantity adjusted to ${info.stock} (only that many left in stock).`);
          setQty(line.slug, info.stock);
        }
      }
      setStockNotice(notices.length ? notices.join(" ") : null);
    }).catch(() => {
      // A failed stock check must never silently wipe the cart — just leave
      // items as-is and let the strict server-side check at checkout catch
      // anything genuinely unavailable.
      if (!cancelled) toast.error("Couldn't refresh stock info. Your cart is unchanged — we'll re-check at checkout.");
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey]);

  useEffect(() => {
    let cancelled = false;
    if (!items.length) { setQ(null); return; }
    quote({ data: { items: lines, state: form.state, coupon_code: appliedCoupon ?? undefined } }).then((r) => {
      if (cancelled) return;
      if (r.ok) { setQ(r as unknown as Quote); setErr(null); }
      else {
        setErr(r.error);
        // If the coupon itself became invalid (e.g. expired mid-session), drop it
        // rather than blocking the whole cart on a stale code.
        if (appliedCoupon && r.error.toLowerCase().includes("coupon")) {
          setAppliedCoupon(null);
          setCouponMsg({ type: "error", text: r.error });
        }
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey, form.state, appliedCoupon]);

  // Keep the selected payment method valid as the real settings load in —
  // e.g. if online payment is off, don't leave "fpx" selected with no radio
  // actually checked, and never let a disabled method stay selected.
  useEffect(() => {
    if (!q) return;
    const codOk = q.settings.cod_enabled;
    const onlineOk = q.settings.online_payment_enabled;
    if (uiMethod === "cod" && !codOk) setUiMethod(onlineOk ? "fpx" : "cod");
    else if (uiMethod !== "cod" && !onlineOk) setUiMethod(codOk ? "cod" : uiMethod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.settings.cod_enabled, q?.settings.online_payment_enabled]);

  async function onApplyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponBusy(true);
    setCouponMsg(null);
    try {
      const r = await quote({ data: { items: lines, state: form.state, coupon_code: code } });
      if (!r.ok) { setCouponMsg({ type: "error", text: r.error }); setCouponBusy(false); return; }
      setAppliedCoupon(code.toUpperCase());
      setCouponMsg({ type: "ok", text: `Coupon applied — you saved ${money((r as unknown as Quote).discount, currency)}.` });
    } catch (e) {
      setCouponMsg({ type: "error", text: e instanceof Error ? e.message : "Could not apply coupon" });
    }
    setCouponBusy(false);
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponMsg(null);
  }

  useEffect(() => {
    if (user && !form.customer_email) {
      setForm((f) => ({
        ...f,
        customer_email: user.email ?? "",
        customer_name: (user.user_metadata as { full_name?: string } | undefined)?.full_name ?? f.customer_name,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.access_token) {
      navigate({ to: "/login", search: { redirect: "/cart" } });
      return;
    }
    setBusy(true); setErr(null);
    try {
      const res = await submit({ data: { ...form, items: lines, payment_method: method, access_token: session.access_token, coupon_code: appliedCoupon ?? undefined } });
      if (!res.ok) { setErr(res.error); setBusy(false); return; }
      clear();
      removeCoupon();
      if (res.paymentUrl) {
        // ToyyibPay's hosted page always shows both "Online Banking" and
        // "DuitNow QR" as tabs on the same screen — there's no API option
        // to force it to open straight on the QR tab, so give a heads-up
        // when the person picked QR specifically.
        if (uiMethod === "qr") toast.info("On the next page, tap the \"DuitNow QR\" tab at the top to scan and pay.", { duration: 6000 });
        window.location.href = res.paymentUrl;
        return;
      }
      navigate({ to: "/order/$orderNo", params: { orderNo: res.order_no }, search: { t: res.token } });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not place order");
      setBusy(false);
    }
  }

  const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";
  const currency = q?.settings.currency ?? "MYR";

  return (
    <SiteLayout showContact={false}>
      <section className="border-b border-border bg-surface">
        <div className="container-page py-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
            <ShoppingCart className="h-6 w-6 text-primary" /> {t("cart_title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("cart_subtitle")}</p>
        </div>
      </section>

      {items.length === 0 ? (
        <section className="section-pad">
          <div className="container-page text-center">
            <p className="text-muted-foreground">{t("cart_empty")}</p>
            <Link to="/products" className="mt-5 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
              {t("cart_browse_products")}
            </Link>
          </div>
        </section>
      ) : (
        <section className="section-pad pb-16">
          <div className="container-page grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* Left: items + form */}
            <div className="min-w-0">
              {stockNotice && (
                <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span className="min-w-0">{stockNotice}</span>
                </div>
              )}
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                {items.map((i) => {
                  const stockInfo = stockMap[i.slug];
                  const maxQty = stockInfo ? Math.max(0, stockInfo.stock) : 999;
                  const unitPrice = stockInfo?.price ?? i.price;
                  const onBulkTier = Boolean(stockInfo && stockInfo.basePrice > 0 && stockInfo.price < stockInfo.basePrice);
                  return (
                    <div key={i.slug} className="flex flex-col gap-3 border-b border-border p-4 last:border-b-0 sm:flex-row sm:items-center">
                      {/* Image + name/price — its own row so it can never be
                          squeezed by the fixed-width qty/price controls below. */}
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-white">
                          {i.image && <img src={i.image} alt={i.name} className="h-full w-full object-contain p-1" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-foreground">{i.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {onBulkTier && <span className="mr-1 text-muted-foreground/60 line-through">{money(stockInfo!.basePrice, currency)}</span>}
                            <span className={onBulkTier ? "font-semibold text-primary" : undefined}>{money(unitPrice, currency)}</span> {t("cart_each")}
                          </div>
                          {onBulkTier && (
                            <div className="mt-0.5 text-[11px] font-semibold text-primary">Bulk pricing applied</div>
                          )}
                          {stockInfo && (
                            <div className={`mt-0.5 text-[11px] font-semibold ${stockInfo.stock <= 5 ? "text-amber-600" : "text-muted-foreground"}`}>
                              {stockInfo.stock > 0 ? `${stockInfo.stock} ${t("cart_in_stock")}` : t("cart_out_of_stock")}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Qty stepper + line total + remove — wraps to its own
                          row on narrow screens instead of forcing the card
                          wider than the viewport. */}
                      <div className="flex items-center justify-between gap-2 sm:justify-end sm:gap-4">
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => setQty(i.slug, i.qty - 1)} className="h-8 w-8 shrink-0 rounded-md border border-border">−</button>
                          <input
                            value={i.qty}
                            onChange={(e) => setQty(i.slug, Math.max(0, Math.min(maxQty, parseInt(e.target.value || "0", 10))))}
                            className="h-8 w-12 shrink-0 rounded-md border border-input bg-background text-center text-sm"
                          />
                          <button type="button" disabled={i.qty >= maxQty} onClick={() => setQty(i.slug, i.qty + 1)} className="h-8 w-8 shrink-0 rounded-md border border-border disabled:opacity-40">+</button>
                        </div>
                        <div className="shrink-0 text-right text-sm font-bold text-foreground sm:w-24">{money(unitPrice * i.qty, currency)}</div>
                        <button type="button" onClick={() => remove(i.slug)} aria-label="Remove" className="shrink-0 rounded-md p-2 text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form id="checkout-form" onSubmit={onSubmit} className="mt-8 rounded-lg border border-border bg-card p-5">
                {!authLoading && !user && (
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/40 bg-primary/5 p-4">
                    <p className="text-sm text-foreground">{t("cart_need_signin")}</p>
                    <Link
                      to="/login"
                      search={{ redirect: "/cart" }}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                    >
                      <LogIn className="h-4 w-4" /> {t("nav_signin_register")}
                    </Link>
                  </div>
                )}
                <h2 className="text-lg font-bold text-foreground">{t("cart_delivery_details")}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input required placeholder={t("cart_full_name")} value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className={inputCls} />
                  <input required type="email" placeholder={t("cart_email")} value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className={inputCls} />
                  <div>
                    <input required placeholder={t("cart_phone_placeholder")} value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className={inputCls} />
                    <p className="mt-1 text-[11px] text-muted-foreground">{t("cart_phone_note")}</p>
                  </div>
                  <input placeholder={t("cart_company")} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputCls} />
                  <input required placeholder={t("cart_address1")} value={form.address1} onChange={(e) => setForm({ ...form, address1: e.target.value })} className={`${inputCls} sm:col-span-2`} />
                  <input placeholder={t("cart_address2")} value={form.address2} onChange={(e) => setForm({ ...form, address2: e.target.value })} className={`${inputCls} sm:col-span-2`} />
                  <input required placeholder={t("cart_city")} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
                  <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputCls}>
                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input required placeholder={t("cart_postcode")} value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} className={inputCls} />
                  <textarea placeholder={t("cart_notes")} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputCls} sm:col-span-2`} />
                </div>

                <h2 className="mt-6 text-lg font-bold text-foreground">{t("cart_payment_method")}</h2>
                {!q && !err && (
                  <p className="mt-3 text-sm text-muted-foreground">Loading available payment methods…</p>
                )}
                {err && (
                  <p className="mt-3 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{err}</p>
                )}
                {q && (
                <div className="mt-3 space-y-2">
                  {q.settings.cod_enabled && (
                    <label className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 ${uiMethod === "cod" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <input type="radio" name="pm" checked={uiMethod === "cod"} onChange={() => setUiMethod("cod")} className="shrink-0" />
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-white p-1.5">
                        <img src={codLogo} alt="Cash on Delivery" className="h-full w-full object-contain" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">{t("cart_cod_title")}</span>
                        <span className="block text-xs text-muted-foreground">{t("cart_cod_desc")}</span>
                      </span>
                    </label>
                  )}
                  {q.settings.online_payment_enabled && (
                    <label className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 ${uiMethod === "fpx" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <input type="radio" name="pm" checked={uiMethod === "fpx"} onChange={() => setUiMethod("fpx")} className="shrink-0" />
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-white p-1.5">
                        <img src={fpxLogo} alt="FPX Online Banking" className="h-full w-full object-contain" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">{t("cart_fpx_title")}</span>
                        <span className="block text-xs text-muted-foreground">{t("cart_fpx_desc")}</span>
                      </span>
                    </label>
                  )}
                  {q.settings.online_payment_enabled && (
                    <label className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 ${uiMethod === "qr" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <input type="radio" name="pm" checked={uiMethod === "qr"} onChange={() => setUiMethod("qr")} className="shrink-0" />
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-white p-1.5">
                        <img src={duitnowLogo} alt="DuitNow QR" className="h-full w-full object-contain" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">{t("cart_qr_title")}</span>
                        <span className="block text-xs text-muted-foreground">{t("cart_qr_desc")}</span>
                      </span>
                    </label>
                  )}
                  {!q.settings.cod_enabled && !q.settings.online_payment_enabled && (
                    <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                      No payment method is currently available. Please contact us to place this order.
                    </p>
                  )}
                </div>
                )}
                {(uiMethod === "fpx" || uiMethod === "qr") && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="min-w-0">{t("cart_secure_note")}</span>
                  </p>
                )}
                {err && <p className="mt-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{err}</p>}
              </form>
            </div>

            {/* Right: summary */}
            <aside className="h-fit min-w-0 rounded-lg border border-border bg-card p-5 lg:sticky lg:top-24">
              <h2 className="text-base font-bold text-foreground">{t("cart_order_summary")}</h2>

              <div className="mt-4">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                    <span className="min-w-0 break-all font-semibold text-primary">Coupon: {appliedCoupon}</span>
                    <button type="button" onClick={removeCoupon} className="text-xs font-semibold text-muted-foreground underline hover:text-foreground">{t("cart_coupon_remove")}</button>
                  </div>
                ) : (
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <input
                      placeholder={t("cart_coupon_placeholder")}
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onApplyCoupon(); } }}
                      className={`${inputCls} min-w-0`}
                    />
                    <button
                      type="button"
                      onClick={onApplyCoupon}
                      disabled={couponBusy || !couponInput.trim()}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
                    >
                      {couponBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("cart_apply")}
                    </button>
                  </div>
                )}
                {couponMsg && (
                  <p className={`mt-1.5 text-xs font-medium ${couponMsg.type === "ok" ? "text-primary" : "text-destructive"}`}>{couponMsg.text}</p>
                )}
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">{t("cart_subtotal")}</dt><dd className="font-semibold">{money(q?.subtotal ?? 0, currency)}</dd></div>
                {Boolean(q?.discount) && (
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t("cart_discount")}</dt><dd className="font-semibold text-primary">−{money(q?.discount ?? 0, currency)}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-muted-foreground">{t("cart_shipping")}</dt><dd className="font-semibold">{q && q.shipping === 0 ? t("cart_free") : money(q?.shipping ?? 0, currency)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">SST ({q?.settings.sst_percent ?? 6}%)</dt><dd className="font-semibold">{money(q?.tax ?? 0, currency)}</dd></div>
                <div className="mt-3 flex justify-between border-t border-border pt-3 text-base"><dt className="font-bold">{t("cart_total")}</dt><dd className="font-bold text-primary">{money(q?.total ?? 0, currency)}</dd></div>
              </dl>
              <button form="checkout-form" type="submit" disabled={busy || !q} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {!authLoading && !user ? t("cart_signin_continue") : method === "cod" ? t("cart_place_cod") : t("cart_pay_now")}
              </button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                {t("cart_receive_order_number")}
              </p>
            </aside>
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
