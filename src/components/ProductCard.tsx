import { ArrowRight, ShoppingCart, PackageX } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { type Product } from "@/lib/site";
import { useCart, money } from "@/lib/cart";
import { WishlistButton } from "@/components/WishlistButton";

export function ProductCard({ product }: { product: Product }) {
  const { add, setOpen } = useCart();
  const price = Number(product.price ?? 0);
  const stock = Math.max(0, Number(product.stock ?? 0));
  const inStock = stock > 0;
  const buyable = Boolean(product.purchasable) && price > 0 && inStock;
  const first = (product.images && product.images[0]) || product.image || "";
  const count = product.images?.length ?? (product.image ? 1 : 0);
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated">
      <Link
        to="/products/$slug"
        params={{ slug: product.slug }}
        className="relative aspect-[4/3] overflow-hidden bg-white"
      >
        {first ? (
          <img
            src={first}
            alt={product.name}
            loading="lazy"
            width={800}
            height={600}
            className={`h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105 ${!inStock ? "opacity-50 grayscale" : ""}`}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">No image</div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-primary backdrop-blur">
          {product.category}
        </span>
        <WishlistButton slug={product.slug} className="absolute right-3 bottom-3 z-10 h-9 w-9" />
        {count > 1 && (
          <span className="absolute right-3 top-3 rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-semibold text-background">
            {count} photos
          </span>
        )}
        {Boolean(product.purchasable) && !inStock && (
          <span className="absolute inset-0 grid place-items-center bg-foreground/40">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-destructive">
              <PackageX className="h-3.5 w-3.5" /> Out of stock
            </span>
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold text-foreground">
          <Link to="/products/$slug" params={{ slug: product.slug }} className="line-clamp-2 break-words hover:text-primary">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 break-words text-sm leading-relaxed text-muted-foreground">
          {product.description}
        </p>
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {product.features.slice(0, 3).map((f) => (
            <li key={f} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span className="line-clamp-1 break-words">{f}</span>
            </li>
          ))}
          {product.features.length > 3 && (
            <li className="text-muted-foreground/70">+{product.features.length - 3} more</li>
          )}
        </ul>
        {Boolean(product.purchasable) && price > 0 && (
          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="text-xl font-bold text-primary">{money(price)}</div>
            {inStock && stock <= 5 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                Only {stock} left
              </span>
            )}
            {!inStock && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                Out of stock
              </span>
            )}
          </div>
        )}
        {Boolean(product.purchasable) && price > 0 && (
          <button
            type="button"
            disabled={!buyable}
            onClick={() => { add({ slug: product.slug, name: product.name, price, image: first, stock }); setOpen(true); }}
            className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-glow disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            <ShoppingCart className="h-4 w-4" /> {inStock ? "Add to cart" : "Out of stock"}
          </button>
        )}
        <Link
          to="/products/$slug"
          params={{ slug: product.slug }}
          className={`${buyable ? "mt-2 border border-border bg-background text-foreground hover:bg-secondary" : "mt-5 bg-primary text-primary-foreground hover:bg-primary-glow"} inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium transition-colors`}
        >
          View details <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
