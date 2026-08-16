import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { saveCartSnapshot } from "@/lib/shop.functions";

/**
 * Mounted once near the root. Whenever a signed-in customer's cart changes,
 * debounced-saves a snapshot server-side so the abandoned-cart reminder
 * cron (routes/api/public/cart-reminder-cron.ts) can email them if they
 * never come back to check out. Guest (signed-out) carts aren't tracked —
 * there's no email to reach them at, and checkout requires sign-in anyway.
 */
export function CartSnapshotSync() {
  const { items } = useCart();
  const { session } = useAuth();
  const save = useServerFn(saveCartSnapshot);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    if (timer.current) clearTimeout(timer.current);
    // 3s debounce — avoids a server round-trip on every +/- click while the
    // customer is actively adjusting quantities.
    timer.current = setTimeout(() => {
      save({
        data: {
          access_token: session.access_token,
          items: items.map((i) => ({ slug: i.slug, name: i.name, qty: i.qty })),
        },
      }).catch(() => undefined);
    }, 3000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, session?.access_token]);

  return null;
}
