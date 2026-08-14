import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { maskEmail } from "./site";

export type PublicReview = {
  id: string;
  customer_name: string;
  /** Masked for privacy, e.g. "amir****han@gmail.com" — never the raw email. */
  customer_email_masked: string;
  rating: number;
  comment: string;
  created_at: string;
};

/** Approved reviews for a product, plus the average rating and count. Public, no auth. */
export const getProductReviews = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { getAdminClient } = await import("@/integrations/hiplastics/admin.server");
    const admin = getAdminClient();
    const { data: rows, error } = await admin
      .from("reviews")
      .select("id, customer_name, customer_email, rating, comment, created_at")
      .eq("product_slug", data.slug)
      .eq("is_approved", true)
      .order("created_at", { ascending: false });
    if (error) return { ok: false as const, error: error.message, reviews: [] as PublicReview[], average: 0, count: 0 };
    const reviews = (rows ?? []).map((r) => ({
      id: r.id as string,
      customer_name: r.customer_name as string,
      customer_email_masked: maskEmail((r.customer_email as string) ?? ""),
      rating: r.rating as number,
      comment: (r.comment as string) ?? "",
      created_at: r.created_at as string,
    }));
    const count = reviews.length;
    const average = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    return { ok: true as const, reviews, average, count };
  });

/**
 * Checks whether the signed-in customer is allowed to review this product:
 * they must have at least one order containing this product with
 * status = "completed", and must not have already reviewed it. This closes
 * the gap where anyone (even a non-customer) could previously post any
 * review for any product.
 */
export const canReviewProduct = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; access_token: string }) =>
    z.object({ slug: z.string().min(1).max(200), access_token: z.string().min(10) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getAdminClient } = await import("@/integrations/hiplastics/admin.server");
    const admin = getAdminClient();
    const { data: userData, error: userErr } = await admin.auth.getUser(data.access_token);
    if (userErr || !userData?.user) return { eligible: false as const, reason: "signed_out" as const };
    const userId = userData.user.id;

    const { data: completedOrders } = await admin
      .from("orders")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "completed");
    const orderIds = (completedOrders ?? []).map((o) => o.id as string);
    if (!orderIds.length) return { eligible: false as const, reason: "not_purchased" as const };

    const { data: matchingItems } = await admin
      .from("order_items")
      .select("order_id")
      .eq("slug", data.slug)
      .in("order_id", orderIds);
    if (!matchingItems?.length) return { eligible: false as const, reason: "not_purchased" as const };

    const { data: existing } = await admin
      .from("reviews")
      .select("id")
      .eq("product_slug", data.slug)
      .eq("customer_email", (userData.user.email ?? "").toLowerCase())
      .maybeSingle();
    if (existing) return { eligible: false as const, reason: "already_reviewed" as const };

    return { eligible: true as const, name: (userData.user.user_metadata as { full_name?: string } | undefined)?.full_name ?? "" };
  });

/**
 * Customer-submitted review. Now requires a signed-in customer with a
 * completed order for this exact product (see canReviewProduct) — previously
 * this endpoint took a freeform name/email and accepted a review from
 * anyone, for anything. Still goes to a moderation queue (is_approved =
 * false) until an admin approves it.
 */
export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; access_token: string; rating: number; comment?: string }) =>
    z
      .object({
        slug: z.string().min(1).max(200),
        access_token: z.string().min(10),
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { getAdminClient } = await import("@/integrations/hiplastics/admin.server");
    const admin = getAdminClient();
    const { data: userData, error: userErr } = await admin.auth.getUser(data.access_token);
    if (userErr || !userData?.user) return { ok: false as const, error: "Please sign in to leave a review." };

    const email = (userData.user.email ?? "").toLowerCase();
    const name = (userData.user.user_metadata as { full_name?: string } | undefined)?.full_name || email.split("@")[0] || "Customer";

    const { data: completedOrders } = await admin
      .from("orders")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("status", "completed");
    const orderIds = (completedOrders ?? []).map((o) => o.id as string);
    if (!orderIds.length) return { ok: false as const, error: "You can review a product after your order for it is completed." };

    const { data: matchingItems } = await admin
      .from("order_items")
      .select("order_id")
      .eq("slug", data.slug)
      .in("order_id", orderIds);
    if (!matchingItems?.length) return { ok: false as const, error: "You can only review products from your own completed orders." };

    const { data: existing } = await admin
      .from("reviews")
      .select("id")
      .eq("product_slug", data.slug)
      .eq("customer_email", email)
      .maybeSingle();
    if (existing) return { ok: false as const, error: "You've already reviewed this product." };

    const { error } = await admin.from("reviews").insert({
      product_slug: data.slug,
      customer_name: name,
      customer_email: email,
      rating: data.rating,
      comment: data.comment ?? "",
      is_approved: false,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
