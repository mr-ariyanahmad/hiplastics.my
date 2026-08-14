import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist";

export function WishlistButton({ slug, className = "", size = "h-4 w-4" }: { slug: string; className?: string; size?: string }) {
  const { has, toggle } = useWishlist();
  const saved = has(slug);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={saved}
      className={`grid place-items-center rounded-full bg-background/90 shadow-soft backdrop-blur transition-colors hover:bg-background ${className}`}
    >
      <Heart className={`${size} ${saved ? "fill-destructive text-destructive" : "text-foreground"}`} />
    </button>
  );
}
