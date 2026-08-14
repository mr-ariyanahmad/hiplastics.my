import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchAllPublicData, type SiteSettings, type Product, type Category, type Industry, type GalleryItem, type DownloadItem, type NewsItem } from "@/lib/cms.functions";

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

export function usePublicData() {
  const fn = useServerFn(fetchAllPublicData);
  const q = useQuery({
    queryKey: ["public-data"],
    queryFn: () => fn(),
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
