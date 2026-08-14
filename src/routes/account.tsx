import { RouteError } from "@/components/RouteError";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Loader2, Package, CheckCircle2, XCircle, Clock } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth";
import { myOrders, type OrderRow } from "@/lib/shop.functions";
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
            <h2 className="text-lg font-bold text-foreground">My Orders</h2>
            <button
              onClick={async () => { await signOut(); navigate({ to: "/" }); }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>

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
        </div>
      </section>
    </SiteLayout>
  );
}
