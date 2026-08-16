import { Link } from "@tanstack/react-router";
import { X, ShoppingCart, Trash2 } from "lucide-react";
import { useCart, money } from "@/lib/cart";

export function CartDrawer() {
  const { items, open, setOpen, setQty, remove, subtotal } = useCart();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-label="Shopping cart">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-background shadow-elevated">
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <ShoppingCart className="h-5 w-5 text-primary" /> Your Cart
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close cart" className="rounded-md p-2 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Your cart is empty.</p>}
          {items.map((i) => (
            <div key={i.slug} className="mb-3 flex gap-3 rounded-lg border border-border p-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-white">
                {i.image && <img src={i.image} alt={i.name} className="h-full w-full object-contain p-1" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{i.name}</div>
                <div className="text-xs text-muted-foreground">{money(i.price)}</div>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => setQty(i.slug, i.qty - 1)} className="h-7 w-7 rounded-md border border-border text-sm">−</button>
                  <span className="w-8 text-center text-sm font-semibold">{i.qty}</span>
                  <button onClick={() => setQty(i.slug, i.qty + 1)} className="h-7 w-7 rounded-md border border-border text-sm">+</button>
                  <button onClick={() => remove(i.slug)} aria-label="Remove" className="ml-auto rounded-md p-1.5 text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="text-sm font-bold text-foreground">{money(i.price * i.qty)}</div>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-lg font-bold text-foreground">{money(subtotal)}</span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Shipping and 6% SST are calculated at checkout.</p>
          <Link
            to="/cart"
            onClick={() => setOpen(false)}
            className={`inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground ${items.length === 0 ? "pointer-events-none opacity-50" : ""}`}
          >
            Checkout
          </Link>
        </div>
      </aside>
    </div>
  );
}

export function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <button
      type="button"
      aria-label="Open cart"
      onClick={() => setOpen(true)}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-md text-primary transition-colors hover:bg-secondary"
    >
      <ShoppingCart className="h-6 w-6" strokeWidth={2.2} />
      {count > 0 && (
        <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {count}
        </span>
      )}
    </button>
  );
}
