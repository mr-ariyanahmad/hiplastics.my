import { RouteError } from "@/components/RouteError";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { usePublicData } from "@/hooks/usePublicData";
import { site, SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/terms-of-service")({
  head: () => ({
    meta: [
      { title: `Terms of Service | ${site.name}` },
      { name: "description", content: `The terms and conditions that apply when you use ${site.name} and purchase from hiplastics.my.` },
      { property: "og:title", content: `Terms of Service | ${site.name}` },
      { property: "og:description", content: `Terms and conditions for using ${site.name}.` },
      { property: "og:url", content: `${SITE_URL}/terms-of-service` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/terms-of-service` }],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: TermsOfServicePage,
});

function TermsOfServicePage() {
  const { settings } = usePublicData();
  const email = settings.email || site.email;
  const name = settings.name || site.name;
  return (
    <SiteLayout>
      <section className="border-b border-border bg-surface">
        <div className="container-page py-10">
          <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: 14 August 2026</p>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-page mx-auto max-w-2xl space-y-8 text-sm leading-relaxed text-foreground">
          <p className="text-muted-foreground">
            These Terms of Service ("Terms") govern your use of hiplastics.my and any purchase you make from
            {" "}{name}. By using this site or placing an order, you agree to these Terms.
          </p>

          <div>
            <h2 className="text-lg font-bold">1. Who we are</h2>
            <p className="mt-2 text-muted-foreground">
              {name} sells retail display and ESL (electronic shelf label) accessories to businesses and
              individuals in Malaysia, via hiplastics.my.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">2. Accounts</h2>
            <p className="mt-2 text-muted-foreground">
              You need a registered account to place an order. You're responsible for keeping your login
              credentials secure and for all activity under your account. Provide accurate information when
              registering and when checking out.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">3. Orders & pricing</h2>
            <p className="mt-2 text-muted-foreground">
              All prices are listed in Malaysian Ringgit (MYR) and exclude shipping and SST unless stated
              otherwise — both are calculated at checkout. We reserve the right to correct pricing or listing
              errors, and to cancel an order affected by such an error, in which case any payment already made
              will be refunded in full.
            </p>
            <p className="mt-2 text-muted-foreground">
              Placing an order is an offer to buy; a contract is formed only once we accept it (for online
              payments, once payment is confirmed; for COD, once we begin processing your order).
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">4. Payment</h2>
            <p className="mt-2 text-muted-foreground">
              We accept Cash on Delivery (COD) and online payment via FPX / DuitNow QR through our payment
              partner, ToyyibPay. We never store your card or banking credentials — payments are processed
              entirely by the payment gateway.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">5. Shipping & delivery</h2>
            <p className="mt-2 text-muted-foreground">
              Delivery timeframes shown on the site are estimates, not guarantees. Shipping fees vary by
              destination (West Malaysia vs. Sabah/Sarawak/Labuan) and are shown at checkout before you pay.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">6. Returns, refunds & cancellations</h2>
            <p className="mt-2 text-muted-foreground">
              These are covered in full in our{" "}
              <Link to="/refund-policy" className="font-semibold text-primary underline">Refund & Return Policy</Link>, which forms part of these Terms.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">7. Product reviews</h2>
            <p className="mt-2 text-muted-foreground">
              Only customers who have purchased and received a product may leave a review for it. Reviews
              must be honest, relevant, and free of offensive content; we may moderate or remove reviews that
              violate this.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">8. Acceptable use</h2>
            <p className="mt-2 text-muted-foreground">
              You agree not to misuse the site — including attempting to disrupt it, scrape it at scale
              without permission, or use it for any unlawful purpose.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">9. Limitation of liability</h2>
            <p className="mt-2 text-muted-foreground">
              To the extent permitted by Malaysian law, {name} is not liable for indirect or
              consequential losses arising from your use of the site. Nothing in these Terms limits any right
              you have under the Consumer Protection Act 1999 that cannot be excluded.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">10. Changes to these Terms</h2>
            <p className="mt-2 text-muted-foreground">
              We may update these Terms from time to time. The "Last updated" date above reflects the latest
              revision. Continued use of the site after a change means you accept the updated Terms.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">11. Governing law</h2>
            <p className="mt-2 text-muted-foreground">
              These Terms are governed by the laws of Malaysia.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">12. Contact us</h2>
            <p className="mt-2 text-muted-foreground">
              Questions about these Terms? Email{" "}
              <a href={`mailto:${email}`} className="font-semibold text-primary underline">{email}</a>{" "}
              or visit our <Link to="/contact" className="font-semibold text-primary underline">Contact page</Link>.
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
