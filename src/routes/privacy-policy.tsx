import { RouteError } from "@/components/RouteError";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { site, SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: `Privacy Policy | ${site.name}` },
      { name: "description", content: `How ${site.name} collects, uses and protects your personal data, in line with Malaysia's Personal Data Protection Act 2010 (PDPA).` },
      { property: "og:title", content: `Privacy Policy | ${site.name}` },
      { property: "og:description", content: `How ${site.name} collects, uses and protects your personal data.` },
      { property: "og:url", content: `${SITE_URL}/privacy-policy` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/privacy-policy` }],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <SiteLayout>
      <section className="border-b border-border bg-surface">
        <div className="container-page py-10">
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: 14 August 2026</p>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-page mx-auto max-w-2xl space-y-8 text-sm leading-relaxed text-foreground">
          <div>
            <p className="text-muted-foreground">
              {site.name} ("we", "us", "our") respects your privacy. This policy explains what personal data
              we collect when you use hiplastics.my, why we collect it, and the choices you have. It's written
              to comply with Malaysia's Personal Data Protection Act 2010 (PDPA).
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">1. What we collect</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li><strong className="text-foreground">Account data:</strong> name and email address when you register or sign in (including via Google).</li>
              <li><strong className="text-foreground">Order data:</strong> name, email, phone number, delivery address, and order/payment history when you place an order.</li>
              <li><strong className="text-foreground">Communications:</strong> anything you send us via the contact form, inquiry form, or WhatsApp.</li>
              <li><strong className="text-foreground">Usage data:</strong> pages visited and general device/browser information, collected automatically via cookies and analytics tools (see Section 5).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold">2. How we use your data</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li>To process and deliver your orders, including sharing your name, phone, and address with our courier partners.</li>
              <li>To send order confirmations, shipping updates, and respond to support requests.</li>
              <li>To let you sign in, view your order history, and leave verified product reviews.</li>
              <li>To improve our website and products, and — only with your consent — for analytics and marketing.</li>
              <li>To comply with legal and tax obligations (e.g. record-keeping under Malaysian law).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold">3. Who we share it with</h2>
            <p className="mt-2 text-muted-foreground">
              We don't sell your personal data. We share it only with service providers who help us run the
              business: our courier partners (for delivery), our payment gateway ToyyibPay (for FPX/DuitNow
              payments), our database provider Supabase (for secure storage), and our email provider Resend
              (for order emails) — each only to the extent needed to provide their service to us.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">4. Data retention</h2>
            <p className="mt-2 text-muted-foreground">
              We keep order records for as long as needed for accounting, warranty, and legal purposes. You
              can request deletion of your account data at any time (see Section 7), subject to records we're
              legally required to retain.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">5. Cookies & analytics</h2>
            <p className="mt-2 text-muted-foreground">
              We use essential cookies to keep you signed in and remember your cart. With your consent (via
              the cookie banner shown on your first visit), we may also use analytics cookies to understand
              how the site is used. You can change your cookie choice at any time — see the "Cookie
              preferences" link in the site footer.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">6. Security</h2>
            <p className="mt-2 text-muted-foreground">
              We use industry-standard measures — encrypted connections, access-controlled databases, and
              row-level security — to protect your data. No online system is 100% secure, but we work to keep
              your information safe.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">7. Your rights</h2>
            <p className="mt-2 text-muted-foreground">
              Under the PDPA, you may request access to, correction of, or deletion of your personal data,
              and may withdraw consent for marketing/analytics at any time. To exercise these rights, contact
              us using the details below.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">8. Contact us</h2>
            <p className="mt-2 text-muted-foreground">
              For any privacy questions or requests, email{" "}
              <a href={`mailto:${site.email}`} className="font-semibold text-primary underline">{site.email}</a>{" "}
              or reach us via the <Link to="/contact" className="font-semibold text-primary underline">Contact page</Link>.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            We may update this policy from time to time; the "Last updated" date above will reflect the
            latest revision. Continued use of the site after an update means you accept the revised policy.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
