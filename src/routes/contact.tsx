import { RouteError } from "@/components/RouteError";
import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Mail, Phone, MapPin, Clock } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { InquiryForm } from "@/components/InquiryForm";
import { site, SITE_URL } from "@/lib/site";
import { usePublicData, waLinkFor, splitEmails } from "@/hooks/usePublicData";


export const Route = createFileRoute("/contact")({
  head: () => {
    const localBusiness = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: site.name,
      email: site.email,
      telephone: site.phone,
      url: `${SITE_URL}/contact`,
      address: {
        "@type": "PostalAddress",
        streetAddress: site.address,
        addressLocality: "Kuala Lumpur",
        addressCountry: "MY",
      },
      openingHours: "Mo-Fr 09:00-18:00",
    };
    return {
      meta: [
        { title: `Contact ${site.name} — Request a Quotation` },
        { name: "description", content: `Contact ${site.name} for ESL rails, shelf label holders and retail display accessories. WhatsApp, email or phone enquiries welcome.` },
        { property: "og:title", content: `Contact ${site.name}` },
        { property: "og:description", content: "Get a quotation for ESL rails and retail display accessories." },
        { property: "og:url", content: `${SITE_URL}/contact` },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/contact` }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(localBusiness) }],
    };
  },
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: ContactPage,
});

function ContactPage() {
  const { settings } = usePublicData();
  const phoneDigits = (settings.phone || "").replace(/\D/g, "");

  return (
    <SiteLayout>
      <section className="bg-hero">
        <div className="container-page py-14 lg:py-20">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Contact</span>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Get a quotation</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            {settings.contact_html || "Send your enquiry and our team will reply via WhatsApp with pricing and lead time."}
          </p>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-page grid gap-10 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <a href={waLinkFor(settings.whatsapp_number || settings.phone, "Hi, I'd like to enquire.")} target="_blank" rel="noopener noreferrer"
               className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-soft hover:shadow-card">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-whatsapp text-whatsapp-foreground"><MessageCircle className="h-5 w-5" /></div>
              <div><div className="text-sm font-semibold text-foreground">WhatsApp</div><div className="text-sm text-muted-foreground">{settings.whatsapp_display || settings.phone}</div></div>
            </a>
            {splitEmails(settings.email).map((em) => (
              <a key={em} href={`mailto:${em}`} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-soft hover:shadow-card">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-primary"><Mail className="h-5 w-5" /></div>
                <div><div className="text-sm font-semibold text-foreground">Email</div><div className="text-sm text-muted-foreground break-all">{em}</div></div>
              </a>
            ))}

            <a href={`tel:${phoneDigits}`} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-soft hover:shadow-card">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-primary"><Phone className="h-5 w-5" /></div>
              <div><div className="text-sm font-semibold text-foreground">Phone</div><div className="text-sm text-muted-foreground">{settings.phone}</div></div>
            </a>
            <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-soft">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-primary"><MapPin className="h-5 w-5" /></div>
              <div><div className="text-sm font-semibold text-foreground">Location</div><div className="text-sm text-muted-foreground">{settings.address}</div></div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-soft">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-primary"><Clock className="h-5 w-5" /></div>
              <div><div className="text-sm font-semibold text-foreground">Business Hours</div><div className="text-sm text-muted-foreground">{settings.business_hours}</div></div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card lg:col-span-3 sm:p-8">
            <h2 className="text-xl font-semibold text-foreground">Inquiry form</h2>
            <p className="mt-1 text-sm text-muted-foreground">Fill in your details and we'll respond on WhatsApp.</p>
            <div className="mt-6"><InquiryForm /></div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
