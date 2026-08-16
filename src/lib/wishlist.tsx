import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Wishlist / "Save for later". Stored in localStorage, keyed by product
 * slug only — deliberately no server round-trip or DB table, since this is
 * a nice-to-have and every product's full details are already available
 * client-side via usePublicData(). Mirrors the pattern used by CartProvider.
 */

type WishlistCtx = {
  slugs: string[];
  has: (slug: string) => boolean;
  toggle: (slug: string) => void;
  count: number;
};

const Ctx = createContext<WishlistCtx | null>(null);
const KEY = "hiplastics-wishlist-v1";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setSlugs(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(slugs));
    } catch {
      /* ignore */
    }
  }, [slugs, hydrated]);

  const value = useMemo<WishlistCtx>(
    () => ({
      slugs,
      has: (slug) => slugs.includes(slug),
      toggle: (slug) =>
        setSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug])),
      count: slugs.length,
    }),
    [slugs],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWishlist() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWishlist must be used inside WishlistProvider");
  return c;
}
