import { RouteError } from "@/components/RouteError";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Loader2, Package, CheckCircle2, XCircle, Clock, Star } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { RatingStars } from "@/components/RatingStars";
import { useAuth } from "@/lib/auth";
import { myOrders, type OrderRow } from "@/lib/shop.functions";
import { myReviews, updateReview } from "@/lib/reviews.functions";
import { money } from "@/lib/cart";
import { site } from "@/lib/site";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: `My Account | ${site.name}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: AccountPage,
});

const STATUS_LABEL: Record<string, string> = {
  new: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

function StatusBadge({ order }: { order: OrderRow }) {
  if (order.payment_status === "refunded")
    return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"><Clock className="h-3 w-3" /> Refunded</span>;
  if (order.status === "cancelled")
    return <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive"><XCircle className="h-3 w-3" /> Cancelled</span>;
  if (order.payment_status === "failed")
    return <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive"><XCircle className="h-3 w-3" /> Payment failed</span>;
  if (order.status === "delivered" || order.status === "completed")
    return <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><CheckCircle2 className="h-3 w-3" /> {STATUS_LABEL[order.status]}</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground"><Package className="h-3 w-3" /> {STATUS_LABEL[order.status] || order.status}</span>;
}

function AccountPage() {
  const { user, session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const fetchMyOrders = useServerFn(myOrders);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"orders" | "reviews">("orders");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { redirect: "/account" } });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!session?.access_token) return;
    fetchMyOrders({ data: { access_token: session.access_token } }).then((r) => {
      if (r.ok) setOrders(r.orders);
      else setErr(r.error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  if (loading || !user) {
    return (
      <SiteLayout>
        <section className="section-pad flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="border-b border-border bg-surface">
        <div className="container-page py-8">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">My Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-page mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-md border border-border p-1">
              <button
                type="button"
                onClick={() => setTab("orders")}
                className={`rounded px-4 py-1.5 text-sm font-semibold transition-colors ${tab === "orders" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                My Orders
              </button>
              <button
                type="button"
                onClick={() => setTab("reviews")}
                className={`rounded px-4 py-1.5 text-sm font-semibold transition-colors ${tab === "reviews" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                My Reviews
              </button>
            </div>
            <button
              onClick={async () => { await signOut(); navigate({ to: "/" }); }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>

          {tab === "orders" && (
            <>
              {err && <p className="mt-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{err}</p>}

              {orders === null && !err && (
                <div className="mt-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              )}

              {orders && orders.length === 0 && (
                <div className="mt-8 rounded-lg border border-border bg-card p-8 text-center">
                  <p className="text-sm text-muted-foreground">You haven't placed any orders yet.</p>
                  <Link to="/products" className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Browse products</Link>
                </div>
              )}

              {orders && orders.length > 0 && (
                <div className="mt-5 space-y-3">
                  {orders.map((o) => (
                    <Link
                      key={o.id}
                      to="/order/$orderNo"
                      params={{ orderNo: o.order_no }}
                      search={{ t: o.access_token }}
                      className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-foreground">{o.order_no}</div>
                          <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge order={o} />
                          <div className="font-bold text-foreground">{money(o.total, o.currency)}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "reviews" && <MyReviewsPanel accessToken={session?.access_token} />}
        </div>
      </section>
    </SiteLayout>
  );
}

type MyReview = {
  id: string;
  product_slug: string;
  product_name: string;
  product_image: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
};

function MyReviewsPanel({ accessToken }: { accessToken?: string }) {
  const fetchReviews = useServerFn(myReviews);
  const doUpdate = useServerFn(updateReview);
  const [reviews, setReviews] = useState<MyReview[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!accessToken) return;
    const res = await fetchReviews({ data: { access_token: accessToken } });
    if (res.ok) setReviews(res.reviews);
    else setErr(res.error);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  function startEdit(r: MyReview) {
    setEditingId(r.id);
    setRating(r.rating);
    setComment(r.comment);
  }

  async function saveEdit(id: string) {
    if (!accessToken) return;
    setBusy(true);
    const res = await doUpdate({ data: { id, access_token: accessToken, rating, comment: comment || undefined } });
    setBusy(false);
    if (!res.ok) return setErr(res.error);
    setEditingId(null);
    load();
  }

  if (err) return <p className="mt-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{err}</p>;
  if (reviews === null) return <div className="mt-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  if (reviews.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-border bg-card p-8 text-center">
        <Star className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          You haven't reviewed anything yet — reviews you leave on products will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              {r.product_image && <img src={r.product_image} alt={r.product_name} className="h-12 w-12 rounded-md border border-border object-contain bg-white p-1" />}
              <div>
                <Link to="/products/$slug" params={{ slug: r.product_slug }} className="font-semibold text-foreground hover:text-primary">
                  {r.product_name}
                </Link>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${r.is_approved ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
              {r.is_approved ? "Published" : "Pending approval"}
            </span>
          </div>

          {editingId === r.id ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n === 1 ? "" : "s"}`}>
                    <Star className={`h-6 w-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                maxLength={2000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => saveEdit(r.id)}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="rounded-md border border-border px-4 py-2 text-sm font-semibold">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <RatingStars value={r.rating} size="h-4 w-4" />
              {r.comment && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.comment}</p>}
              <button type="button" onClick={() => startEdit(r)} className="mt-3 text-sm font-semibold text-primary hover:underline">
                Edit review
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
