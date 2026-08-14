import { RouteError } from "@/components/RouteError";
import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { ProductCard } from "@/components/ProductCard";
import { site } from "@/lib/site";
import { usePublicData } from "@/hooks/usePublicData";

export const Route = createFileRoute("/products")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  head: () => {
    return {
      meta: [
        { title: `Products — ESL Rails, Shelf & Price Tag Holders | ${site.name}` },
        { name: "description", content: "Browse ESL rails, shelf label holders, price tag holders, display clips and retail signage accessories from Hiplastics Malaysia." },
        { property: "og:title", content: `Products — ${site.name}` },
        { property: "og:description", content: "Complete catalogue of retail display accessories." },
        { property: "og:url", content: "https://hiplastics.my/products" },
      ],
      links: [{ rel: "canonical", href: "https://hiplastics.my/products" }],
    };
  },
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: ProductsPage,
});

function ProductsPage() {
  const { products: dbProducts, categories: dbCategories } = usePublicData();
  const { q } = Route.useSearch();

  // Only products uploaded from the admin panel are shown
  const allMerged = dbProducts.map((p) => {
    const imgs = (Array.isArray(p.image_urls) ? p.image_urls : []).filter(Boolean);
    const first = imgs[0] || p.image_url || "";
    return {
      slug: p.slug,
      name: p.name,
      category: p.category || "Uncategorised",
      description: p.description || "",
      features: Array.isArray(p.features) ? p.features : [],
      image: first,
      images: imgs.length ? imgs : (first ? [first] : []),
      price: Number((p as { price?: number }).price ?? 0),
      purchasable: Boolean((p as { is_purchasable?: boolean }).is_purchasable),
      stock: Math.max(0, Number((p as { stock?: number }).stock ?? 0)),
      sku: (p as { sku?: string }).sku || "",
    };
  });

  // Search filters across name, description, category and SKU.
  const needle = (q ?? "").trim().toLowerCase();
  const merged = needle
    ? allMerged.filter((p) =>
        [p.name, p.description, p.category, p.sku].some((f) => String(f ?? "").toLowerCase().includes(needle)),
      )
    : allMerged;

  // Prefer DB category order; append any extra categories found on products
  const orderedCats = dbCategories.map((c) => c.name);
  const extras = Array.from(new Set(merged.map((p) => p.category))).filter((c) => !orderedCats.includes(c));
  const categories = [...orderedCats.filter((c) => merged.some((p) => p.category === c)), ...extras];


  return (
    <SiteLayout>
      <section className="bg-hero">
        <div className="container-page py-14 lg:py-20">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Catalogue</span>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {needle ? `Search results for "${q}"` : "Retail Display Products"}
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            {needle
              ? `${merged.length} product${merged.length === 1 ? "" : "s"} found.`
              : "Engineered display accessories for supermarkets, pharmacies, and retail chains. Request a quotation for any item below."}
          </p>
        </div>
      </section>

      {needle && merged.length === 0 && (
        <section className="section-pad">
          <div className="container-page text-center text-muted-foreground">
            No products matched "{q}". Try a different search term.
          </div>
        </section>
      )}

      {categories.map((cat) => (
        <section key={cat} className="section-pad even:bg-surface">
          <div className="container-page">
            <div className="mb-8 flex items-end justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{cat}</h2>
              <span className="text-xs text-muted-foreground">
                {merged.filter((p) => p.category === cat).length} products
              </span>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {merged.filter((p) => p.category === cat).map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </div>
        </section>
      ))}
    </SiteLayout>
  );
}
