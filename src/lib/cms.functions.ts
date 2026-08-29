import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  features: string[];
  image_url: string;
  image_urls: string[];
  price?: number;
  sku?: string;
  stock?: number;
  is_purchasable?: boolean;
  sort_order: number;
  is_featured: boolean;
  is_active: boolean;
  /** Optional Bahasa Malaysia translations — blank/empty means "use English". */
  name_ms?: string;
  description_ms?: string;
  features_ms?: string[];
  /** Aggregated from approved reviews — attached in fetchAllPublicData, not a real DB column. */
  rating_average?: number;
  rating_count?: number;
  /** Optional bulk/wholesale price breaks — empty means the base price applies at any quantity. */
  price_tiers?: { min_qty: number; price: number }[];
};
export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};
export type Industry = {
  id: string;
  name: string;
  icon: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};
export type GalleryItem = {
  id: string;
  label: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};
export type DownloadItem = {
  id: string;
  title: string;
  size_label: string;
  file_url: string;
  sort_order: number;
  is_active: boolean;
};
export type NewsItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  image_url: string;
  published_at: string;
  sort_order: number;
  is_active: boolean;
};
export type Coupon = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_subtotal: number;
  max_uses: number;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};
export type Review = {
  id: string;
  product_slug: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
};
export type SiteSettings = {
  id: number;
  name: string;
  tagline: string;
  whatsapp_number: string;
  whatsapp_display: string;
  phone: string;
  email: string;
  address: string;
  facebook_url: string;
  linkedin_url: string;
  instagram_url: string;
  about_html: string;
  contact_html: string;
};

const TABLES = ["products", "categories", "industries", "gallery", "downloads", "news", "coupons", "reviews"] as const;
type TableName = (typeof TABLES)[number];

async function requireAdmin(accessToken: string) {
  const { getAdminClient } = await import("@/integrations/hiplastics/admin.server");
  const admin = getAdminClient();
  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data?.user) throw new Error("Not authenticated");
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) throw new Error("Not authorized — admin role required");
  return { admin, userId: data.user.id };
}

export const fetchAllPublicData = createServerFn({ method: "GET" }).handler(async () => {
  try {
    // Public content is protected by anon RLS read policies; it must not depend
    // on the optional service-role environment used by admin/shop operations.
    const { getPublicClient } = await import("@/integrations/hiplastics/public.server");
    const admin = getPublicClient();
    const [settings, products, categories, industries, gallery, downloads, news, reviewRatings] = await Promise.all([
      admin.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      admin.from("products").select("*").eq("is_active", true).order("sort_order"),
      admin.from("categories").select("*").eq("is_active", true).order("sort_order"),
      admin.from("industries").select("*").eq("is_active", true).order("sort_order"),
      admin.from("gallery").select("*").eq("is_active", true).order("sort_order"),
      admin.from("downloads").select("*").eq("is_active", true).order("sort_order"),
      admin.from("news").select("*").eq("is_active", true).order("published_at", { ascending: false }),
      // Approved review ratings only, for the star badge shown on product cards.
      admin.from("reviews").select("product_slug, rating").eq("is_approved", true),
    ]);
    // Aggregate rating_average / rating_count per product slug — computed here
    // (not stored) so it's always in sync with the reviews table.
    const ratingBySlug = new Map<string, { sum: number; count: number }>();
    for (const r of reviewRatings.data ?? []) {
      const slug = r.product_slug as string;
      const entry = ratingBySlug.get(slug) ?? { sum: 0, count: 0 };
      entry.sum += Number(r.rating) || 0;
      entry.count += 1;
      ratingBySlug.set(slug, entry);
    }
    const productsWithRatings = ((products.data as Product[]) ?? []).map((p) => {
      const agg = ratingBySlug.get(p.slug);
      return agg ? { ...p, rating_average: agg.sum / agg.count, rating_count: agg.count } : p;
    });
    return {
      ok: true as const,
      settings: (settings.data as SiteSettings | null) ?? null,
      products: productsWithRatings,
      categories: (categories.data as Category[]) ?? [],
      industries: (industries.data as Industry[]) ?? [],
      gallery: (gallery.data as GalleryItem[]) ?? [],
      downloads: (downloads.data as DownloadItem[]) ?? [],
      news: (news.data as NewsItem[]) ?? [],
    };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Failed to load",
      settings: null,
      products: [] as Product[],
      categories: [] as Category[],
      industries: [] as Industry[],
      gallery: [] as GalleryItem[],
      downloads: [] as DownloadItem[],
      news: [] as NewsItem[],
    };
  }
});

export const fetchAdminData = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    const { admin } = await requireAdmin(data.token);
    const [settings, products, categories, industries, gallery, downloads, news, coupons, reviews] = await Promise.all([
      admin.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      admin.from("products").select("*").order("sort_order"),
      admin.from("categories").select("*").order("sort_order"),
      admin.from("industries").select("*").order("sort_order"),
      admin.from("gallery").select("*").order("sort_order"),
      admin.from("downloads").select("*").order("sort_order"),
      admin.from("news").select("*").order("published_at", { ascending: false }),
      admin.from("coupons").select("*").order("created_at", { ascending: false }),
      admin.from("reviews").select("*").order("created_at", { ascending: false }),
    ]);
    return {
      settings: settings.data as SiteSettings | null,
      products: (products.data ?? []) as Product[],
      categories: (categories.data ?? []) as Category[],
      industries: (industries.data ?? []) as Industry[],
      gallery: (gallery.data ?? []) as GalleryItem[],
      downloads: (downloads.data ?? []) as DownloadItem[],
      news: (news.data ?? []) as NewsItem[],
      coupons: (coupons.data ?? []) as Coupon[],
      reviews: (reviews.data ?? []) as Review[],
    };
  });

export const upsertRow = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; table: TableName; row: Record<string, unknown> }) =>
    z
      .object({
        token: z.string().min(10),
        table: z.enum(TABLES),
        row: z.record(z.string(), z.unknown()),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { admin } = await requireAdmin(data.token);
    const row = { ...data.row };
    if (!row.id) delete row.id;
    // Products: keep image_url and image_urls[0] in sync for backward compat
    if (data.table === "products") {
      const imgs = Array.isArray(row.image_urls) ? (row.image_urls as string[]).filter(Boolean) : [];
      const single = typeof row.image_url === "string" ? row.image_url : "";
      if (imgs.length > 0) {
        row.image_urls = imgs;
        row.image_url = imgs[0];
      } else if (single) {
        row.image_urls = [single];
        row.image_url = single;
      } else {
        row.image_urls = [];
        row.image_url = "";
      }
    }
    if (data.table === "coupons" && typeof row.code === "string") {
      row.code = row.code.trim().toUpperCase();
    }
    // Optional timestamp fields (coupons.starts_at/expires_at, news.published_at, etc.)
    // come from the admin UI as either "" (cleared/never set) or a "YYYY-MM-DD" /
    // ISO string. Postgres rejects "" for a timestamptz column, so:
    //   - blank/whitespace-only  -> null
    //   - a parseable date       -> normalized to a full ISO timestamp
    //   - anything unparseable  -> a clear error instead of a cryptic DB failure
    for (const key of Object.keys(row)) {
      if (!key.endsWith("_at")) continue;
      const val = row[key];
      if (val === undefined || val === null) continue;
      if (typeof val !== "string") continue;
      const trimmed = val.trim();
      if (trimmed === "") {
        row[key] = null;
        continue;
      }
      const parsed = new Date(trimmed);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error(`"${key}" isn't a valid date ("${val}"). Use the date picker or format YYYY-MM-DD.`);
      }
      row[key] = parsed.toISOString();
    }
    // Read the previous stock level BEFORE upserting, so we can tell
    // whether this save just brought the product back into stock (0 -> >0)
    // and, if so, notify everyone who asked to be told (see
    // stock_notify_requests / requestStockNotify in shop.functions.ts).
    let prevStock: number | null = null;
    if (data.table === "products" && row.id) {
      const { data: existing } = await admin.from("products").select("stock").eq("id", row.id).maybeSingle();
      prevStock = existing ? Number(existing.stock) || 0 : null;
    }

    const { data: result, error } = await admin
      .from(data.table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(row as any)
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (data.table === "products" && prevStock !== null && prevStock <= 0) {
      const newStock = Number((result as { stock?: number }).stock) || 0;
      if (newStock > 0) notifyBackInStock(admin, result as unknown as Product).catch(() => undefined);
    }

    return result;
  });

type AdminClient = ReturnType<typeof import("@/integrations/hiplastics/admin.server").getAdminClient>;

/** Emails every pending "notify me" subscriber for a product once it's restocked, then clears them. */
async function notifyBackInStock(admin: AdminClient, product: Product) {
  const { data: subs } = await admin
    .from("stock_notify_requests")
    .select("id, email")
    .eq("product_slug", product.slug)
    .is("notified_at", null);
  if (!subs || !subs.length) return;
  const { sendBackInStockEmail } = await import("./email.server");
  for (const sub of subs) {
    await sendBackInStockEmail(sub.email as string, { name: product.name, slug: product.slug }).catch(() => undefined);
  }
  await admin
    .from("stock_notify_requests")
    .update({ notified_at: new Date().toISOString() })
    .eq("product_slug", product.slug)
    .is("notified_at", null);
}


export const deleteRow = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; table: TableName; id: string }) =>
    z
      .object({ token: z.string().min(10), table: z.enum(TABLES), id: z.string().uuid() })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { admin } = await requireAdmin(data.token);
    const { error } = await admin.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Bulk create/update products from a CSV import. Matched by slug — a row
 * whose slug already exists updates that product in place, anything else
 * creates a new one. Runs each row independently and collects per-row
 * errors (e.g. a duplicate slug within the file, a missing name) instead of
 * failing the whole import, since a 200-row CSV having one bad line
 * shouldn't block the other 199 from saving.
 */
export const bulkUpsertProducts = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; rows: Record<string, unknown>[] }) =>
    z
      .object({
        token: z.string().min(10),
        rows: z.array(z.record(z.string(), z.unknown())).min(1).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { admin } = await requireAdmin(data.token);
    const { data: existing } = await admin.from("products").select("id, slug");
    const bySlug = new Map((existing ?? []).map((r) => [String(r.slug), String(r.id)]));

    let created = 0;
    let updated = 0;
    const errors: { row: number; slug?: string; message: string }[] = [];

    for (let i = 0; i < data.rows.length; i++) {
      const raw = data.rows[i];
      const slug = String(raw.slug ?? "").trim();
      const name = String(raw.name ?? "").trim();
      if (!slug || !name) {
        errors.push({ row: i + 1, slug, message: "Missing required slug or name — row skipped." });
        continue;
      }
      const imgs = Array.isArray(raw.image_urls) ? (raw.image_urls as string[]).filter(Boolean) : [];
      const row: Record<string, unknown> = {
        slug,
        name,
        name_ms: String(raw.name_ms ?? ""),
        category: String(raw.category ?? "Uncategorised"),
        description: String(raw.description ?? ""),
        description_ms: String(raw.description_ms ?? ""),
        features: Array.isArray(raw.features) ? raw.features : [],
        features_ms: Array.isArray(raw.features_ms) ? raw.features_ms : [],
        price: Number(raw.price) || 0,
        price_tiers: Array.isArray(raw.price_tiers) ? raw.price_tiers : [],
        sku: String(raw.sku ?? ""),
        stock: Math.max(0, Math.floor(Number(raw.stock) || 0)),
        is_purchasable: raw.is_purchasable !== false && raw.is_purchasable !== "false" && raw.is_purchasable !== "0" && raw.is_purchasable !== 0,
        image_urls: imgs,
        image_url: imgs[0] || "",
        sort_order: Math.floor(Number(raw.sort_order) || 0),
        is_featured: raw.is_featured === true || raw.is_featured === "true" || raw.is_featured === "1" || raw.is_featured === 1,
        is_active: raw.is_active !== false && raw.is_active !== "false" && raw.is_active !== "0" && raw.is_active !== 0,
      };
      const existingId = bySlug.get(slug);
      if (existingId) row.id = existingId;

      const { data: result, error } = await admin
        .from("products")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(row as any, { onConflict: "slug" })
        .select("id")
        .single();
      if (error) {
        errors.push({ row: i + 1, slug, message: error.message });
        continue;
      }
      if (existingId) updated++;
      else {
        created++;
        if (result?.id) bySlug.set(slug, String(result.id));
      }
    }

    return { ok: true as const, created, updated, errors };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; patch: Record<string, unknown> }) =>
    z
      .object({ token: z.string().min(10), patch: z.record(z.string(), z.unknown()) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { admin } = await requireAdmin(data.token);
    const { error } = await admin
      .from("site_settings")
      .upsert({ id: 1, ...data.patch, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const uploadMedia = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; path: string; contentType: string; base64: string }) =>
    z
      .object({
        token: z.string().min(10),
        path: z.string().min(1).max(200),
        contentType: z.string().min(1).max(100),
        base64: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { admin } = await requireAdmin(data.token);
    const buf = Buffer.from(data.base64, "base64");
    const { error } = await admin.storage
      .from("hiplastics-media")
      .upload(data.path, buf, { contentType: data.contentType, upsert: true });
    if (error) throw new Error(error.message);
    const { data: pub } = admin.storage.from("hiplastics-media").getPublicUrl(data.path);
    return { url: pub.publicUrl };
  });

/* =============================================================
 * ADMIN AUTH (server-side) — the browser never needs Supabase keys.
 * ============================================================= */

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) =>
    z.object({ email: z.string().email().max(160), password: z.string().min(6).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { getAdminClient } = await import("@/integrations/hiplastics/admin.server");
      const admin = getAdminClient();
      const { data: auth, error } = await admin.auth.signInWithPassword({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });
      if (error || !auth?.session) return { ok: false as const, error: error?.message ?? "Invalid email or password." };
      const normalizedEmail = auth.user.email?.trim().toLowerCase() ?? "";
      const isVerified = Boolean(auth.user.email_confirmed_at);
      const isOwner = normalizedEmail === "mr.ariyanahmad@gmail.com";

      // signInWithPassword changes this client's identity to the signed-in
      // user. Always use a fresh service client for role reads/writes.
      const roleAdmin = getAdminClient();
      let { data: role, error: roleError } = await roleAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id)
        .eq("role", "admin")
        .maybeSingle();

      // Secure first-login claim: only the pre-approved, Auth-verified owner
      // email can receive the role. A caller-supplied email alone is never
      // trusted; it must match the identity returned by Supabase Auth.
      if (!role && !roleError && isOwner && isVerified) {
        const { error: claimError } = await roleAdmin
          .from("user_roles")
          .upsert({ user_id: auth.user.id, role: "admin" }, { onConflict: "user_id,role" });
        if (claimError) roleError = claimError;
        else role = { role: "admin" };
      }

      if (roleError?.message.toLowerCase().includes("invalid schema")) {
        return {
          ok: false as const,
          error: "Database connection mismatch: this app is connected to a Supabase project where the hiplastics schema is not exposed. Set HIPLASTICS_SUPABASE_URL and HIPLASTICS_SUPABASE_SERVICE_ROLE_KEY from the same project, then expose hiplastics in API settings.",
        };
      }
      if (roleError) throw new Error(`Admin role check failed: ${roleError.message}`);
      if (!role) return { ok: false as const, error: "This account does not have admin access." };
      return {
        ok: true as const,
        token: auth.session.access_token,
        email: auth.user.email ?? "",
        expires_at: auth.session.expires_at ?? 0,
      };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Login failed" };
    }
  });

export const verifyAdminToken = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { admin } = await requireAdmin(data.token);
      const { data: u } = await admin.auth.getUser(data.token);
      return { ok: true as const, email: u?.user?.email ?? "" };
    } catch {
      return { ok: false as const, email: "" };
    }
  });

/** Environment / integration health for the admin System panel. */
export const getSystemStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const has = (k: string) => Boolean(process.env[k] && String(process.env[k]).length > 3);
    return {
      supabase_url: has("HIPLASTICS_SUPABASE_URL"),
      supabase_service_key: has("HIPLASTICS_SUPABASE_SERVICE_ROLE_KEY"),
      toyyibpay_secret: has("TOYYIBPAY_SECRET_KEY"),
      toyyibpay_category: has("TOYYIBPAY_CATEGORY_CODE"),
      toyyibpay_sandbox: String(process.env.TOYYIBPAY_SANDBOX || "").toLowerCase() === "true",
      app_base_url: process.env.APP_BASE_URL || process.env.PUBLIC_SITE_URL || "https://hiplastics.my",
    };
  });
