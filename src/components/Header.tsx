import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Menu, X, Search, User, Heart } from "lucide-react";
import { Logo } from "./Logo";
import { CartButton } from "./CartDrawer";
import { usePublicData } from "@/hooks/usePublicData";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { useWishlist } from "@/lib/wishlist";

const nav = [
  { to: "/", key: "nav_home", label: "Home" },
  { to: "/about", key: "nav_about", label: "About Us" },
  { to: "/products", key: "nav_products", label: "Products" },
  { to: "/industries", key: "nav_esl", label: "ESL Solutions" },
  { to: "/news", key: "nav_news", label: "News & Blog" },
  { to: "/contact", key: "nav_contact", label: "Contact" },
  { to: "/track", key: "nav_track", label: "Track Order" },
] as const;

/** Always-visible EN/BM switcher. Previously this was a static, non-clickable
 * "🇬🇧 English" label buried inside the hamburger menu with no Malay option
 * at all — this version is functional and sits in the header on every page. */
function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`inline-flex overflow-hidden rounded-md border border-border text-xs font-semibold ${compact ? "" : ""}`}>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`px-2 py-1.5 transition-colors ${lang === "en" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("ms")}
        aria-pressed={lang === "ms"}
        className={`px-2 py-1.5 transition-colors ${lang === "ms" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
      >
        BM
      </button>
    </div>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const { settings } = usePublicData();
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const { count: wishlistCount } = useWishlist();


  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  function runSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchOpen(false);
    setOpen(false);
    navigate({ to: "/products", search: { q: trimmed } });
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="hidden justify-end border-b border-border/60 bg-surface md:flex">
          <div className="container-page flex h-9 items-center justify-end">
            <LanguageSwitcher />
          </div>
        </div>
        <div className="container-page flex h-20 items-center justify-between">
          <Link to="/" aria-label={settings.name} className="flex items-center">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={t("search")}
              onClick={() => setSearchOpen((v) => !v)}
              className="hidden h-10 w-10 items-center justify-center rounded-md text-primary transition-colors hover:bg-secondary md:inline-flex"
            >
              <Search className="h-5 w-5" />
            </button>
            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className="relative hidden h-10 w-10 items-center justify-center rounded-md text-primary transition-colors hover:bg-secondary md:inline-flex"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <CartButton />
            <Link
              to={user ? "/account" : "/login"}
              aria-label={user ? "My account" : "Sign in"}
              className="hidden h-10 w-10 items-center justify-center rounded-md text-primary transition-colors hover:bg-secondary md:inline-flex"
            >
              <User className="h-5 w-5" />
            </Link>
            <button

              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-primary transition-colors hover:bg-secondary"
            >
              <Menu className="h-7 w-7" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              aria-label={t("search")}
              onClick={() => setSearchOpen((v) => !v)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-primary transition-colors hover:bg-secondary md:hidden"
            >
              <Search className="h-6 w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>
        {searchOpen && (
          <div className="border-t border-border bg-background">
            <form
              className="container-page flex gap-2 py-3"
              onSubmit={(e) => { e.preventDefault(); runSearch(q); }}
            >
              <input
                ref={searchRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search_placeholder")}
                className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="shrink-0 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                {t("search")}
              </button>
            </form>
          </div>
        )}
      </header>

      {open && (
        <div className="fixed inset-0 z-[60] bg-background">
          <div className="flex h-20 items-center justify-between border-b border-border px-4 sm:px-6">
            <Link to="/" onClick={() => setOpen(false)} aria-label={settings.name}>
              <Logo />
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t("search")}
                onClick={() => { setOpen(false); setSearchOpen(true); }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-primary hover:bg-secondary"
              >
                <Search className="h-6 w-6" strokeWidth={2.5} />
              </button>
              <Link
                to="/wishlist"
                onClick={() => setOpen(false)}
                aria-label="Wishlist"
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-md text-primary hover:bg-secondary"
              >
                <Heart className="h-6 w-6" strokeWidth={2.5} />
                {wishlistCount > 0 && (
                  <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-primary hover:bg-secondary"
              >
                <X className="h-7 w-7" strokeWidth={2.5} />
              </button>
            </div>
          </div>
          <nav className="overflow-y-auto px-6 py-4" aria-label="Mobile">
            {nav.map((item) => (
              <div key={item.key} className="border-b border-border/50">
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="block py-5 text-2xl font-semibold text-primary"
                >
                  {t(item.key)}
                </Link>
              </div>
            ))}
            <div className="flex items-center justify-between py-5">
              <span className="text-lg font-semibold text-primary">{t("language")}</span>
              <LanguageSwitcher />
            </div>
            <Link
              to={user ? "/account" : "/login"}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 border-t border-border/50 py-5 text-2xl font-semibold text-primary"
            >
              <User className="h-6 w-6" /> {user ? t("nav_my_account") : t("nav_signin_register")}
            </Link>
          </nav>

        </div>
      )}
    </>
  );
}
