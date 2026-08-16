import { RouteError } from "@/components/RouteError";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { ProductCard } from "@/components/ProductCard";
import { usePublicData } from "@/hooks/usePublicData";
import { useWishlist } from "@/lib/wishlist";
import { site, SITE_URL } from "@/lib/site";
import type { Product } from "@/lib/site";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: `My Wishlist | ${site.name}` },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/wishlist` }],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: WishlistPage,
});

function WishlistPage() {
  const { products: dbProducts } = usePublicData();
  const { slugs } = useWishlist();

  const items: Product[] = dbProducts
    .filter((p) => slugs.includes(p.slug))
    .map((p) => {
      const imgs = (Array.isArray(p.image_urls) ? p.image_urls : []).filter(Boolean);
      return {
        slug: p.slug,
        name: p.name,
        category: p.category || "Uncategorised",
        description: p.description || "",
        features: Array.isArray(p.features) ? p.features : [],
        image: imgs[0] || p.image_url || "",
        images: imgs.length ? imgs : p.image_url ? [p.image_url] : [],
        price: Number(p.price ?? 0),
        purchasable: Boolean(p.is_purchasable),
        stock: Math.max(0, Number((p as { stock?: number }).stock ?? 0)),
        sku: (p as { sku?: string }).sku || "",
        rating_average: p.rating_average,
        rating_count: p.rating_count,
        name_ms: p.name_ms,
        description_ms: p.description_ms,
        features_ms: p.features_ms,
        price_tiers: p.price_tiers,
      };
    });

  return (
    <SiteLayout>
      <section className="border-b border-border bg-surface">
        <div className="container-page py-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
            <Heart className="h-7 w-7 text-destructive" /> My Wishlist
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length > 0 ? `${items.length} saved item${items.length === 1 ? "" : "s"}` : "Products you save will show up here."}
          </p>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-page">
          {items.length === 0 ? (
            <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-8 text-center">
              <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Tap the heart icon on any product to save it here for later.
              </p>
              <Link to="/products" className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Browse products
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
