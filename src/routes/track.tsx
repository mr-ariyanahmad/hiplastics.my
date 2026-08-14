import { RouteError } from "@/components/RouteError";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PackageSearch, Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth";
import { getOrder } from "@/lib/shop.functions";
import { site } from "@/lib/site";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: `Track Your Order | ${site.name}` },
      { name: "description", content: "Track your Hiplastics Malaysia order using your order number and email." },
      { property: "og:title", content: `Track Your Order — ${site.name}` },
      { property: "og:description", content: "Look up your order status, payment and delivery details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: TrackPage,
});

function TrackPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchOrder = useServerFn(getOrder);
  const [orderNo, setOrderNo] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const no = orderNo.trim().toUpperCase();
    const em = email.trim();
    if (!no || !em) return;
    setBusy(true); setErr(null);
    // Validate here so we show the error on this page instead of bouncing
    // the customer to /order/$orderNo and back.
    const res = await fetchOrder({ data: { orderNo: no, email: em } });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    navigate({ to: "/order/$orderNo", params: { orderNo: no }, search: { email: em } });
  }

  return (
    <SiteLayout>
      <section className="border-b border-border bg-surface">
        <div className="container-page py-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
            <PackageSearch className="h-6 w-6 text-primary" /> Track Your Order
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your order number and the email used at checkout.</p>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-page mx-auto max-w-md">
          <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-border bg-card p-5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Order number</label>
              <input
                required
                placeholder="e.g. HP-20260811-AB12CD3456"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Email address</label>
              <input
                required
                type="email"
                placeholder="Email used at checkout"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            {err && <p className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{err}</p>}
            <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Track order
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {user ? (
              <>Signed in? See all your orders in <Link to="/account" className="font-semibold text-primary underline">My Account</Link>.</>
            ) : (
              <>Have an account? <Link to="/login" search={{ redirect: "/account" }} className="font-semibold text-primary underline">Sign in</Link> to see all your orders at once.</>
            )}
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
