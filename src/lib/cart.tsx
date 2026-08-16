import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  slug: string;
  name: string;
  price: number;
  image: string;
  qty: number;
  /** Stock known at the time this item was added/updated — used to clamp qty client-side. Server always re-checks. */
  stock?: number;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "hiplastics-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, hydrated]);

  const value = useMemo<CartCtx>(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
    return {
      items,
      count,
      subtotal,
      open,
      setOpen,
      add: (item, qty = 1) =>
        setItems((prev) => {
          const cap = item.stock !== undefined ? Math.max(0, item.stock) : 999;
          const found = prev.find((p) => p.slug === item.slug);
          if (found)
            return prev.map((p) =>
              p.slug === item.slug
                ? { ...p, qty: Math.min(cap, p.qty + qty), price: item.price, name: item.name, image: item.image, stock: item.stock }
                : p,
            );
          return [...prev, { ...item, qty: Math.min(cap, qty) }];
        }),
      setQty: (slug, qty) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((p) => p.slug !== slug)
            : prev.map((p) => (p.slug === slug ? { ...p, qty: Math.min(p.stock !== undefined ? Math.max(0, p.stock) : 999, qty) } : p)),
        ),
      remove: (slug) => setItems((prev) => prev.filter((p) => p.slug !== slug)),
      clear: () => setItems([]),
    };
  }, [items, open]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}

export function money(n: number, currency = "MYR") {
  return `${currency} ${Number(n || 0).toFixed(2)}`;
}
