import { createFileRoute } from "@tanstack/react-router";

/**
 * Abandoned-cart reminder — triggered daily by Vercel Cron (see
 * vercel.json). Emails signed-in customers whose cart has sat untouched
 * for 2–72 hours and hasn't been converted to an order or already
 * reminded, then marks them as reminded so they're never emailed twice
 * for the same cart.
 *
 * Protect with CRON_SECRET so this can't be triggered by anyone who finds
 * the URL — Vercel Cron sends this as a Bearer token automatically when
 * CRON_SECRET is set in the project's env vars.
 */
export const Route = createFileRoute("/api/public/cart-reminder-cron")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (secret) {
          const auth = request.headers.get("authorization") || "";
          if (auth !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
        }

        const { getAdminClient } = await import("@/integrations/hiplastics/admin.server");
        const { sendCartReminderEmail } = await import("@/lib/email.server");
        const admin = getAdminClient();

        const now = Date.now();
        const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
        const threeDaysAgo = new Date(now - 72 * 60 * 60 * 1000).toISOString();

        const { data: snapshots, error } = await admin
          .from("cart_snapshots")
          .select("id, customer_email, customer_name, items, updated_at")
          .is("reminder_sent_at", null)
          .lte("updated_at", twoHoursAgo)
          .gte("updated_at", threeDaysAgo)
          .limit(200);

        if (error) return new Response(error.message, { status: 500 });

        let sent = 0;
        for (const snap of snapshots ?? []) {
          const email = snap.customer_email as string;
          if (!email) continue;
          const items = (snap.items as { name: string; qty: number }[]) || [];
          if (!items.length) continue;
          await sendCartReminderEmail(email, (snap.customer_name as string) || "", items).catch(() => undefined);
          await admin.from("cart_snapshots").update({ reminder_sent_at: new Date().toISOString() }).eq("id", snap.id);
          sent++;
        }

        return new Response(JSON.stringify({ ok: true, sent }), { headers: { "content-type": "application/json" } });
      },
    },
  },
});
