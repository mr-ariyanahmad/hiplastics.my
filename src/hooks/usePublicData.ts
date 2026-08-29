import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchAllPublicData, type SiteSettings, type Product, type Category, type Industry, type GalleryItem, type DownloadItem, type NewsItem } from "@/lib/cms.functions";
import { isPublicSupabaseConfigured, supabase } from "@/integrations/hiplastics/client";

export type PublicSettings = SiteSettings & {
  youtube_url?: string;
  wechat_url?: string;
  wechat_qr_url?: string;
  whatsapp_qr_url?: string;
  logo_url?: string;
  invoice_accent_color?: string;
  invoice_footer_note?: string;
  invoice_signature_name?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_image_url?: string;
  hero_cta_label?: string;
  business_hours?: string;
};

const FALLBACK_SETTINGS: PublicSettings = {
  id: 1,
  name: "Hiplastics",
  tagline: "ECO LEAN ♥ SOUL",
  whatsapp_number: "8618060555061",
  whatsapp_display: "+86 180 6055 5061",
  phone: "18060555061",
  email: "sales@hiplastics.com",
  address: "Hiplastics, China",
  facebook_url: "",
  linkedin_url: "",
  instagram_url: "",
  youtube_url: "",
  wechat_url: "",
  wechat_qr_url: "",
  whatsapp_qr_url: "",
  hero_title: "Eco Lean Soul",
  hero_subtitle: "Hiplastics, your best partner for Electronic Shelf Label accessories.",
  hero_image_url: "",
  hero_cta_label: "GET FREE SOLUTION",
  business_hours: "Mon – Fri · 9:00 – 18:00",
  about_html: "",
  contact_html: "",
};

async function fetchPublicDataFromBrowser() {
  if (!isPublicSupabaseConfigured) {
    throw new Error("Public Supabase configuration is missing.");
  }

  const [settings, products, categories, industries, gallery, downloads, news, reviewRatings] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("products").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("industries").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("gallery").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("downloads").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("news").select("*").eq("is_active", true).order("published_at", { ascending: false }),
    supabase.from("reviews").select("product_slug, rating").eq("is_approved", true),
  ]);

  const failed = [settings, products, categories, industries, gallery, downloads, news, reviewRatings].find(
    (result) => result.error,
  );
  if (failed?.error) throw new Error(failed.error.message);

  const ratingBySlug = new Map<string, { sum: number; count: number }>();
  for (const review of reviewRatings.data ?? []) {
    const slug = review.product_slug as string;
    const entry = ratingBySlug.get(slug) ?? { sum: 0, count: 0 };
    entry.sum += Number(review.rating) || 0;
    entry.count += 1;
    ratingBySlug.set(slug, entry);
  }

  const productsWithRatings = ((products.data as Product[]) ?? []).map((product) => {
    const rating = ratingBySlug.get(product.slug);
    return rating
      ? { ...product, rating_average: rating.sum / rating.count, rating_count: rating.count }
      : product;
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
}

export function usePublicData() {
  const fn = useServerFn(fetchAllPublicData);
  const q = useQuery({
    queryKey: ["public-data"],
    queryFn: async () => {
      try {
        const serverData = await fn();
        if (serverData.ok) return serverData;
        throw new Error(serverData.error || "Public data server function failed.");
      } catch (serverError) {
        if (!isPublicSupabaseConfigured) throw serverError;
        return fetchPublicDataFromBrowser();
      }
    },
    staleTime: 60_000,
  });
  const settings: PublicSettings = (q.data?.settings as PublicSettings | null) ?? FALLBACK_SETTINGS;
  return {
    isLoading: q.isLoading,
    settings,
    products: (q.data?.products ?? []) as Product[],
    categories: (q.data?.categories ?? []) as Category[],
    industries: (q.data?.industries ?? []) as Industry[],
    gallery: (q.data?.gallery ?? []) as GalleryItem[],
    downloads: (q.data?.downloads ?? []) as DownloadItem[],
    news: (q.data?.news ?? []) as NewsItem[],
  };
}

export function splitEmails(s: string): string[] {
  return (s || "")
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter((x) => x.includes("@"));
}

export function waLinkFor(number: string, message: string) {
  const digits = (number || "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
