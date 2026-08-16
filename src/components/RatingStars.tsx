import { Star } from "lucide-react";

/** Small, read-only star row used for review averages across the site. */
export function RatingStars({ value, size = "h-3.5 w-3.5" }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}
