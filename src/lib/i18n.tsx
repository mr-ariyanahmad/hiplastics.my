import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "ms";

const KEY = "hiplastics-lang";

/**
 * Common site strings, English + Bahasa Malaysia. This isn't a full-site
 * translation (that would mean re-translating every product description and
 * CMS field) but it covers navigation, footer, cart/checkout and account —
 * the parts every visitor sees on every page — and gives every page a
 * working `t()` to extend as more strings are added.
 */
const DICT: Record<string, { en: string; ms: string }> = {
  nav_home: { en: "Home", ms: "Laman Utama" },
  nav_about: { en: "About Us", ms: "Tentang Kami" },
  nav_products: { en: "Products", ms: "Produk" },
  nav_esl: { en: "ESL Solutions", ms: "Penyelesaian ESL" },
  nav_news: { en: "News & Blog", ms: "Berita & Blog" },
  nav_contact: { en: "Contact", ms: "Hubungi" },
  nav_track: { en: "Track Order", ms: "Jejak Pesanan" },
  nav_signin: { en: "Sign in", ms: "Log Masuk" },
  nav_signin_register: { en: "Sign in / Register", ms: "Log Masuk / Daftar" },
  nav_my_account: { en: "My Account", ms: "Akaun Saya" },
  search_placeholder: { en: "Search products…", ms: "Cari produk…" },
  search: { en: "Search", ms: "Cari" },
  language: { en: "Language", ms: "Bahasa" },

  cart_title: { en: "Cart & Checkout", ms: "Troli & Pembayaran" },
  cart_empty: { en: "Your cart is empty", ms: "Troli anda kosong" },
  cart_delivery_details: { en: "Delivery details", ms: "Butiran Penghantaran" },
  cart_payment_method: { en: "Payment method", ms: "Kaedah Pembayaran" },
  cart_order_summary: { en: "Order summary", ms: "Ringkasan Pesanan" },
  cart_subtotal: { en: "Subtotal", ms: "Jumlah Kecil" },
  cart_shipping: { en: "Shipping", ms: "Penghantaran" },
  cart_total: { en: "Total", ms: "Jumlah" },
  cart_place_cod: { en: "Place COD order", ms: "Buat Pesanan (Bayar Semasa Terima)" },
  cart_pay_now: { en: "Pay now", ms: "Bayar Sekarang" },
  cart_signin_continue: { en: "Sign in to continue", ms: "Log masuk untuk teruskan" },
  cart_continue_shopping: { en: "Continue shopping", ms: "Teruskan Membeli-belah" },

  footer_support: { en: "Support", ms: "Sokongan" },
  footer_track: { en: "Track Your Order", ms: "Jejak Pesanan Anda" },
  footer_refund: { en: "Refund & Return Policy", ms: "Polisi Pemulangan & Bayaran Balik" },
  footer_contact: { en: "Contact Us", ms: "Hubungi Kami" },
  footer_rights: { en: "All Rights Reserved.", ms: "Hak Cipta Terpelihara." },

  reviews_title: { en: "Ratings & Reviews", ms: "Penilaian & Ulasan" },
  reviews_write: { en: "Write a review", ms: "Tulis Ulasan" },
  reviews_empty: { en: "No reviews yet — be the first to share your experience.", ms: "Belum ada ulasan — jadilah yang pertama berkongsi pengalaman anda." },
};

type I18nCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof DICT | (string & {})) => string;
};

const Ctx = createContext<I18nCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === "en" || saved === "ms") setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    try { window.localStorage.setItem(KEY, l); } catch { /* ignore */ }
  }

  const value = useMemo<I18nCtx>(
    () => ({
      lang,
      setLang,
      t: (key) => DICT[key as string]?.[lang] ?? DICT[key as string]?.en ?? String(key),
    }),
    [lang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}
