import { RouteError } from "@/components/RouteError";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Target, Eye, Heart, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { site, SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: `About Us | ${site.name}` },
      { name: "description", content: `${site.name} is a Malaysian supplier of ESL rails, shelf label holders and retail display accessories serving supermarkets, pharmacies and retail chains.` },
      { property: "og:title", content: `About ${site.name}` },
      { property: "og:description", content: "Malaysian supplier of retail display & ESL accessory solutions." },
      { property: "og:url", content: `${SITE_URL}/about` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/about` }],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteLayout>
      <section className="bg-hero">
        <div className="container-page py-14 lg:py-20">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">About us</span>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Display hardware, made for Malaysian retail
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {site.name} supplies ESL rails, shelf label holders, price tag holders
            and retail display accessories to supermarkets, pharmacies, convenience
            stores and retail chains. We combine industrial-grade materials with
            local stocking and dedicated B2B support.
          </p>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-page grid gap-6 md:grid-cols-3">
          {[
            { icon: Target, title: "Our Mission", desc: "Deliver dependable, retail-grade display accessories that help stores communicate clearly with shoppers." },
            { icon: Eye, title: "Our Vision", desc: "Be Malaysia's most trusted partner for ESL accessories and retail display hardware." },
            { icon: Heart, title: "Our Values", desc: "Quality without compromise, fast and honest service, long-term partnerships." },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-border bg-card p-7 shadow-soft">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-primary">
                <c.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{c.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-pad bg-surface">
        <div className="container-page">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">What sets us apart</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: "Quality", v: "Materials engineered for tropical retail conditions." },
              { k: "Compatibility", v: "Works with leading ESL brands and shelf systems." },
              { k: "Scale", v: "From single outlets to nationwide chain rollouts." },
              { k: "Support", v: "Malaysia-based account and technical assistance." },
            ].map((s) => (
              <div key={s.k} className="rounded-xl border border-border bg-background p-5">
                <div className="text-sm font-semibold text-primary">{s.k}</div>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-page rounded-3xl bg-cta p-10 text-primary-foreground sm:p-14">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Planning a retail upgrade or rollout?
          </h2>
          <p className="mt-3 max-w-2xl text-sm opacity-90 sm:text-base">
            Talk to our team about ESL rails, shelf labels and custom display
            accessories tailored to your stores.
          </p>
          <Link
            to="/contact"
            className="mt-7 inline-flex items-center gap-2 rounded-md bg-background px-5 py-3 text-sm font-semibold text-primary shadow-soft transition-transform hover:scale-[1.02]"
          >
            Get in touch <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
