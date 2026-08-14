import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/toyyibpay-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { applyCallback } = await import("@/lib/shop.server");
        const text = await request.text();
        const params = new URLSearchParams(text);
        const payload = {
          refno: params.get("refno") ?? "",
          status: params.get("status") ?? "",
          billcode: params.get("billcode") ?? "",
          order_id: params.get("order_id") ?? "",
          transaction_id: params.get("transaction_id") ?? "",
        };
        if (!payload.order_id || !payload.billcode) return new Response("bad request", { status: 400 });
        try {
          await applyCallback(payload);
        } catch {
          return new Response("error", { status: 500 });
        }
        return new Response("OK");
      },
      GET: async () => new Response("OK"),
    },
  },
});
