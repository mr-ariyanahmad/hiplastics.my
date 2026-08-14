// Central site configuration. Update phone/email here to change site-wide.

// Single source of truth for the production domain — every canonical URL,
// og:url, and JSON-LD "url" field must use this, never a hardcoded domain,
// so a preview/staging URL never leaks into search results or share cards.
export const SITE_URL = "https://hiplastics.my";

export const site = {
  name: "Hiplastics Malaysia",
  tagline: "Retail Display & ESL Accessory Solutions",
  // International format without "+" or spaces for wa.me link
  whatsappNumber: "601115526527",
  whatsappDisplay: "+60 11-1552 6527",
  email: "sales@hiplastics.com.my",
  phone: "+601115526527",
  address: "Kuala Lumpur, Malaysia",
  social: {
    facebook: "#",
    linkedin: "#",
    instagram: "#",
  },
};

export function waLink(message: string) {
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Normalizes a Malaysian phone number to E.164-ish digits-only "60XXXXXXXXX"
 * form (no leading 0, no "+"). Customers commonly type the local format
 * (e.g. "011-4128 1476"), which WhatsApp's wa.me links can't resolve without
 * the country code — this is what was causing "couldn't look up phone
 * number" when admin tried to WhatsApp a customer from an order.
 */
export function normalizeMyPhone(raw: string): string {
  let digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0060")) digits = digits.slice(2);
  if (digits.startsWith("60")) return digits;
  if (digits.startsWith("0")) return `60${digits.slice(1)}`;
  return `60${digits}`;
}

/** Digits-only Malaysian number (with 60 prefix), suitable for a wa.me/ link. */
export function waLinkForCustomer(rawPhone: string, message: string) {
  const digits = normalizeMyPhone(rawPhone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Masks an email for public display: keeps a few leading chars of the local
 * part and the full domain, stars out the rest — e.g.
 * "amirulrifhan21@gmail.com" -> "amiru****fhan21@gmail.com" (illustrative).
 */
export function maskEmail(email: string): string {
  const trimmed = String(email || "").trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at);
  if (local.length <= 4) return `${local[0] ?? ""}***${domain}`;
  const head = local.slice(0, 4);
  const tail = local.slice(-3);
  return `${head}****${tail}${domain}`;
}

export type Product = {
  slug: string;
  name: string;
  category: string;
  description: string;
  features: string[];
  image: string;
  images?: string[];
  price?: number;
  purchasable?: boolean;
  stock?: number;
  sku?: string;
};

export const industries = [
  { name: "Supermarkets", icon: "ShoppingCart" },
  { name: "Pharmacies", icon: "Pill" },
  { name: "Convenience Stores", icon: "Store" },
  { name: "Electronics Stores", icon: "Cpu" },
  { name: "Department Stores", icon: "Building2" },
  { name: "Retail Chains", icon: "Network" },
] as const;
