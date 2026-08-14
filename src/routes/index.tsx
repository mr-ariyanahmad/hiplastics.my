import { RouteError } from "@/components/RouteError";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ShieldCheck,
  Wrench,
  Truck,
  Headphones,
  PackageCheck,
  FileDown,
  ShoppingCart,
  Pill,
  Store,
  Cpu,
  Building2,
  Network,
  CheckCircle2,
  Phone,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { SiteLayout } from "@/components/SiteLayout";
import { InquiryForm } from "@/components/InquiryForm";
import { site, waLink, industries, SITE_URL } from "@/lib/site";
import { usePublicData } from "@/hooks/usePublicData";
import gallerySupermarket from "@/assets/gallery-supermarket.jpg";
import galleryPharmacy from "@/assets/gallery-pharmacy.jpg";
import galleryConvenience from "@/assets/gallery-convenience.jpg";
import galleryWarehouse from "@/assets/gallery-warehouse.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hiplastics Malaysia — ESL Rails & Shelf Label Holders" },
      { name: "description", content: "Malaysian supplier of ESL rails, shelf & price tag holders and retail display accessories. Bulk supply for supermarkets, pharmacies and retail chains." },
      { name: "keywords", content: "ESL Rail Malaysia, Shelf Label Holder Malaysia, Price Tag Holder Malaysia, Retail Display Accessories Malaysia" },
      { property: "og:title", content: "Hiplastics Malaysia — ESL Rails & Shelf Label Holders" },
      { property: "og:description", content: "Trusted supplier of ESL rails and retail display accessories in Malaysia." },
      { property: "og:url", content: `${SITE_URL}/` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: HomePage,
});

const iconMap = { ShoppingCart, Pill, Store, Cpu, Building2, Network };

const categories = [
  { name: "ESL Rails", slug: "esl-rails", count: "20+ SKUs", desc: "Mounting rails for electronic shelf labels" },
  { name: "Shelf Label Holders", slug: "shelf-label-holders", count: "40+ SKUs", desc: "Clear holders for paper price labels" },
  { name: "Price Tag Holders", slug: "price-tag-holders", count: "30+ SKUs", desc: "Clip-on tag holders for any rack" },
  { name: "Display Clips", slug: "display-clips", count: "15+ SKUs", desc: "Heavy-duty hanging and signage clips" },
  { name: "Retail Signage", slug: "retail-signage-accessories", count: "25+ SKUs", desc: "Sign holders, hangers, ceiling kits" },
  { name: "Custom / OEM", slug: "custom-display-solutions", count: "Project basis", desc: "Tailor-made tooling and moulds" },
];

const downloads = [
  { title: "Full Product Catalogue 2026", size: "PDF · 4.2 MB" },
  { title: "ESL Rail Specification Sheet", size: "PDF · 820 KB" },
  { title: "Shelf Label Holder Sizes Guide", size: "PDF · 1.1 MB" },
  { title: "Installation & Care Manual", size: "PDF · 950 KB" },
];

function HomePage() {
  const { products: dbProducts, categories: dbCategories } = usePublicData();
  const catalogue = dbProducts.map((p) => {
    const imgs = (Array.isArray(p.image_urls) ? p.image_urls : []).filter(Boolean);
    return {
      slug: p.slug,
      name: p.name,
      category: p.category || "Uncategorised",
      description: p.description || "",
      image: imgs[0] || p.image_url || "",
    };
  });
  const featuredSource = dbProducts.some((p) => p.is_featured)
    ? catalogue.filter((_, i) => dbProducts[i]?.is_featured)
    : catalogue;
  const featured = featuredSource.slice(0, 3);
  const top = catalogue[0];
  const tiles = catalogue.slice(1, 4);

  return (
    <SiteLayout>
      {/* HERO — product-led, dense, B2B catalogue feel */}
      <section className="border-b border-border bg-industrial">
        <div className="container-page py-6 lg:py-10">
          <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
            {/* Primary product tile */}
            <Link
              to="/products"
              className="group relative col-span-1 overflow-hidden rounded-sm border border-border bg-card lg:col-span-7"
            >
              <div className="aspect-[16/10] w-full overflow-hidden bg-surface lg:aspect-[16/9]">
                {top?.image ? (
                  <img
                    src={top.image}
                    alt="ESL rails and retail display accessories — Hiplastics Malaysia"
                    width={1600}
                    height={900}
                    fetchPriority="high"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="h-full w-full bg-industrial" />
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-5 sm:p-7">
                <span className="inline-block rounded-sm bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                  Bestseller
                </span>
                <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
                  ESL Rails · Shelf Label Holders · Retail Display Accessories
                </h1>
                <p className="mt-1.5 max-w-xl text-sm text-white/85">
                  Malaysia stock. Bulk supply to supermarkets, pharmacies & retail chains.
                </p>
              </div>
            </Link>

            {/* Secondary tiles — show categories immediately */}
            <div className="col-span-1 grid grid-cols-2 gap-4 lg:col-span-5 lg:grid-cols-1 lg:gap-5">
              {tiles.map((p) => (
                <Link
                  key={p.slug}
                  to="/products/$slug"
                  params={{ slug: p.slug }}
                  className="group relative overflow-hidden rounded-sm border border-border bg-card"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-surface lg:aspect-[16/9]">
                    {p.image && (
                      <img
                        src={p.image}
                        alt={p.name}
                        width={800}
                        height={600}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 sm:p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-white/80">
                      {p.category}
                    </div>
                    <div className="text-base font-bold text-white sm:text-lg">{p.name}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-border pt-4 text-xs sm:grid-cols-4">
            {[
              { k: "10+ yrs", v: "In retail supply" },
              { k: "500+", v: "Stores supplied" },
              { k: "Malaysia stock", v: "Fast dispatch" },
              { k: "OEM ready", v: "Custom moulding" },
            ].map((s) => (
              <div key={s.v} className="flex items-baseline gap-2">
                <span className="text-base font-bold text-primary">{s.k}</span>
                <span className="text-muted-foreground">{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS — table-of-products feel */}
      <section className="section-pad">
        <div className="container-page">
          <SectionHead
            eyebrow="Featured Products"
            title="Top-selling retail display accessories"
            cta={{ to: "/products", label: "Open full catalogue" }}
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <article
                key={p.slug}
                className="flex overflow-hidden rounded-sm border border-border bg-card transition-shadow hover:shadow-card"
              >
                <div className="aspect-square w-32 shrink-0 overflow-hidden bg-surface sm:w-36">
                  <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between p-3.5">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                      {p.category}
                    </div>
                    <h3 className="mt-1 text-sm font-bold leading-tight text-foreground">{p.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                  </div>
                  <a
                    href={waLink(`Hi, please quote: ${p.name}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex w-fit items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Request quote <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT CATEGORIES */}
      <section className="section-pad border-y border-border bg-surface">
        <div className="container-page">
          <SectionHead
            eyebrow="Product Categories"
            title="Browse our catalogue by category"
            cta={{ to: "/products", label: "View all categories" }}
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(dbCategories.length
              ? dbCategories.map((c) => ({ name: c.name, slug: c.slug, desc: c.description || "", count: "", image: c.image_url || "" }))
              : categories.map((c) => ({ ...c, image: "" }))
            ).map((c) => {
              const prod = catalogue.find((p) => p.category === c.name) ?? catalogue.find((p) => p.slug === c.slug);
              const img = c.image || prod?.image || "";

              return (
                <Link
                  key={c.slug}
                  to="/products"
                  className="group flex items-center gap-4 rounded-sm border border-border bg-card p-3 transition-colors hover:border-primary"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-sm border border-border bg-surface">
                    {img && (
                      <img src={img} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.desc}</div>
                  </div>
                  <div className="hidden text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:block">
                    {c.count}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHY BUSINESSES CHOOSE US */}
      <section className="section-pad">
        <div className="container-page grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              Company Profile
            </span>
            <h2 className="mt-2 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              Why businesses choose {site.name}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We supply ESL rails and retail display accessories to chain
              supermarkets, pharmacies and convenience stores nationwide.
              Procurement teams choose us for consistent stock, ESL-brand
              agnostic compatibility, and after-sales support based locally
              in Malaysia.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                "ESL-brand agnostic — works with leading hardware",
                "Engineered plastics for tropical retail use",
                "Local Malaysia stock with fast lead times",
                "OEM and custom-mould services available",
                "Volume pricing for chain rollouts",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {p}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/about"
                className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary"
              >
                Company profile <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={`tel:${site.phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow"
              >
                <Phone className="h-4 w-4" /> {site.phone}
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:col-span-7 lg:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Durable Materials", desc: "Engineered plastics for daily retail wear." },
              { icon: PackageCheck, title: "Stock Availability", desc: "Standard SKUs held locally in Malaysia." },
              { icon: Wrench, title: "Easy Installation", desc: "Snap-fit and adhesive systems for fast rollout." },
              { icon: Truck, title: "Bulk Order Support", desc: "Volume pricing and reliable lead times." },
              { icon: Headphones, title: "Local Support", desc: "Malaysia-based technical and after-sales team." },
              { icon: PackageCheck, title: "Quality Control", desc: "Batch checks before every dispatch." },
            ].map((f) => (
              <div key={f.title} className="rounded-sm border border-border bg-card p-4">
                <div className="grid h-9 w-9 place-items-center rounded-sm bg-accent text-primary">
                  <f.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-foreground">{f.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INDUSTRIES SERVED */}
      <section className="section-pad border-y border-border bg-surface">
        <div className="container-page">
          <SectionHead
            eyebrow="Industries Served"
            title="Trusted across Malaysia's retail sectors"
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {industries.map((ind) => {
              const Icon = iconMap[ind.icon];
              return (
                <div
                  key={ind.name}
                  className="flex items-center gap-3 rounded-sm border border-border bg-card p-3.5"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-sm bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{ind.name}</div>
                    <div className="text-xs text-muted-foreground">Display solutions on call</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PROJECT GALLERY */}
      <section className="section-pad">
        <div className="container-page">
          <SectionHead
            eyebrow="Project Gallery"
            title="Installations across Malaysia"
          />
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { src: gallerySupermarket, label: "Supermarket Chain" },
              { src: galleryPharmacy, label: "Pharmacy Group" },
              { src: galleryConvenience, label: "Convenience Stores" },
              { src: galleryWarehouse, label: "Bulk Warehouse Supply" },
            ].map((g) => (
              <figure key={g.label} className="group relative overflow-hidden rounded-sm border border-border bg-card">
                <img
                  src={g.src}
                  alt={g.label}
                  width={1280}
                  height={960}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 text-xs font-semibold text-white">
                  {g.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT DOWNLOADS */}
      <section className="section-pad border-y border-border bg-surface">
        <div className="container-page">
          <SectionHead
            eyebrow="Product Downloads"
            title="Catalogues, datasheets & installation guides"
          />
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {downloads.map((d) => (
              <a
                key={d.title}
                href={waLink(`Hi, please send me the ${d.title}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-sm border border-border bg-card p-3.5 transition-colors hover:border-primary"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-accent text-primary">
                  <FileDown className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-foreground">{d.title}</div>
                  <div className="text-xs text-muted-foreground">{d.size}</div>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Request
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* REQUEST QUOTATION */}
      <section id="inquiry" className="section-pad">
        <div className="container-page grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              Request Quotation
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Send your enquiry — quoted within 24 hours
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Procurement teams: share quantities, store count and ESL brand (if any).
              Our team will respond on WhatsApp with pricing, lead time and samples
              where available.
            </p>
            <div className="mt-5 space-y-2 rounded-sm border border-border bg-card p-4 text-sm">
              <a
                href={waLink("Hi, I'd like to request a quotation.")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-semibold text-foreground hover:text-primary"
              >
                <WhatsAppIcon className="h-4 w-4 text-whatsapp" />
                WhatsApp: {site.whatsappDisplay}
              </a>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="hover:text-primary">{site.phone}</a>
              </div>
              <div className="text-muted-foreground">
                Email: <a href={`mailto:${site.email}`} className="text-foreground hover:text-primary">{site.email}</a>
              </div>
            </div>
          </div>
          <div className="rounded-sm border border-border bg-card p-5 shadow-soft lg:col-span-7 sm:p-6">
            <InquiryForm />
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function SectionHead({
  eyebrow,
  title,
  cta,
}: {
  eyebrow: string;
  title: string;
  cta?: { to: string; label: string };
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-2 border-b border-border pb-3 sm:flex-row sm:items-end">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          {eyebrow}
        </span>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
      </div>
      {cta && (
        <Link
          to={cta.to}
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-primary hover:underline"
        >
          {cta.label} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
