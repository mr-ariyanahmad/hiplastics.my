import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  LogOut, Plus, Save, Trash2, Loader2, LayoutDashboard, Package, ShoppingBag, Tags,
  Factory, Images, FileDown, Newspaper, Settings as SettingsIcon, ServerCog, Menu,
  Search, Truck, CheckCircle2, RefreshCw, Download, X, Ticket, Star, Printer,
  PackageCheck, XCircle, PackagePlus, ClipboardCheck, Users, Mail, Phone as PhoneIcon,
} from "lucide-react";
import { adminListOrders, adminUpdateOrder, type OrderRow, type OrderItemRow } from "@/lib/shop.functions";
import { money } from "@/lib/cart";
import { useConfirm } from "@/components/ConfirmDialog";
import { normalizeMyPhone, waLinkForCustomer } from "@/lib/site";
import {
  adminLogin,
  verifyAdminToken,
  getSystemStatus,
} from "@/lib/cms.functions";
import {
  fetchAdminData,
  upsertRow,
  deleteRow,
  updateSettings,
  uploadMedia,
} from "@/lib/cms.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Hiplastics Malaysia" },
      { name: "description", content: "Secure Hiplastics Malaysia catalogue, order and delivery administration." },
      { property: "og:title", content: "Admin — Hiplastics Malaysia" },
      { property: "og:description", content: "Secure Hiplastics Malaysia catalogue, order and delivery administration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="grid min-h-screen place-items-center bg-surface p-6 text-center">
      <div>
        <h1 className="text-lg font-bold text-foreground">Admin could not load</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{String(error?.message ?? error)}</p>
        <button onClick={() => location.reload()} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button>
      </div>
    </div>
  ),
  component: AdminPage,
});

const TOKEN_KEY = "hp_admin_token";
type Session = { token: string; email: string };

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { key: "orders", label: "Orders", icon: ShoppingBag, group: "Sales" },
  { key: "deliveries", label: "Deliveries", icon: Truck, group: "Sales" },
  { key: "customers", label: "Customers", icon: Users, group: "Sales" },
  { key: "products", label: "Products", icon: Package, group: "Catalogue" },
  { key: "categories", label: "Categories", icon: Tags, group: "Catalogue" },
  { key: "industries", label: "Industries", icon: Factory, group: "Catalogue" },
  { key: "gallery", label: "Gallery", icon: Images, group: "Content" },
  { key: "downloads", label: "Downloads", icon: FileDown, group: "Content" },
  { key: "news", label: "News & Blog", icon: Newspaper, group: "Content" },
  { key: "coupons", label: "Coupons", icon: Ticket, group: "Sales" },
  { key: "reviews", label: "Reviews", icon: Star, group: "Sales" },
  { key: "invoice", label: "Invoice Settings", icon: Printer, group: "System" },
  { key: "settings", label: "Site Settings", icon: SettingsIcon, group: "System" },
  { key: "system", label: "System Status", icon: ServerCog, group: "System" },
] as const;
type TabKey = (typeof NAV)[number]["key"];
type FieldType = "text" | "number" | "bool" | "image" | "images" | "textarea" | "csv" | "select" | "date" | "color";
type Field = { key: string; label: string; type: FieldType; options?: string[] };

type CrudKey = "products" | "categories" | "industries" | "gallery" | "downloads" | "news" | "coupons" | "reviews";

const SCHEMAS: Record<CrudKey, { fields: Field[]; defaults: Record<string, unknown> }> = {
  products: {
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "name_ms", label: "Name (Bahasa Malaysia — optional, blank = use English)", type: "text" },
      { key: "slug", label: "Slug (URL key, unique)", type: "text" },
      { key: "category", label: "Category (pick from list)", type: "select" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "description_ms", label: "Description (Bahasa Malaysia — optional, blank = use English)", type: "textarea" },
      { key: "features", label: "Features (comma separated)", type: "csv" },
      { key: "features_ms", label: "Features (Bahasa Malaysia — optional, comma separated, blank = use English)", type: "csv" },
      { key: "price", label: "Price in MYR (e.g. 25.90)", type: "number" },
      { key: "sku", label: "SKU / product code", type: "text" },
      { key: "stock", label: "Stock quantity", type: "number" },
      { key: "is_purchasable", label: "Sellable online (show price + Add to cart)", type: "bool" },
      { key: "image_urls", label: "Product images (3–6 recommended, first one shows on card)", type: "images" },
      { key: "sort_order", label: "Sort order", type: "number" },
      { key: "is_featured", label: "Featured on homepage", type: "bool" },
      { key: "is_active", label: "Active (visible)", type: "bool" },
    ],
    // is_purchasable used to default to false, so a newly-created product
    // silently never showed "Add to cart" until the admin remembered to
    // flip a toggle — this is very likely why items disappeared from carts.
    // Defaulting to true (sellable as soon as it's active) matches what an
    // admin creating a product actually expects.
    defaults: { name: "", name_ms: "", slug: "", category: "", description: "", description_ms: "", features: [], features_ms: [], image_url: "", image_urls: [], price: 0, sku: "", stock: 0, is_purchasable: true, sort_order: 0, is_featured: false, is_active: true },
  },
  categories: {
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "slug", label: "Slug", type: "text" },
      { key: "description", label: "Description", type: "text" },
      { key: "image_url", label: "Image", type: "image" },
      { key: "sort_order", label: "Sort order", type: "number" },
      { key: "is_active", label: "Active", type: "bool" },
    ],
    defaults: { name: "", slug: "", description: "", image_url: "", sort_order: 0, is_active: true },
  },
  industries: {
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "icon", label: "Icon (ShoppingCart, Pill, Store, Cpu, Building2, Network)", type: "text" },
      { key: "image_url", label: "Image (optional)", type: "image" },
      { key: "sort_order", label: "Sort order", type: "number" },
      { key: "is_active", label: "Active", type: "bool" },
    ],
    defaults: { name: "", icon: "Store", image_url: "", sort_order: 0, is_active: true },
  },
  gallery: {
    fields: [
      { key: "label", label: "Label", type: "text" },
      { key: "image_url", label: "Image", type: "image" },
      { key: "sort_order", label: "Sort order", type: "number" },
      { key: "is_active", label: "Active", type: "bool" },
    ],
    defaults: { label: "", image_url: "", sort_order: 0, is_active: true },
  },
  downloads: {
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "size_label", label: "Size label (e.g. PDF · 1.2 MB)", type: "text" },
      { key: "file_url", label: "File (PDF or image)", type: "image" },
      { key: "sort_order", label: "Sort order", type: "number" },
      { key: "is_active", label: "Active", type: "bool" },
    ],
    defaults: { title: "", size_label: "", file_url: "", sort_order: 0, is_active: true },
  },
  news: {
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "slug", label: "Slug (URL key, unique)", type: "text" },
      { key: "excerpt", label: "Short excerpt", type: "textarea" },
      { key: "body", label: "Full content", type: "textarea" },
      { key: "image_url", label: "Cover image", type: "image" },
      { key: "published_at", label: "Published date (YYYY-MM-DD)", type: "text" },
      { key: "sort_order", label: "Sort order", type: "number" },
      { key: "is_active", label: "Active (visible)", type: "bool" },
    ],
    defaults: { title: "", slug: "", excerpt: "", body: "", image_url: "", published_at: new Date().toISOString().slice(0, 10), sort_order: 0, is_active: true },
  },
  coupons: {
    fields: [
      { key: "code", label: "Coupon code (e.g. WELCOME10)", type: "text" },
      { key: "discount_type", label: "Discount type", type: "select", options: ["percent", "fixed"] },
      { key: "discount_value", label: "Discount value (percent 0-100, or fixed MYR amount)", type: "number" },
      { key: "min_subtotal", label: "Minimum order subtotal to use (0 = no minimum)", type: "number" },
      { key: "max_uses", label: "Max total uses (0 = unlimited)", type: "number" },
      { key: "starts_at", label: "Starts at (optional — leave blank for immediately)", type: "date" },
      { key: "expires_at", label: "Expires at (optional — leave blank for never)", type: "date" },
      { key: "is_active", label: "Active", type: "bool" },
    ],
    defaults: { code: "", discount_type: "percent", discount_value: 10, min_subtotal: 0, max_uses: 0, starts_at: "", expires_at: "", is_active: true },
  },
  reviews: {
    fields: [
      { key: "product_slug", label: "Product slug", type: "text" },
      { key: "customer_name", label: "Customer name", type: "text" },
      { key: "customer_email", label: "Customer email", type: "text" },
      { key: "rating", label: "Rating (1-5)", type: "number" },
      { key: "comment", label: "Comment", type: "textarea" },
      { key: "is_approved", label: "Approved (visible on site)", type: "bool" },
    ],
    defaults: { product_slug: "", customer_name: "", customer_email: "", rating: 5, comment: "", is_approved: false },
  },
};


const SETTINGS_FIELDS: Field[] = [
  { key: "logo_url", label: "Logo (shown in header, footer & invoices)", type: "image" },
  { key: "name", label: "Company name", type: "text" },
  { key: "tagline", label: "Tagline (e.g. ECO LEAN ♥ SOUL)", type: "text" },
  { key: "phone", label: "Phone (shown big in footer)", type: "text" },
  { key: "whatsapp_number", label: "WhatsApp number (intl, digits only — e.g. 8618060555061)", type: "text" },
  { key: "whatsapp_display", label: "WhatsApp display number", type: "text" },
  { key: "email", label: "Email(s) — separate multiple with comma, e.g. a@x.com, b@x.com", type: "text" },
  { key: "address", label: "Address", type: "text" },
  { key: "business_hours", label: "Business hours", type: "text" },
  { key: "facebook_url", label: "Facebook URL", type: "text" },
  { key: "linkedin_url", label: "LinkedIn URL", type: "text" },
  { key: "instagram_url", label: "Instagram URL", type: "text" },
  { key: "youtube_url", label: "YouTube URL", type: "text" },
  { key: "wechat_url", label: "WeChat ID / link (optional)", type: "text" },
  { key: "wechat_qr_url", label: "WeChat QR image", type: "image" },
  { key: "whatsapp_qr_url", label: "WhatsApp QR image", type: "image" },
  { key: "hero_title", label: "Homepage hero title", type: "text" },
  { key: "hero_subtitle", label: "Homepage hero subtitle", type: "textarea" },
  { key: "hero_image_url", label: "Homepage hero image", type: "image" },
  { key: "hero_cta_label", label: "Homepage hero button label", type: "text" },
  { key: "company_reg_no", label: "Company registration no. (invoice)", type: "text" },
  { key: "currency", label: "Shop currency code (MYR)", type: "text" },
  { key: "shipping_flat", label: "Shipping — West Malaysia (MYR)", type: "number" },
  { key: "shipping_east", label: "Shipping — Sabah/Sarawak/Labuan (MYR)", type: "number" },
  { key: "free_shipping_over", label: "Free shipping when subtotal ≥ (0 = off)", type: "number" },
  { key: "sst_percent", label: "SST percent (e.g. 6)", type: "number" },
  { key: "cod_enabled", label: "Allow Cash on Delivery", type: "bool" },
  { key: "online_payment_enabled", label: "Allow online payment (ToyyibPay)", type: "bool" },
  { key: "about_html", label: "About Us page content", type: "textarea" },
  { key: "contact_html", label: "Contact page intro text", type: "textarea" },
];

/**
 * Everything that controls the printable order invoice, in one place —
 * previously this was hardcoded (fixed green-ish theme, no way to change
 * the accent color, footer text, or signature without editing code).
 */
const INVOICE_SETTINGS_FIELDS: Field[] = [
  { key: "logo_url", label: "Invoice logo (also used in header & footer)", type: "image" },
  { key: "invoice_accent_color", label: "Accent color (defaults to your site's button blue)", type: "color" },
  { key: "name", label: "Company name", type: "text" },
  { key: "address", label: "Company address", type: "text" },
  { key: "email", label: "Company email", type: "text" },
  { key: "phone", label: "Company phone", type: "text" },
  { key: "company_reg_no", label: "Company registration no.", type: "text" },
  { key: "invoice_signature_name", label: "Signed-off-by name (e.g. \"Hiplastics Team\")", type: "text" },
  { key: "invoice_footer_note", label: "Footer thank-you note", type: "textarea" },
];


const STATUSES = ["new", "processing", "shipped", "delivered", "completed", "cancelled"] as const;
const PAY_STATUSES = ["pending", "paid", "failed", "refunded"] as const;

/**
 * iOS-style toggle switch, used in place of plain checkboxes throughout
 * admin. The unchecked track used to be `bg-muted`, which is close enough to
 * white/background that OFF could read as ON at a glance. It's now a
 * visibly grey, bordered track when off, and the label sits in its own
 * block (not inline-flex crowding the button) so it can never visually
 * overlap the thumb on narrow screens.
 */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
          checked ? "border-primary bg-primary" : "border-border bg-secondary"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
      {label && <span className="min-w-0 flex-1 text-foreground">{label}</span>}
      <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide ${checked ? "text-primary" : "text-muted-foreground"}`}>
        {checked ? "On" : "Off"}
      </span>
    </label>
  );
}

function AdminPage() {
  const login = useServerFn(adminLogin);
  const verify = useServerFn(verifyAdminToken);
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!saved) { setChecking(false); return; }
    verify({ data: { token: saved } })
      .then((r) => { if (r.ok) setSession({ token: saved, email: r.email }); else window.localStorage.removeItem(TOKEN_KEY); })
      .catch(() => window.localStorage.removeItem(TOKEN_KEY))
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function signOut() {
    window.localStorage.removeItem(TOKEN_KEY);
    setSession(null);
  }

  if (checking) return <div className="grid min-h-screen place-items-center bg-surface"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!session)
    return (
      <LoginScreen
        onLogin={async (email, password) => {
          const r = await login({ data: { email, password } });
          if (!r.ok) return r.error;
          window.localStorage.setItem(TOKEN_KEY, r.token);
          setSession({ token: r.token, email: r.email });
          return null;
        }}
      />
    );
  return <Dashboard session={session} onSignOut={signOut} />;
}

function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<string | null> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { setErr(await onLogin(email, password)); }
    catch (e) { setErr(e instanceof Error ? e.message : "Login failed"); }
    setBusy(false);
  }
  return (
    <div className="grid min-h-screen place-items-center bg-[oklch(0.22_0.04_255)] p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl bg-card p-7 shadow-elevated">
        <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Hiplastics Malaysia</div>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Admin Console</h1>
        <p className="mt-1 text-xs text-muted-foreground">Sign in to manage catalogue, orders and deliveries.</p>
        <p className="mt-2 text-xs text-muted-foreground">The verified owner email receives admin access automatically on its first successful sign-in.</p>
        <div className="mt-6 space-y-3">
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm" />
          <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm" />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Sign in
          </button>
        </div>
      </form>
    </div>
  );
}

function Dashboard({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const load = useServerFn(fetchAdminData);
  const upsert = useServerFn(upsertRow);
  const remove = useServerFn(deleteRow);
  const saveSettings = useServerFn(updateSettings);
  const upload = useServerFn(uploadMedia);
  const listOrdersFn = useServerFn(adminListOrders);
  const confirmDialog = useConfirm();
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [navOpen, setNavOpen] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof load>> | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true); setErr(null);
    try {
      const [cms, ord] = await Promise.all([
        load({ data: { token: session.token } }),
        listOrdersFn({ data: { token: session.token } }).catch(() => ({ orders: [], items: [] })),
      ]);
      setData(cms);
      setOrders(ord.orders as OrderRow[]);
      setOrderItems(ord.items as OrderItemRow[]);
    } catch (e) { setErr(e instanceof Error ? e.message : "Load failed"); }
    setBusy(false);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  async function onUpload(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = ""; for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    const base64 = btoa(bin);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const res = await upload({ data: { token: session.token, path, contentType: file.type || "application/octet-stream", base64 } });
    return res.url;
  }

  const groups = Array.from(new Set(NAV.map((n) => n.group)));
  const current = NAV.find((n) => n.key === tab);

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto bg-[oklch(0.22_0.04_255)] text-white transition-transform lg:static lg:translate-x-0 ${navOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-14 items-center justify-between px-4">
          <span className="text-sm font-bold tracking-wide">Hiplastics Admin</span>
          <button className="lg:hidden" onClick={() => setNavOpen(false)} aria-label="Close menu"><X className="h-4 w-4" /></button>
        </div>
        <nav className="px-3 pb-8">
          {groups.map((g) => (
            <div key={g} className="mt-4">
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{g}</div>
              {NAV.filter((n) => n.group === g).map((n) => (
                <button
                  key={n.key}
                  onClick={() => { setTab(n.key); setNavOpen(false); }}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors ${tab === n.key ? "bg-primary text-primary-foreground" : "text-white/75 hover:bg-white/10"}`}
                >
                  <n.icon className="h-4 w-4 shrink-0" /> <span className="truncate">{n.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      {navOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setNavOpen(false)} />}

      {/* Main */}
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card px-4">
          <button className="lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <h1 className="min-w-0 truncate text-sm font-bold text-foreground">{current?.label}</h1>
          <div className="ml-auto flex shrink-0 items-center gap-2 text-xs">
            <button onClick={refresh} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 font-semibold hover:bg-secondary">
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">Refresh</span>
            </button>
            <span className="hidden text-muted-foreground md:inline">{session.email}</span>
            <button onClick={onSignOut} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 font-semibold hover:bg-secondary">
              <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          {err && <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{err}</div>}
          {busy && !data && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}

          {tab === "dashboard" && <Overview orders={orders} products={(data?.products ?? []) as unknown as Record<string, unknown>[]} onGoto={setTab} />}

          {(tab === "orders" || tab === "deliveries") && (
            <OrdersPanel
              token={session.token}
              mode={tab}
              orders={orders}
              items={orderItems}
              onChanged={refresh}
            />
          )}

          {tab === "customers" && <CustomersPanel orders={orders} />}

          {data && (["products", "categories", "industries", "gallery", "downloads", "news", "coupons", "reviews"] as CrudKey[]).includes(tab as CrudKey) && (
            <CrudTable
              tab={tab as CrudKey}
              rows={(data[tab as CrudKey] as unknown as Record<string, unknown>[]) ?? []}
              categoryOptions={(data.categories ?? []).map((c) => c.name)}
              onSave={async (row) => {
                try { await upsert({ data: { token: session.token, table: tab as CrudKey, row } }); await refresh(); toast.success("Saved."); }
                catch (e) { toast.error(e instanceof Error ? e.message : "Could not save — please try again."); }
              }}
              onDelete={async (id) => {
                const ok = await confirmDialog({ title: "Delete this item?", description: "This can't be undone.", confirmLabel: "Delete", destructive: true });
                if (!ok) return;
                try { await remove({ data: { token: session.token, table: tab as CrudKey, id } }); await refresh(); toast.success("Deleted."); }
                catch (e) { toast.error(e instanceof Error ? e.message : "Could not delete — please try again."); }
              }}
              onUpload={onUpload}
            />
          )}

          {data && tab === "settings" && (
            <SettingsForm
              initial={(data.settings as unknown as Record<string, unknown>) ?? { id: 1 }}
              onUpload={onUpload}
              onSave={async (patch) => {
                try { await saveSettings({ data: { token: session.token, patch } }); await refresh(); toast.success("Settings saved."); }
                catch (e) { toast.error(e instanceof Error ? e.message : "Could not save settings — please try again."); }
              }}
            />
          )}

          {data && tab === "invoice" && (
            <SettingsForm
              title="Invoice settings"
              fields={INVOICE_SETTINGS_FIELDS}
              initial={(data.settings as unknown as Record<string, unknown>) ?? { id: 1 }}
              onUpload={onUpload}
              onSave={async (patch) => {
                try { await saveSettings({ data: { token: session.token, patch } }); await refresh(); toast.success("Invoice settings saved."); }
                catch (e) { toast.error(e instanceof Error ? e.message : "Could not save settings — please try again."); }
              }}
            />
          )}

          {tab === "system" && <SystemPanel token={session.token} />}
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Overview({ orders, products, onGoto }: { orders: OrderRow[]; products: Record<string, unknown>[]; onGoto: (t: TabKey) => void }) {
  // "Paid revenue" must never include cancelled orders, even if payment_status
  // was left as "paid" (e.g. cancelled after payment, before refund is logged).
  const paid = orders.filter((o) => o.payment_status === "paid" && o.status !== "cancelled");
  const revenue = paid.reduce((s, o) => s + Number(o.total || 0), 0);
  const pending = orders.filter((o) => o.payment_status === "pending" && o.status !== "cancelled");
  const cancelled = orders.filter((o) => o.status === "cancelled");
  const refunded = orders.filter((o) => o.payment_status === "refunded");
  const codOrders = orders.filter((o) => o.payment_method === "cod");
  const codCollected = codOrders.filter((o) => ["delivered", "completed"].includes(o.status));
  // Delivery fee actually collected: paid online orders + COD orders that were delivered.
  const deliveryCollected = [...paid, ...codCollected.filter((o) => o.payment_method === "cod" && o.payment_status !== "paid")]
    .reduce((s, o) => s + Number(o.shipping || 0), 0);
  const toShip = orders.filter((o) => ["new", "processing"].includes(o.status)).length;
  const lowStock = products.filter((p) => p.is_purchasable && Number(p.stock ?? 0) <= 5);

  const sum = (arr: OrderRow[]) => arr.reduce((s, o) => s + Number(o.total || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Paid revenue" value={money(revenue)} hint={`${paid.length} paid orders`} />
        <StatCard label="Total orders" value={String(orders.length)} hint={`${pending.length} awaiting payment`} />
        <StatCard label="To fulfil" value={String(toShip)} hint="new + processing" />
        <StatCard label="Products live" value={String(products.filter((p) => p.is_active !== false).length)} hint={`${products.length} total`} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-bold text-foreground">Revenue & order breakdown</div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Paid", count: paid.length, amount: sum(paid), tone: "text-primary" },
            { label: "Pending", count: pending.length, amount: sum(pending), tone: "text-amber-600" },
            { label: "Cancelled", count: cancelled.length, amount: sum(cancelled), tone: "text-destructive" },
            { label: "Refunded", count: refunded.length, amount: sum(refunded), tone: "text-destructive" },
            { label: "COD orders", count: codOrders.length, amount: sum(codOrders), tone: "text-foreground" },
            { label: "Delivery fee collected", count: null, amount: deliveryCollected, tone: "text-foreground" },
          ].map((c) => (
            <div key={c.label} className="p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</div>
              <div className={`mt-1 text-lg font-bold ${c.tone}`}>{money(c.amount)}</div>
              {c.count !== null && <div className="text-[11px] text-muted-foreground">{c.count} order(s)</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold text-foreground">Recent orders</h2>
          <button onClick={() => onGoto("orders")} className="text-xs font-semibold text-primary">View all</button>
        </div>
        {orders.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {orders.slice(0, 6).map((o) => (
              <div key={o.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-foreground">{o.order_no} · {o.customer_name}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleString()} · {o.payment_method} · {o.status}</div>
                </div>
                <div className="shrink-0 font-bold text-foreground">{money(o.total, o.currency)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 text-sm font-bold text-foreground">Low stock alert</div>
          <div className="divide-y divide-border">
            {lowStock.slice(0, 8).map((p) => (
              <div key={String(p.id)} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="truncate text-foreground">{String(p.name)}</span>
                <span className="shrink-0 font-semibold text-destructive">{String(p.stock ?? 0)} left</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function statusPillActiveCls(s: string) {
  if (s === "cancelled") return "bg-destructive text-white";
  if (s === "completed") return "bg-primary text-primary-foreground";
  return "bg-foreground text-background";
}

const STATUS_FLOW = ["new", "processing", "shipped", "delivered", "completed"] as const;
const STATUS_ICON: Record<string, typeof PackagePlus> = {
  new: PackagePlus,
  processing: RefreshCw,
  shipped: Truck,
  delivered: PackageCheck,
  completed: ClipboardCheck,
};

/**
 * Customer directory, derived client-side from existing order records —
 * no new table/query needed. Groups orders by email so repeat customers
 * are easy to spot, with lifetime spend and a quick WhatsApp/email link.
 */
function CustomersPanel({ orders }: { orders: OrderRow[] }) {
  const [q, setQ] = useState("");

  const customers = useMemo(() => {
    const byEmail = new Map<string, {
      email: string; name: string; phone: string; orderCount: number; totalSpent: number; lastOrderAt: string;
    }>();
    for (const o of orders) {
      const email = (o.customer_email || "").toLowerCase().trim();
      if (!email) continue;
      const existing = byEmail.get(email);
      const spend = o.payment_status === "paid" || o.payment_method === "cod" ? Number(o.total) || 0 : 0;
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += spend;
        if (new Date(o.created_at) > new Date(existing.lastOrderAt)) {
          existing.lastOrderAt = o.created_at;
          existing.name = o.customer_name;
          existing.phone = o.customer_phone;
        }
      } else {
        byEmail.set(email, {
          email, name: o.customer_name, phone: o.customer_phone,
          orderCount: 1, totalSpent: spend, lastOrderAt: o.created_at,
        });
      }
    }
    return Array.from(byEmail.values()).sort((a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime());
  }, [orders]);

  const filtered = customers.filter((c) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return c.name.toLowerCase().includes(needle) || c.email.includes(needle) || c.phone.includes(needle);
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Customers</h2>
          <p className="text-xs text-muted-foreground">{customers.length} customer{customers.length === 1 ? "" : "s"} from order history</p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone…"
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3 text-center">Orders</th>
              <th className="px-4 py-3 text-right">Lifetime spend</th>
              <th className="px-4 py-3">Last order</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.email} className="border-b border-border last:border-0 hover:bg-secondary/40">
                <td className="px-4 py-3 font-semibold text-foreground">{c.name}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {c.email}</div>
                  <div className="mt-0.5 flex items-center gap-1.5"><PhoneIcon className="h-3 w-3" /> {c.phone}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${c.orderCount > 1 ? "bg-primary/10 text-primary" : "bg-secondary text-foreground"}`}>
                    {c.orderCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-foreground">{money(c.totalSpent)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.lastOrderAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={waLinkForCustomer(c.phone, `Hi ${c.name}, `)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    WhatsApp
                  </a>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No customers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrdersPanel({ token, mode, orders, items, onChanged }: {
  token: string;
  mode: "orders" | "deliveries";
  orders: OrderRow[];
  items: OrderItemRow[];
  onChanged: () => void | Promise<void>;
}) {
  const update = useServerFn(adminUpdateOrder);
  const [open, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [saving, setSaving] = useState<string | null>(null);

  const rows = useMemo(() => {
    const base = mode === "deliveries" ? orders.filter((o) => o.payment_status === "paid" || o.payment_method === "cod") : orders;
    const needle = q.trim().toLowerCase();
    return base.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (!needle) return true;
      return [o.order_no, o.customer_name, o.customer_phone, o.customer_email, o.tracking_number]
        .some((f) => String(f ?? "").toLowerCase().includes(needle));
    });
  }, [orders, mode, q, status]);

  const statusCounts = useMemo(() => {
    const base = mode === "deliveries" ? orders.filter((o) => o.payment_status === "paid" || o.payment_method === "cod") : orders;
    const counts: Record<string, number> = { all: base.length };
    for (const s of STATUSES) counts[s] = base.filter((o) => o.status === s).length;
    return counts;
  }, [orders, mode]);

  async function patch(id: string, p: Record<string, unknown>) {
    setSaving(id);
    try {
      const res = await update({ data: { token, id, ...p } });
      // The server fn used to be trusted blindly — if it ever returned an
      // ok:false shape or threw, the admin saw nothing happen at all (this
      // is very likely why "cancel" sometimes appeared to do nothing).
      if (res && typeof res === "object" && "ok" in res && (res as { ok: boolean }).ok === false) {
        throw new Error((res as { error?: string }).error || "Update was rejected by the server.");
      }
      await onChanged();
      toast.success("Order updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update the order — please try again.");
    } finally {
      setSaving(null);
    }
  }

  function exportCsv() {
    const head = ["order_no", "date", "customer", "phone", "email", "state", "payment", "payment_status", "status", "courier", "tracking", "total"];
    const body = rows.map((o) => [o.order_no, o.created_at, o.customer_name, o.customer_phone, o.customer_email, o.state, o.payment_method, o.payment_status, o.status, o.courier ?? "", o.tracking_number ?? "", o.total].map(csvEscape).join(","));
    const blob = new Blob([[head.join(","), ...body].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hiplastics-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const badge = (t: string) =>
    t === "paid" || t === "completed" || t === "delivered" ? "bg-primary/10 text-primary"
      : t === "failed" || t === "cancelled" ? "bg-destructive/10 text-destructive"
      : "bg-secondary text-muted-foreground";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order no, name, phone, tracking…" className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm sm:w-80" />
        </div>
        <button onClick={exportCsv} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <button
          onClick={() => setStatus("all")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${status === "all" ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
        >
          All <span className="ml-1 opacity-70">{statusCounts.all}</span>
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
              status === s ? statusPillActiveCls(s) : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {s} <span className="ml-1 opacity-70">{statusCounts[s]}</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {rows.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No orders match.</div>}
        {rows.map((o) => (
          <div key={o.id} className="border-b border-border last:border-b-0">
            <div className="flex flex-wrap items-center gap-2.5 p-3">
              <button onClick={() => setOpenId(open === o.id ? null : o.id)} className="text-sm font-semibold text-foreground underline-offset-2 hover:underline">
                {o.order_no}
              </button>
              <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>
              <span className="min-w-0 truncate text-xs text-muted-foreground">{o.customer_name} · {o.customer_phone}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badge(o.payment_status)}`}>{o.payment_method} · {o.payment_status}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badge(o.status)}`}>{o.status}</span>
              <span className="ml-auto text-sm font-bold text-foreground">{money(o.total, o.currency)}</span>
              {saving === o.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {open === o.id && (
              <div className="space-y-4 border-t border-border bg-surface p-4 text-xs">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="font-bold text-foreground">Deliver to</div>
                    <p className="mt-1 leading-relaxed text-muted-foreground">
                      {o.customer_name}<br />
                      {o.address1} {o.address2}<br />
                      {o.postcode} {o.city}, {o.state}<br />
                      {o.customer_phone} · {o.customer_email}
                    </p>
                    {o.notes && <p className="mt-2 text-muted-foreground"><strong>Customer notes:</strong> {o.notes}</p>}
                  </div>
                  <div>
                    <div className="font-bold text-foreground">Items</div>
                    <table className="mt-1 w-full">
                      <tbody>
                        {items.filter((i) => i.order_id === o.id).map((i) => (
                          <tr key={i.id} className="border-b border-border/60">
                            <td className="py-1.5">{i.name}</td>
                            <td className="py-1.5 text-center">× {i.qty}</td>
                            <td className="py-1.5 text-right">{money(i.line_total, o.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-2 space-y-0.5 text-right text-foreground">
                      <div>Product total: {money(o.subtotal, o.currency)}</div>
                      <div>Delivery fee: {money(o.shipping, o.currency)}</div>
                      <div>SST: {money(o.tax, o.currency)}</div>
                      {Number((o as unknown as { discount?: number }).discount ?? 0) > 0 && (
                        <div className="text-primary">Discount: −{money((o as unknown as { discount?: number }).discount ?? 0, o.currency)}</div>
                      )}
                      <div className="border-t border-border pt-1 font-bold"><strong>Grand total: {money(o.total, o.currency)}</strong></div>
                    </div>
                    <div className="mt-1.5 text-[11px] font-semibold uppercase">
                      {o.payment_status === "paid" && o.status !== "cancelled" && <span className="text-primary">Counted in paid revenue</span>}
                      {o.status === "cancelled" && <span className="text-destructive">Cancelled — excluded from revenue</span>}
                      {o.payment_status === "refunded" && <span className="text-destructive">Refunded — excluded from revenue</span>}
                    </div>
                  </div>
                </div>

                <DeliveryForm order={o} onSave={(p) => patch(o.id, p)} />

                <OrderStatusStepper status={o.status} onSet={(s) => patch(o.id, { status: s })} disabled={saving === o.id} />
                <PaymentStatusPicker status={o.payment_status} onSet={(s) => patch(o.id, { payment_status: s })} disabled={saving === o.id} />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={`/order/${o.order_no}?t=${o.access_token}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 font-semibold text-foreground hover:bg-secondary"
                  >
                    <Printer className="h-3.5 w-3.5" /> View / Print Invoice
                  </a>
                  <a
                    href={`https://wa.me/${normalizeMyPhone(String(o.customer_phone))}?text=${encodeURIComponent(
                      `Hi ${o.customer_name}, update on your Hiplastics order ${o.order_no}: status is now "${o.status}".${o.tracking_number ? ` Tracking: ${o.courier ?? ""} ${o.tracking_number}` : ""}`,
                    )}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> WhatsApp customer
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderStatusStepper({ status, onSet, disabled }: { status: string; onSet: (s: string) => void; disabled: boolean }) {
  const confirmDialog = useConfirm();
  const isCancelled = status === "cancelled";
  const currentIdx = STATUS_FLOW.indexOf(status as (typeof STATUS_FLOW)[number]);
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Order status</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FLOW.map((s, i) => {
          const Icon = STATUS_ICON[s];
          const done = !isCancelled && i < currentIdx;
          const current = !isCancelled && i === currentIdx;
          return (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => onSet(s)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors disabled:opacity-60 ${
                current
                  ? "bg-primary text-primary-foreground"
                  : done
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {s}
            </button>
          );
        })}
        {!isCancelled ? (
          <button
            type="button"
            disabled={disabled}
            onClick={async () => {
              const ok = await confirmDialog({
                title: "Cancel this order?",
                description: "The customer will need to be informed separately.",
                confirmLabel: "Cancel order",
                cancelLabel: "Keep order",
                destructive: true,
              });
              if (ok) onSet("cancelled");
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-60"
          >
            <XCircle className="h-3.5 w-3.5" /> Cancel order
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-white">
            <XCircle className="h-3.5 w-3.5" /> Cancelled
          </span>
        )}
      </div>
    </div>
  );
}

function PaymentStatusPicker({ status, onSet, disabled }: { status: string; onSet: (s: string) => void; disabled: boolean }) {
  const cls = (s: string) => {
    if (status !== s) return "bg-secondary text-muted-foreground hover:text-foreground";
    if (s === "paid") return "bg-primary text-primary-foreground";
    if (s === "failed") return "bg-destructive text-white";
    if (s === "refunded") return "bg-foreground text-background";
    return "bg-amber-500 text-white";
  };
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Payment</div>
      <div className="flex flex-wrap gap-1.5">
        {PAY_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onSet(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors disabled:opacity-60 ${cls(s)}`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function DeliveryForm({ order, onSave }: { order: OrderRow; onSave: (p: Record<string, unknown>) => Promise<void> }) {
  const [courier, setCourier] = useState(order.courier ?? "");
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [url, setUrl] = useState(order.tracking_url ?? "");
  const [note, setNote] = useState(order.delivery_note ?? "");
  const [busy, setBusy] = useState(false);
  const cls = "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs";
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground"><Truck className="h-3.5 w-3.5" /> Delivery</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Courier (J&T, Pos Laju, DHL…)" className={cls} />
        <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" className={cls} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Tracking URL (optional)" className={cls} />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Delivery note for customer" className={cls} />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try { await onSave({ courier, tracking_number: tracking, tracking_url: url, delivery_note: note }); }
          finally { setBusy(false); }
        }}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save delivery
      </button>
    </div>
  );
}

function SystemPanel({ token }: { token: string }) {
  const status = useServerFn(getSystemStatus);
  const [s, setS] = useState<Awaited<ReturnType<typeof status>> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    status({ data: { token } }).then(setS).catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const Row = ({ label, ok, note }: { label: string; ok: boolean; note?: string }) => (
    <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm last:border-b-0">
      <span className="text-foreground">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ok ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
        {ok ? "OK" : "Missing"}{note ? ` · ${note}` : ""}
      </span>
    </div>
  );
  return (
    <div className="max-w-2xl space-y-4">
      {err && <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{err}</div>}
      {!s ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3 text-sm font-bold text-foreground">Integrations</div>
            <Row label="Database URL" ok={s.supabase_url} />
            <Row label="Database service key" ok={s.supabase_service_key} />
            <Row label="ToyyibPay secret key" ok={s.toyyibpay_secret} />
            <Row label="ToyyibPay category code" ok={s.toyyibpay_category} />
            <Row label="ToyyibPay mode" ok={true} note={s.toyyibpay_sandbox ? "sandbox" : "live"} />
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">Payment callback URL (paste in ToyyibPay if asked):</p>
            <code className="mt-1 block break-all rounded bg-surface p-2">{s.app_base_url}/api/public/toyyibpay-callback</code>
            <p className="mt-2">Return URL is set automatically per bill. Payment is always re-verified with ToyyibPay before an order is marked paid.</p>
          </div>
        </>
      )}
    </div>
  );
}

function CrudTable({ tab, rows, categoryOptions, onSave, onDelete, onUpload }: {
  tab: CrudKey;
  rows: Record<string, unknown>[];
  categoryOptions: string[];
  onSave: (row: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpload: (f: File) => Promise<string>;
}) {

  const schema = SCHEMAS[tab];
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground capitalize">{tab}</h2>
        <button onClick={() => setEditing({ ...schema.defaults })} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> Add new
        </button>
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        {rows.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No rows yet.</div>}
        {rows.map((r) => {
          const id = String(r.id ?? "");
          const title = tab === "reviews" ? `${String(r.customer_name ?? "Anonymous")} — ${String(r.product_slug ?? "")}` : String(r.name ?? r.label ?? r.title ?? r.code ?? id);
          const imgs = Array.isArray(r.image_urls) ? (r.image_urls as string[]) : [];
          const img = (imgs[0] ?? r.image_url ?? r.file_url) as string | undefined;
          const meta = tab === "coupons"
            ? `${r.discount_type === "fixed" ? money(Number(r.discount_value || 0)) : `${r.discount_value}%`} off · used ${r.used_count ?? 0}${Number(r.max_uses || 0) > 0 ? `/${r.max_uses}` : ""} · ${r.is_active === false ? "Inactive" : "Active"}`
            : tab === "reviews"
            ? `${"★".repeat(Math.max(0, Math.min(5, Number(r.rating ?? 0))))}${"☆".repeat(5 - Math.max(0, Math.min(5, Number(r.rating ?? 0))))} · ${r.is_approved ? "Approved" : "Pending review"}${r.comment ? ` — "${String(r.comment).slice(0, 60)}${String(r.comment).length > 60 ? "…" : ""}"` : ""}`
            : `${r.is_active === false ? "Hidden" : "Active"} · order ${String(r.sort_order ?? 0)}`;
          return (
            <div key={id} className="flex items-center gap-3 border-b border-border p-3 last:border-b-0">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-sm border border-border bg-surface">
                {img && <img src={img} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{title}</div>
                <div className="text-xs text-muted-foreground">{meta}</div>
              </div>
              <button onClick={() => setEditing({ ...r })} className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary">Edit</button>
              {tab === "reviews" && !r.is_approved && (
                <button onClick={() => onSave({ ...r, is_approved: true })} className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">Approve</button>
              )}
              <button onClick={() => onDelete(id)} className="rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          );
        })}
      </div>
      {editing && tab === "products" && (
        <ProductEditor
          row={editing}
          categoryOptions={categoryOptions}
          onClose={() => setEditing(null)}
          onUpload={onUpload}
          onSave={async (row) => { await onSave(row); setEditing(null); }}
        />
      )}
      {editing && tab !== "products" && (
        <EditDialog
          fields={schema.fields}
          row={editing}
          categoryOptions={categoryOptions}
          onClose={() => setEditing(null)}
          onUpload={onUpload}
          onSave={async (row) => { await onSave(row); setEditing(null); }}
        />
      )}

    </div>
  );
}

/* ---------------- Shopee-style product editor ---------------- */

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ProductEditor({ row, categoryOptions, onClose, onSave, onUpload }: {
  row: Record<string, unknown>;
  categoryOptions: string[];
  onClose: () => void;
  onSave: (row: Record<string, unknown>) => Promise<void>;
  onUpload: (f: File) => Promise<string>;
}) {
  const [v, setV] = useState<Record<string, unknown>>(row);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const set = (k: string, val: unknown) => setV((p) => ({ ...p, [k]: val }));

  const images = (Array.isArray(v.image_urls) ? (v.image_urls as string[]) : []).filter(Boolean);
  const setImages = (arr: string[]) => setV((p) => ({ ...p, image_urls: arr, image_url: arr[0] ?? "" }));

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const next = [...images];
    for (const f of Array.from(files)) {
      if (next.length >= 6) break;
      try { next.push(await onUpload(f)); } catch (e) { setErr(e instanceof Error ? e.message : "Upload failed"); }
    }
    setImages(next);
    setUploading(false);
  }

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= images.length) return;
    const copy = [...images];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setImages(copy);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!String(v.name ?? "").trim()) { setErr("Product name is required."); return; }
    if (!String(v.category ?? "").trim()) { setErr("Please pick a category."); return; }
    if (images.length === 0) { setErr("Add at least one product photo."); return; }
    setBusy(true); setErr(null);
    const payload = { ...v, slug: String(v.slug ?? "").trim() || slugify(String(v.name)) };
    try { await onSave(payload); } catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
    setBusy(false);
  }

  const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  const labelCls = "mb-1 block text-xs font-semibold text-foreground";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-0 sm:p-6" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="min-h-full w-full max-w-3xl bg-surface sm:min-h-0 sm:rounded-lg"
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:rounded-t-lg">
          <div>
            <h3 className="text-base font-bold text-foreground">{v.id ? "Edit product" : "Add new product"}</h3>
            <p className="text-[11px] text-muted-foreground">Photos, basic info, sales info & shipping</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold">Cancel</button>
            <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </button>
          </div>
        </div>

        <div className="space-y-3 p-3 sm:p-4">
          {/* Product media */}
          <section className="rounded-md border border-border bg-card p-4">
            <h4 className="text-sm font-bold text-foreground">Product Media</h4>
            <p className="mb-3 text-[11px] text-muted-foreground">Add 3–6 photos. The first photo is the cover shown on cards. Drag order with the arrows.</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((src, i) => (
                <div key={`${src}-${i}`} className="relative aspect-square overflow-hidden rounded-md border border-border bg-white">
                  <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-contain p-1" />
                  {i === 0 && <span className="absolute left-1 top-1 rounded bg-primary px-1 text-[9px] font-bold text-primary-foreground">COVER</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-foreground/70 p-0.5">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-[10px] font-bold text-background disabled:opacity-30">◀</button>
                    <button type="button" onClick={() => setImages(images.filter((_, x) => x !== i))} className="px-1 text-[10px] font-bold text-background">✕</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="px-1 text-[10px] font-bold text-background disabled:opacity-30">▶</button>
                  </div>
                </div>
              ))}
              {images.length < 6 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border text-primary hover:bg-secondary">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                  <span className="text-[10px] font-semibold">Add Photo</span>
                  <span className="text-[10px] text-muted-foreground">{images.length}/6</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => { await addFiles(e.target.files); e.target.value = ""; }} />
                </label>
              )}
            </div>
          </section>

          {/* Basic information */}
          <section className="space-y-3 rounded-md border border-border bg-card p-4">
            <h4 className="text-sm font-bold text-foreground">Basic Information</h4>
            <div>
              <label className={labelCls}>Product name *</label>
              <input
                className={inputCls}
                maxLength={120}
                value={String(v.name ?? "")}
                onChange={(e) => {
                  const name = e.target.value;
                  setV((p) => ({ ...p, name, slug: p.id ? p.slug : slugify(name) }));
                }}
                placeholder="e.g. ESL Rail 1200mm White"
              />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">{String(v.name ?? "").length}/120</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Category *</label>
                <select className={inputCls} value={String(v.category ?? "")} onChange={(e) => set("category", e.target.value)}>
                  <option value="">Select category…</option>
                  {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  {String(v.category ?? "") && !categoryOptions.includes(String(v.category)) && (
                    <option value={String(v.category)}>{String(v.category)}</option>
                  )}
                </select>
                {categoryOptions.length === 0 && (
                  <p className="mt-1 text-[11px] text-muted-foreground">No categories yet — create them in the Categories tab.</p>
                )}
              </div>
              <div>
                <label className={labelCls}>URL slug</label>
                <input className={inputCls} value={String(v.slug ?? "")} onChange={(e) => set("slug", slugify(e.target.value))} placeholder="esl-rail-1200mm" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea rows={5} className={inputCls} value={String(v.description ?? "")} onChange={(e) => set("description", e.target.value)} placeholder="Material, sizes, compatibility, packing details…" />
            </div>
            <div>
              <label className={labelCls}>Key features (comma separated)</label>
              <input
                className={inputCls}
                value={(Array.isArray(v.features) ? (v.features as string[]) : []).join(", ")}
                onChange={(e) => set("features", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                placeholder="Snap-fit install, Anti-glare, Bulk pack"
              />
            </div>
          </section>

          {/* Sales information */}
          <section className="space-y-3 rounded-md border border-border bg-card p-4">
            <h4 className="text-sm font-bold text-foreground">Sales Information</h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Price (MYR)</label>
                <input type="number" step="0.01" min="0" className={inputCls} value={String(v.price ?? 0)} onChange={(e) => set("price", Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>Stock</label>
                <input type="number" min="0" className={inputCls} value={String(v.stock ?? 0)} onChange={(e) => set("stock", Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>SKU / code</label>
                <input className={inputCls} value={String(v.sku ?? "")} onChange={(e) => set("sku", e.target.value)} />
              </div>
            </div>
            <Toggle checked={!!v.is_purchasable} onChange={(val) => set("is_purchasable", val)} label="Sell online (shows price and Add to cart)" />
          </section>

          {/* Visibility */}
          <section className="space-y-3 rounded-md border border-border bg-card p-4">
            <h4 className="text-sm font-bold text-foreground">Visibility</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle checked={v.is_active !== false} onChange={(val) => set("is_active", val)} label="Active (visible on website)" />
              <Toggle checked={!!v.is_featured} onChange={(val) => set("is_featured", val)} label="Featured on homepage" />
              <div>
                <label className={labelCls}>Sort order</label>
                <input type="number" className={inputCls} value={String(v.sort_order ?? 0)} onChange={(e) => set("sort_order", Number(e.target.value))} />
              </div>
            </div>
          </section>

          {err && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{err}</p>}
        </div>
      </form>
    </div>
  );
}

function EditDialog({ fields, row, categoryOptions, onClose, onSave, onUpload }: {
  fields: Field[];
  row: Record<string, unknown>;
  categoryOptions: string[];
  onClose: () => void;
  onSave: (row: Record<string, unknown>) => Promise<void>;
  onUpload: (f: File) => Promise<string>;
}) {
  const [v, setV] = useState<Record<string, unknown>>(row);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { await onSave(v); } catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
    setBusy(false);
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg bg-card p-5 shadow-elevated">
        <h3 className="text-base font-bold text-foreground">{v.id ? "Edit" : "New"} item</h3>
        <div className="mt-4 space-y-3">
          {fields.map((f) => {
            const opts = f.key === "category" ? categoryOptions : f.options;
            return (
              <FieldInput key={f.key} field={{ ...f, options: opts }} value={v[f.key]} onChange={(nv) => setV({ ...v, [f.key]: nv })} onUpload={onUpload} />
            );
          })}
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-xs font-semibold">Cancel</button>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldInput({ field, value, onChange, onUpload }: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
  onUpload: (f: File) => Promise<string>;
}) {
  const cls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  if (field.type === "date") {
    // Native date input: the browser guarantees the value is either "" or a
    // valid YYYY-MM-DD, so a malformed date can never reach the server.
    const dateVal = typeof value === "string" && value ? value.slice(0, 10) : "";
    return (
      <div>
        <label className="mb-1 block text-xs font-semibold text-foreground">{field.label}</label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateVal}
            onChange={(e) => onChange(e.target.value || null)}
            className={cls}
          />
          {dateVal && (
            <button type="button" onClick={() => onChange(null)} className="shrink-0 rounded-md border border-border px-2.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary">
              Clear
            </button>
          )}
        </div>
      </div>
    );
  }
  if (field.type === "bool") {
    return <Toggle checked={!!value} onChange={onChange} label={field.label} />;
  }
  if (field.type === "color") {
    const v = typeof value === "string" && value ? value : "#1d4ed8";
    return (
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-foreground">{field.label}</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={v}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-14 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
          />
          <input
            type="text"
            value={v}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#1d4ed8"
            className={cls}
          />
        </div>
      </div>
    );
  }
  if (field.type === "image") {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-foreground">{field.label}</label>
        <div className="flex items-center gap-3 rounded-md border border-dashed border-border bg-surface p-3">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-white">
            {typeof value === "string" && value ? (
              <img src={value} alt="" className="h-full w-full object-cover" />
            ) : (
              <Images className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-glow">
              <Plus className="h-3.5 w-3.5" /> Upload image
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const url = await onUpload(f);
                  onChange(url);
                }}
              />
            </label>
            <p className="text-[10px] text-muted-foreground">or paste an image URL below</p>
            <input type="text" placeholder="https://…" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={cls + " text-xs"} />
          </div>
        </div>
      </div>
    );
  }
  if (field.type === "images") {
    const arr = Array.isArray(value) ? (value as string[]).filter(Boolean) : [];
    const move = (idx: number, dir: -1 | 1) => {
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return;
      const copy = [...arr];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      onChange(copy);
    };
    const remove = (idx: number) => onChange(arr.filter((_, i) => i !== idx));
    const addFiles = async (files: FileList | null) => {
      if (!files || !files.length) return;
      const next = [...arr];
      for (const f of Array.from(files)) {
        if (next.length >= 6) break;
        try {
          const url = await onUpload(f);
          next.push(url);
        } catch (e) {
          console.error("Upload failed", e);
        }
      }
      onChange(next);
    };
    return (
      <div>
        <label className="mb-1 block text-xs font-semibold text-foreground">{field.label}</label>
        {arr.length > 0 && (
          <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {arr.map((src, idx) => (
              <div key={`${src}-${idx}`} className="relative aspect-square overflow-hidden rounded-md border border-border bg-white">
                <img src={src} alt={`img-${idx + 1}`} className="h-full w-full object-contain p-1" />
                <span className="absolute left-1 top-1 rounded bg-foreground/70 px-1 text-[10px] font-semibold text-background">{idx + 1}</span>
                <div className="absolute inset-x-0 bottom-0 flex justify-between gap-0.5 bg-foreground/70 p-0.5">
                  <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="rounded px-1 text-[10px] font-bold text-background disabled:opacity-30">◀</button>
                  <button type="button" onClick={() => remove(idx)} className="rounded px-1 text-[10px] font-bold text-background hover:text-destructive">✕</button>
                  <button type="button" onClick={() => move(idx, 1)} disabled={idx === arr.length - 1} className="rounded px-1 text-[10px] font-bold text-background disabled:opacity-30">▶</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={arr.length >= 6}
          onChange={async (e) => {
            await addFiles(e.target.files);
            e.target.value = "";
          }}
          className="text-xs"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {arr.length} of 6 images · {arr.length < 3 ? "add at least 3 for a proper gallery" : "looks good"}. First image shows on product card.
        </p>
      </div>
    );
  }
  if (field.type === "csv") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div>
        <label className="mb-1 block text-xs font-semibold text-foreground">{field.label}</label>
        <input type="text" value={arr.join(", ")} onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className={cls} />
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div>
        <label className="mb-1 block text-xs font-semibold text-foreground">{field.label}</label>
        <textarea rows={4} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={cls} />
      </div>
    );
  }
  if (field.type === "select") {
    const opts = field.options ?? [];
    return (
      <div>
        <label className="mb-1 block text-xs font-semibold text-foreground">{field.label}</label>
        <input
          list={`opts-${field.key}`}
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={opts.length ? "Pick or type…" : "Type a category"}
          className={cls}
        />
        <datalist id={`opts-${field.key}`}>
          {opts.map((o) => <option key={o} value={o} />)}
        </datalist>
        {opts.length === 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">No categories yet — add them in the Categories tab first.</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-foreground">{field.label}</label>
      <input
        type={field.type === "number" ? "number" : "text"}
        value={String(value ?? "")}
        onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
        className={cls}
      />
    </div>
  );
}

function SettingsForm({ initial, onSave, onUpload, fields, title }: {
  initial: Record<string, unknown>;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  onUpload: (f: File) => Promise<string>;
  fields?: Field[];
  title?: string;
}) {
  const [v, setV] = useState<Record<string, unknown>>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const { id: _id, ...patch } = v;
      void _id;
      await onSave(patch);
      setMsg("Saved.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Save failed"); }
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="max-w-2xl space-y-3 rounded-md border border-border bg-card p-5">
      <h2 className="text-lg font-bold text-foreground">{title ?? "Site settings"}</h2>
      {(fields ?? SETTINGS_FIELDS).map((f) => (
        <FieldInput key={f.key} field={f} value={v[f.key]} onChange={(nv) => setV({ ...v, [f.key]: nv })} onUpload={onUpload} />
      ))}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save settings
        </button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
    </form>
  );
}
