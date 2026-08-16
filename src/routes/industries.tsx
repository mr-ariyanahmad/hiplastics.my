import { RouteError } from "@/components/RouteError";
import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart, Pill, Store, Cpu, Building2, Network, CheckCircle2, type LucideIcon } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { site, SITE_URL } from "@/lib/site";
import { usePublicData } from "@/hooks/usePublicData";

export const Route = createFileRoute("/industries")({
  head: () => ({
    meta: [
      { title: `Industries — Retail Display Solutions | ${site.name}` },
      { name: "description", content: "ESL rails and retail display accessories for supermarkets, pharmacies, convenience stores and retail chains in Malaysia." },
      { property: "og:title", content: `Industries We Serve — ${site.name}` },
      { property: "og:description", content: "Retail display accessory solutions across Malaysian retail segments." },
      { property: "og:url", content: `${SITE_URL}/industries` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/industries` }],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: IndustriesPage,
});

const ICON: Record<string, LucideIcon> = { ShoppingCart, Pill, Store, Cpu, Building2, Network };

const FALLBACK = [
  { name: "Supermarkets", icon: "ShoppingCart", desc: "ESL rails, shelf label holders and signage for high-traffic supermarket aisles." },
  { name: "Pharmacies", icon: "Pill", desc: "Clean, compliant shelf-edge solutions for regulated pharmacy retail." },
  { name: "Convenience Stores", icon: "Store", desc: "Compact display accessories for high-density convenience layouts." },
  { name: "Electronics Stores", icon: "Cpu", desc: "Premium display rails and signage for electronics retailers." },
  { name: "Department Stores", icon: "Building2", desc: "Coordinated display systems across multi-category layouts." },
  { name: "Retail Chains", icon: "Network", desc: "Rollout-ready accessories for chain-wide deployments." },
];

function IndustriesPage() {
  const { industries: dbIndustries } = usePublicData();
  const items = (dbIndustries.length
    ? dbIndustries.map((i) => ({ name: i.name, icon: i.icon, image: i.image_url || "", desc: "Display solutions tailored for this sector." }))
    : FALLBACK.map((f) => ({ ...f, image: "" })));

  return (
    <SiteLayout>
      <section className="bg-hero">
        <div className="container-page py-14 lg:py-20">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Industries</span>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Trusted across retail sectors
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            From single-store operators to nationwide retail chains, we provide display hardware that scales with your brand.
          </p>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-page grid gap-6 md:grid-cols-2">
          {items.map((it) => {
            const Icon = ICON[it.icon] ?? Store;
            return (
              <article key={it.name} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-card">
                {it.image && (
                  <div className="aspect-[16/9] overflow-hidden bg-white">
                    <img src={it.image} alt={it.name} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="p-7">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-lg bg-cta text-primary-foreground shadow-soft">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">{it.name}</h2>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{it.desc}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-start gap-2 text-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" /> Bulk supply & fast lead times</li>
                    <li className="flex items-start gap-2 text-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" /> ESL-brand agnostic compatibility</li>
                    <li className="flex items-start gap-2 text-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" /> Local technical support</li>
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </SiteLayout>
  );
}

