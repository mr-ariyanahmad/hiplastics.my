import { RouteError } from "@/components/RouteError";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { site, SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: `Refund & Return Policy | ${site.name}` },
      { name: "description", content: `Refund, return and cancellation policy for orders placed with ${site.name}.` },
      { property: "og:title", content: `Refund & Return Policy | ${site.name}` },
      { property: "og:description", content: "How refunds, returns and order cancellations work at " + site.name + "." },
      { property: "og:url", content: `${SITE_URL}/refund-policy` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/refund-policy` }],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return (
    <SiteLayout>
      <section className="border-b border-border bg-surface">
        <div className="container-page py-10">
          <h1 className="text-3xl font-bold text-foreground">Refund & Return Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: 11 August 2026</p>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-page mx-auto max-w-2xl space-y-8 text-sm leading-relaxed text-foreground">
          <div>
            <h2 className="text-lg font-bold">1. Order cancellation</h2>
            <p className="mt-2 text-muted-foreground">
              Cash-on-delivery (COD) orders can be cancelled by the customer any time before the order
              is shipped, from <Link to="/account" className="font-semibold text-primary underline">My Account → My Orders</Link>.
              Once an order has shipped, please contact us instead of cancelling — see the
              Returns section below.
            </p>
            <p className="mt-2 text-muted-foreground">
              Orders paid online (FPX / DuitNow QR) that need to be cancelled before shipping should be
              reported to us via <Link to="/contact" className="font-semibold text-primary underline">Contact Us</Link> so we can process a refund per Section 3.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">2. Returns</h2>
            <p className="mt-2 text-muted-foreground">
              If an item arrives damaged, defective, or different from what you ordered, contact us within
              7 days of delivery with your order number and photos of the item. We'll arrange a replacement
              or refund at no extra cost to you.
            </p>
            <p className="mt-2 text-muted-foreground">
              Change-of-mind returns are accepted within 7 days of delivery for unused items in their
              original packaging. Return shipping costs for change-of-mind returns are borne by the customer.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">3. Refunds</h2>
            <p className="mt-2 text-muted-foreground">
              Once a return or cancellation is approved, refunds for online payments (FPX / DuitNow QR) are
              issued to the original payment method within 7–14 business days, depending on your bank.
              COD orders that were cancelled or returned before any payment was collected require no refund;
              if cash was already collected on delivery, we'll arrange a bank transfer refund instead.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">4. Non-returnable items</h2>
            <p className="mt-2 text-muted-foreground">
              Custom-cut, custom-printed, or made-to-order items cannot be returned for change of mind,
              but are still covered under Section 2 if damaged, defective, or incorrect.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">5. How to start a return or refund</h2>
            <p className="mt-2 text-muted-foreground">
              Contact us with your order number (find it via <Link to="/track" className="font-semibold text-primary underline">Track Your Order</Link>)
              through the details on our <Link to="/contact" className="font-semibold text-primary underline">Contact page</Link>, and we'll guide you through the next steps.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            This policy is provided as a general guide and doesn't limit any rights you have under the
            Malaysian Consumer Protection Act 1999 or other applicable law.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
