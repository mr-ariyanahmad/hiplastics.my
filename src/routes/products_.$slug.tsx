import { RouteError } from "@/components/RouteError";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, ShoppingCart, Zap, PackageX, PackageCheck, Star, Loader2, BellRing, CheckCircle2 } from "lucide-react";
import { useCart, money } from "@/lib/cart";
import { SiteLayout } from "@/components/SiteLayout";
import { ProductCard } from "@/components/ProductCard";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareBar } from "@/components/ShareBar";
import { usePublicData, waLinkFor } from "@/hooks/usePublicData";
import { site, SITE_URL, localizedProduct, tierPriceFor, type PriceTier } from "@/lib/site";
import { fetchAllPublicData, type Product } from "@/lib/cms.functions";
import { getProductReviews, submitReview, canReviewProduct, type PublicReview } from "@/lib/reviews.functions";
import { requestStockNotify } from "@/lib/shop.functions";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/products_/$slug")({
  loader: async ({ params }) => {
    const data = await fetchAllPublicData();
    const product = (data.products ?? []).find((p) => p.slug === params.slug) ?? null;
    return { product };
  },
  head: ({ loaderData, params }) => {
    const product = loaderData?.product as Product | null | undefined;
    const url = `${SITE_URL}/products/${params.slug}`;
    if (!product) {
      return {
        meta: [
          { title: `Product not found | ${site.name}` },
          { name: "robots", content: "noindex" },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const title = `${product.name} — ${site.name}`;
    const description = (product.description || "").slice(0, 160).trim() || `${product.name} — available at ${site.name}.`;
    const imgs = (Array.isArray(product.image_urls) ? product.image_urls : []).filter(Boolean);
    const ogImage = imgs[0] || product.image_url || undefined;
    return {
      meta: [
        { title: `${title} | ${site.name}` },
        { name: "description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        ...(ogImage
          ? [
              { property: "og:image", content: ogImage },
              { property: "og:image:width", content: "1200" },
              { property: "og:image:height", content: "1200" },
            ]
          : []),
        { name: "twitter:card", content: ogImage ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(ogImage ? [{ name: "twitter:image", content: ogImage }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: ProductDetailPage,
});

type Item = {
  slug: string;
  name: string;
  category: string;
  description: string;
  features: string[];
  images: string[];
  price: number;
  purchasable: boolean;
  stock: number;
  sku: string;
  name_ms?: string;
  description_ms?: string;
  features_ms?: string[];
  price_tiers?: PriceTier[];
};

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const { products: dbProducts, settings } = usePublicData();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const { add, setOpen } = useCart();

  const fromDb = dbProducts.find((p) => p.slug === slug);

  let item: Item | null = null;
  if (fromDb) {
    const imgs = (Array.isArray(fromDb.image_urls) ? fromDb.image_urls : []).filter(Boolean);
    const all = imgs.length ? imgs : (fromDb.image_url ? [fromDb.image_url] : []);
    item = {
      slug: fromDb.slug,
      name: fromDb.name,
      category: fromDb.category || "Uncategorised",
      description: fromDb.description || "",
      features: Array.isArray(fromDb.features) ? fromDb.features : [],
      images: all,
      price: Number(fromDb.price ?? 0),
      purchasable: Boolean(fromDb.is_purchasable),
      stock: Math.max(0, Number((fromDb as { stock?: number }).stock ?? 0)),
      sku: (fromDb as { sku?: string }).sku || "",
      name_ms: fromDb.name_ms,
      description_ms: fromDb.description_ms,
      features_ms: fromDb.features_ms,
      price_tiers: Array.isArray(fromDb.price_tiers) ? fromDb.price_tiers : [],
    };
  }

  if (!item) {
    return (
      <SiteLayout>
        <section className="section-pad">
          <div className="container-page text-center">
            <h1 className="text-2xl font-bold text-foreground">Product not found</h1>
            <p className="mt-3 text-muted-foreground">The product you're looking for doesn't exist or was removed.</p>
            <Link to="/products" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              ← Back to all products
            </Link>
          </div>
        </section>
      </SiteLayout>
    );
  }

  const images = item.images.length ? item.images : [""];
  const current = images[active] || "";
  const prev = () => setActive((i) => (i - 1 + images.length) % images.length);
  const next = () => setActive((i) => (i + 1) % images.length);

  // Touch-swipe support for the mobile gallery — previously the only way to
  // change images on a touch device was tapping the tiny arrow buttons or a
  // thumbnail; swiping left/right on the image itself did nothing.
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (images.length <= 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Ignore mostly-vertical swipes (the person is scrolling the page) and
    // require a deliberate horizontal drag before switching images.
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx > 0) prev(); else next();
  }
  const inStock = item.stock > 0;
  const canBuy = item.purchasable && item.price > 0 && inStock;
  const maxQty = Math.min(999, item.stock || 999);
  const sortedTiers = [...(item.price_tiers ?? [])].filter((t) => t.min_qty > 1 && t.price > 0).sort((a, b) => a.min_qty - b.min_qty);
  const hasTiers = sortedTiers.length > 0;
  const effectivePrice = tierPriceFor(item.price, sortedTiers, qty);
  const loc = localizedProduct(item, lang);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.name,
    description: item.description || item.name,
    sku: item.sku || undefined,
    image: images.filter(Boolean),
    category: item.category,
    url: `${SITE_URL}/products/${item.slug}`,
    ...(item.purchasable && item.price > 0
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "MYR",
            price: item.price.toFixed(2),
            availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `${SITE_URL}/products/${item.slug}`,
          },
        }
      : {}),
  };

  const related = dbProducts
    .filter((p) => p.slug !== item!.slug && (p.category || "Uncategorised") === item!.category && p.is_active !== false)
    .slice(0, 4);

  function addToCart() {
    if (!item) return;
    add({ slug: item.slug, name: item.name, price: effectivePrice, image: images[0] || "", stock: item.stock }, qty);
  }

  function buyNow() {
    addToCart();
    navigate({ to: "/cart" });
  }

  return (
    <SiteLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <section className="section-pad">
        <div className="container-page">
          <Link to="/products" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to products
          </Link>

          <div className="grid gap-10 lg:grid-cols-2">
            {/* Gallery */}
            <div>
              <div
                className="relative aspect-square touch-pan-y overflow-hidden rounded-xl border border-border bg-white"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                {current ? (
                  <img src={current} alt={loc.name} draggable={false} className={`h-full w-full select-none object-contain p-6 ${!inStock && item.purchasable ? "opacity-50 grayscale" : ""}`} />
                ) : (
                  <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">No image</div>
                )}
                <WishlistButton slug={item.slug} className="absolute right-3 top-3 z-10 h-10 w-10" size="h-5 w-5" />
                {item.purchasable && !inStock && (
                  <span className="absolute inset-0 grid place-items-center bg-foreground/40">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-2 text-sm font-bold uppercase tracking-wide text-destructive">
                      <PackageX className="h-4 w-4" /> Out of stock
                    </span>
                  </span>
                )}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prev}
                      aria-label="Previous image"
                      className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-background/90 shadow-soft hover:bg-background"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      aria-label="Next image"
                      className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-background/90 shadow-soft hover:bg-background"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {images.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      onClick={() => setActive(i)}
                      className={`aspect-square overflow-hidden rounded-md border-2 bg-white transition-colors ${
                        i === active ? "border-primary" : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      {src ? (
                        <img src={src} alt={`${loc.name} ${i + 1}`} className="h-full w-full object-contain p-1" />
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{item.category}</span>
              <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{loc.name}</h1>
              {loc.description && (
                <p className="mt-4 whitespace-pre-line break-words leading-relaxed text-muted-foreground">{loc.description}</p>
              )}

              {/* Specifications */}
              {(item.sku || item.purchasable) && (
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border bg-surface p-4 text-sm sm:grid-cols-3">
                  {item.sku && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">SKU</dt>
                      <dd className="font-semibold text-foreground">{item.sku}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Category</dt>
                    <dd className="font-semibold text-foreground">{item.category}</dd>
                  </div>
                  {item.purchasable && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Availability</dt>
                      <dd className={`flex items-center gap-1 font-semibold ${inStock ? "text-primary" : "text-destructive"}`}>
                        {inStock ? <PackageCheck className="h-3.5 w-3.5" /> : <PackageX className="h-3.5 w-3.5" />}
                        {inStock ? (item.stock <= 5 ? `Only ${item.stock} left` : "In stock") : "Out of stock"}
                      </dd>
                    </div>
                  )}
                </dl>
              )}

              {loc.features.length > 0 && (
                <ul className="mt-6 space-y-2 text-sm">
                  {loc.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-foreground">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}

              {item.purchasable && item.price > 0 && (
                <div className="mt-6 rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold text-primary">{money(effectivePrice)}</div>
                    {effectivePrice < item.price && (
                      <div className="text-base text-muted-foreground line-through">{money(item.price)}</div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Price excludes shipping & 6% SST — calculated at checkout.</p>

                  {hasTiers && (
                    <div className="mt-3 overflow-hidden rounded-md border border-border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-secondary text-left text-muted-foreground">
                            <th className="px-3 py-1.5 font-semibold">Quantity</th>
                            <th className="px-3 py-1.5 font-semibold">Price / unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className={`border-t border-border ${qty < (sortedTiers[0]?.min_qty ?? Infinity) ? "bg-primary/5 font-semibold text-foreground" : "text-muted-foreground"}`}>
                            <td className="px-3 py-1.5">1{sortedTiers[0] ? `–${sortedTiers[0].min_qty - 1}` : "+"}</td>
                            <td className="px-3 py-1.5">{money(item.price)}</td>
                          </tr>
                          {sortedTiers.map((t, idx) => {
                            const nextMin = sortedTiers[idx + 1]?.min_qty;
                            const active = qty >= t.min_qty && (!nextMin || qty < nextMin);
                            return (
                              <tr key={t.min_qty} className={`border-t border-border ${active ? "bg-primary/5 font-semibold text-foreground" : "text-muted-foreground"}`}>
                                <td className="px-3 py-1.5">{t.min_qty}{nextMin ? `–${nextMin - 1}` : "+"}</td>
                                <td className="px-3 py-1.5">{money(t.price)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <button type="button" disabled={!canBuy} onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-10 w-10 rounded-md border border-border disabled:opacity-40">−</button>
                      <input
                        disabled={!canBuy}
                        value={qty}
                        onChange={(e) => setQty(Math.max(1, Math.min(maxQty, parseInt(e.target.value || "1", 10))))}
                        className="h-10 w-14 rounded-md border border-input bg-background text-center text-sm disabled:opacity-40"
                      />
                      <button type="button" disabled={!canBuy} onClick={() => setQty((q) => Math.min(maxQty, q + 1))} className="h-10 w-10 rounded-md border border-border disabled:opacity-40">+</button>
                    </div>
                    <button
                      type="button"
                      disabled={!canBuy}
                      onClick={() => { addToCart(); setOpen(true); }}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-primary bg-background px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground"
                    >
                      <ShoppingCart className="h-4 w-4" /> {inStock ? "Add to cart" : "Out of stock"}
                    </button>
                    <button
                      type="button"
                      disabled={!canBuy}
                      onClick={buyNow}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-glow disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                    >
                      <Zap className="h-4 w-4" /> Buy now
                    </button>
                  </div>
                  {!inStock && <NotifyMeForm slug={item.slug} />}
                </div>
              )}

              <a
                href={waLinkFor(settings.whatsapp_number || settings.phone, `Hi, I'm interested in: ${item.name}. Please send me a quotation.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-glow"
              >
                Inquire on WhatsApp <ArrowRight className="h-4 w-4" />
              </a>

              <div className="mt-6 border-t border-border pt-4">
                <ShareBar url={`${SITE_URL}/products/${item.slug}`} title={loc.name} />
              </div>
            </div>
          </div>
        </div>
        {related.length > 0 && (
          <div className="container-page mt-14 border-t border-border pt-10">
            <h2 className="text-xl font-bold text-foreground">You may also like</h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => {
                const imgs = (Array.isArray(p.image_urls) ? p.image_urls : []).filter(Boolean);
                return (
                  <ProductCard
                    key={p.slug}
                    product={{
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
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
        {item && <ProductReviews slug={item.slug} />}
      </section>
    </SiteLayout>
  );
}

function NotifyMeForm({ slug }: { slug: string }) {
  const notify = useServerFn(requestStockNotify);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const res = await notify({ data: { slug, email } });
    setBusy(false);
    if (!res.ok) return setErr(res.error);
    setDone(true);
  }

  if (done) {
    return (
      <p className="mt-4 flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm text-primary">
        <CheckCircle2 className="h-4 w-4 shrink-0" /> We'll email you the moment this is back in stock.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />} Notify me
      </button>
      {err && <p className="text-xs text-destructive sm:basis-full">{err}</p>}
    </form>
  );
}

function StarRow({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function ProductReviews({ slug }: { slug: string }) {
  const fetchReviews = useServerFn(getProductReviews);
  const doSubmit = useServerFn(submitReview);
  const checkEligible = useServerFn(canReviewProduct);
  const { user, session } = useAuth();
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [eligibility, setEligibility] = useState<{ eligible: boolean; reason?: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetchReviews({ data: { slug } });
    if (res.ok) { setReviews(res.reviews); setAverage(res.average); setCount(res.count); }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Only signed-in customers with a completed order containing this exact
  // product may leave a review — previously anyone could post any review
  // for any product with no verification at all.
  useEffect(() => {
    if (!session?.access_token) { setEligibility(null); return; }
    checkEligible({ data: { slug, access_token: session.access_token } }).then((r) => setEligibility(r));
  }, [slug, session?.access_token, checkEligible]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.access_token) return;
    setErr(null);
    setBusy(true);
    const res = await doSubmit({ data: { slug, access_token: session.access_token, rating, comment: comment || undefined } });
    setBusy(false);
    if (!res.ok) return setErr(res.error);
    setDone(true);
    setComment(""); setRating(5);
    load();
  }

  return (
    <div className="mt-14 border-t border-border pt-10" id="reviews">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Ratings & Reviews</h2>
          {count > 0 ? (
            <div className="mt-1.5 flex items-center gap-2">
              <StarRow value={average} />
              <span className="text-sm font-semibold text-foreground">{average.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">({count} review{count === 1 ? "" : "s"})</span>
            </div>
          ) : (
            !loading && <p className="mt-1.5 text-sm text-muted-foreground">No reviews yet — be the first to share your experience.</p>
          )}
        </div>
        {!showForm && !done && user && eligibility?.eligible && (
          <button type="button" onClick={() => setShowForm(true)} className="inline-flex items-center rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
            Write a review
          </button>
        )}
      </div>

      {!user && (
        <p className="mt-4 max-w-lg rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">
          <Link to="/login" search={{ redirect: `/products/${slug}` }} className="font-semibold text-primary hover:underline">Sign in</Link>
          {" "}to write a review after your order for this product is completed.
        </p>
      )}
      {user && eligibility && !eligibility.eligible && eligibility.reason === "not_purchased" && !done && (
        <p className="mt-4 max-w-lg rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">
          You can review this product once you've received it and the order is marked completed.
        </p>
      )}
      {user && eligibility && !eligibility.eligible && eligibility.reason === "already_reviewed" && !done && (
        <p className="mt-4 max-w-lg rounded-md border border-primary/40 bg-primary/5 p-3 text-sm text-primary">
          You've already reviewed this product — thank you!
        </p>
      )}

      {showForm && !done && (
        <form onSubmit={onSubmit} className="mt-5 max-w-lg space-y-3 rounded-lg border border-border bg-surface p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Your rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n === 1 ? "" : "s"}`}>
                  <Star className={`h-7 w-7 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
          </div>
          <textarea rows={3} maxLength={2000} placeholder="Share your experience with this product (optional)" value={comment} onChange={(e) => setComment(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
          {err && <p className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{err}</p>}
          <div className="flex gap-2">
            <button disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit review
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold">Cancel</button>
          </div>
        </form>
      )}

      {done && (
        <p className="mt-5 max-w-lg rounded-md border border-primary/40 bg-primary/5 p-3 text-sm text-primary">
          Thanks for your review! It'll appear here once approved.
        </p>
      )}

      <div className="mt-6 space-y-5">
        {reviews.map((r) => (
          <div key={r.id} className="border-b border-border pb-5 last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-foreground">{r.customer_name}</div>
                <div className="text-xs text-muted-foreground">{r.customer_email_masked}</div>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <StarRow value={r.rating} size="h-3.5 w-3.5" />
            {r.comment && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
