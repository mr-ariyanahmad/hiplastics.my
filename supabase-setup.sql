-- =============================================================
-- Hiplastics Malaysia — ISOLATED SCHEMA SETUP
-- Everything lives inside the `hiplastics` schema.
-- NOTHING in `public` (Nasah) is created, altered or dropped.
--
-- Run in your existing Supabase project:
--   Dashboard → SQL Editor → New query → paste → Run
-- Safe to re-run (idempotent).
--
-- AFTER RUNNING:
--   Dashboard → Project Settings → API → "Exposed schemas"
--   add:  hiplastics
-- =============================================================

create schema if not exists hiplastics;

grant usage on schema hiplastics to anon, authenticated, service_role;
alter default privileges in schema hiplastics
  grant all on tables to service_role;

-- ---------- Admin role ----------
do $$ begin
  create type hiplastics.app_role as enum ('admin', 'staff');
exception when duplicate_object then null; end $$;

create table if not exists hiplastics.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role hiplastics.app_role not null,
  created_at timestamptz default now(),
  unique (user_id, role)
);
grant select on hiplastics.user_roles to authenticated;
grant all on hiplastics.user_roles to service_role;
alter table hiplastics.user_roles enable row level security;

create or replace function hiplastics.has_role(_user_id uuid, _role hiplastics.app_role)
returns boolean language sql stable security definer set search_path = hiplastics, public as $$
  select exists (select 1 from hiplastics.user_roles where user_id = _user_id and role = _role)
$$;

drop policy if exists "self read roles" on hiplastics.user_roles;
create policy "self read roles" on hiplastics.user_roles
  for select to authenticated using (auth.uid() = user_id);

-- ---------- Site settings ----------
create table if not exists hiplastics.site_settings (
  id int primary key default 1,
  name text not null default 'Hiplastics',
  tagline text not null default 'ECO LEAN ♥ SOUL',
  whatsapp_number text not null default '8618060555061',
  whatsapp_display text not null default '+86 180 6055 5061',
  phone text not null default '18060555061',
  email text not null default 'sales@hiplastics.com',
  address text not null default 'Hiplastics, China',
  facebook_url text default '',
  linkedin_url text default '',
  instagram_url text default '',
  youtube_url text default '',
  wechat_url text default '',
  wechat_qr_url text default '',
  whatsapp_qr_url text default '',
  hero_title text default 'Eco Lean Soul',
  hero_subtitle text default 'Hiplastics, your best partner for Electronic Shelf Label accessories.',
  hero_image_url text default '',
  hero_cta_label text default 'GET FREE SOLUTION',
  business_hours text default 'Mon – Fri · 9:00 – 18:00',
  about_html text default '',
  contact_html text default '',
  currency text default 'MYR',
  shipping_flat numeric(10,2) default 15,
  shipping_east numeric(10,2) default 25,
  free_shipping_over numeric(10,2) default 0,
  sst_percent numeric(5,2) default 6,
  cod_enabled boolean default true,
  online_payment_enabled boolean default true,
  company_reg_no text default '',
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);
insert into hiplastics.site_settings (id) values (1) on conflict do nothing;

grant select on hiplastics.site_settings to anon, authenticated;
grant all on hiplastics.site_settings to service_role;
alter table hiplastics.site_settings enable row level security;
drop policy if exists "public read settings" on hiplastics.site_settings;
create policy "public read settings" on hiplastics.site_settings for select using (true);
drop policy if exists "admin write settings" on hiplastics.site_settings;
create policy "admin write settings" on hiplastics.site_settings for all to authenticated
  using (hiplastics.has_role(auth.uid(), 'admin')) with check (hiplastics.has_role(auth.uid(), 'admin'));

-- ---------- Categories ----------
create table if not exists hiplastics.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text default '',
  image_url text default '',
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);
grant select on hiplastics.categories to anon, authenticated;
grant all on hiplastics.categories to service_role;
alter table hiplastics.categories enable row level security;
drop policy if exists "public read categories" on hiplastics.categories;
create policy "public read categories" on hiplastics.categories for select using (is_active);
drop policy if exists "admin write categories" on hiplastics.categories;
create policy "admin write categories" on hiplastics.categories for all to authenticated
  using (hiplastics.has_role(auth.uid(), 'admin')) with check (hiplastics.has_role(auth.uid(), 'admin'));

-- ---------- Products ----------
create table if not exists hiplastics.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,
  description text default '',
  features text[] default '{}',
  image_url text default '',
  image_urls text[] default '{}',
  price numeric(10,2) default 0,
  sku text default '',
  stock int default 0,
  is_purchasable boolean default false,
  sort_order int default 0,
  is_featured boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists hip_products_slug_idx on hiplastics.products (slug);
grant select on hiplastics.products to anon, authenticated;
grant all on hiplastics.products to service_role;
alter table hiplastics.products enable row level security;
drop policy if exists "public read products" on hiplastics.products;
create policy "public read products" on hiplastics.products for select using (is_active);
drop policy if exists "admin write products" on hiplastics.products;
create policy "admin write products" on hiplastics.products for all to authenticated
  using (hiplastics.has_role(auth.uid(), 'admin')) with check (hiplastics.has_role(auth.uid(), 'admin'));

-- ---------- Industries ----------
create table if not exists hiplastics.industries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default 'Store',
  image_url text default '',
  sort_order int default 0,
  is_active boolean default true
);
grant select on hiplastics.industries to anon, authenticated;
grant all on hiplastics.industries to service_role;
alter table hiplastics.industries enable row level security;
drop policy if exists "public read industries" on hiplastics.industries;
create policy "public read industries" on hiplastics.industries for select using (is_active);
drop policy if exists "admin write industries" on hiplastics.industries;
create policy "admin write industries" on hiplastics.industries for all to authenticated
  using (hiplastics.has_role(auth.uid(), 'admin')) with check (hiplastics.has_role(auth.uid(), 'admin'));

-- ---------- Gallery ----------
create table if not exists hiplastics.gallery (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  image_url text not null,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);
grant select on hiplastics.gallery to anon, authenticated;
grant all on hiplastics.gallery to service_role;
alter table hiplastics.gallery enable row level security;
drop policy if exists "public read gallery" on hiplastics.gallery;
create policy "public read gallery" on hiplastics.gallery for select using (is_active);
drop policy if exists "admin write gallery" on hiplastics.gallery;
create policy "admin write gallery" on hiplastics.gallery for all to authenticated
  using (hiplastics.has_role(auth.uid(), 'admin')) with check (hiplastics.has_role(auth.uid(), 'admin'));

-- ---------- Downloads (PDFs) ----------
create table if not exists hiplastics.downloads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  size_label text default '',
  file_url text default '',
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);
grant select on hiplastics.downloads to anon, authenticated;
grant all on hiplastics.downloads to service_role;
alter table hiplastics.downloads enable row level security;
drop policy if exists "public read downloads" on hiplastics.downloads;
create policy "public read downloads" on hiplastics.downloads for select using (is_active);
drop policy if exists "admin write downloads" on hiplastics.downloads;
create policy "admin write downloads" on hiplastics.downloads for all to authenticated
  using (hiplastics.has_role(auth.uid(), 'admin')) with check (hiplastics.has_role(auth.uid(), 'admin'));

-- ---------- News / Blog ----------
create table if not exists hiplastics.news (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text default '',
  body text default '',
  image_url text default '',
  published_at timestamptz default now(),
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);
grant select on hiplastics.news to anon, authenticated;
grant all on hiplastics.news to service_role;
alter table hiplastics.news enable row level security;
drop policy if exists "public read news" on hiplastics.news;
create policy "public read news" on hiplastics.news for select using (is_active);
drop policy if exists "admin write news" on hiplastics.news;
create policy "admin write news" on hiplastics.news for all to authenticated
  using (hiplastics.has_role(auth.uid(), 'admin')) with check (hiplastics.has_role(auth.uid(), 'admin'));

-- =============================================================
-- SHOP / E-COMMERCE (Malaysia)
-- =============================================================

create table if not exists hiplastics.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null,
  access_token uuid not null default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  company text default '',
  address1 text not null,
  address2 text default '',
  city text not null,
  state text not null,
  postcode text not null,
  notes text default '',
  subtotal numeric(10,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  coupon_code text default '',
  total numeric(10,2) not null default 0,
  currency text not null default 'MYR',
  payment_method text not null default 'cod',      -- cod | toyyibpay
  payment_status text not null default 'pending',  -- pending | paid | failed
  status text not null default 'new',              -- new | processing | shipped | delivered | completed | cancelled
  courier text default '',
  tracking_number text default '',
  tracking_url text default '',
  shipped_at timestamptz,
  delivered_at timestamptz,
  delivery_note text default '',
  admin_note text default '',
  stock_applied boolean default false,
  bill_code text default '',
  transaction_id text default '',
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  confirmation_email_sent boolean not null default false
);
create index if not exists hip_orders_created_at_idx on hiplastics.orders (created_at desc);
create index if not exists hip_orders_order_no_idx on hiplastics.orders (order_no);

-- Existing deployments: `create table if not exists` above won't add a column
-- to an orders table that already exists, so add it explicitly too.
alter table hiplastics.orders add column if not exists confirmation_email_sent boolean not null default false;

-- Product reviews & ratings ------------------------------------------------
create table if not exists hiplastics.reviews (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  customer_name text not null,
  customer_email text default '',
  rating smallint not null check (rating between 1 and 5),
  comment text default '',
  is_approved boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists hip_reviews_product_slug_idx on hiplastics.reviews (product_slug);
create index if not exists hip_reviews_approved_idx on hiplastics.reviews (is_approved);
grant select on hiplastics.reviews to anon, authenticated;
grant all on hiplastics.reviews to service_role;
alter table hiplastics.reviews enable row level security;
drop policy if exists "public read approved reviews" on hiplastics.reviews;
create policy "public read approved reviews" on hiplastics.reviews for select using (is_approved = true);

create table if not exists hiplastics.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references hiplastics.orders(id) on delete cascade not null,
  product_id uuid,
  slug text not null,
  name text not null,
  image_url text default '',
  unit_price numeric(10,2) not null default 0,
  qty int not null default 1,
  line_total numeric(10,2) not null default 0
);
create index if not exists hip_order_items_order_idx on hiplastics.order_items (order_id);

-- Orders are written/read ONLY through server functions using the service role.
grant all on hiplastics.orders to service_role;
grant all on hiplastics.order_items to service_role;
grant select on hiplastics.orders to authenticated;
grant select on hiplastics.order_items to authenticated;
alter table hiplastics.orders enable row level security;
alter table hiplastics.order_items enable row level security;
drop policy if exists "admin manage orders" on hiplastics.orders;
create policy "admin manage orders" on hiplastics.orders for all to authenticated
  using (hiplastics.has_role(auth.uid(), 'admin')) with check (hiplastics.has_role(auth.uid(), 'admin'));
drop policy if exists "own orders read" on hiplastics.orders;
create policy "own orders read" on hiplastics.orders for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "admin manage order items" on hiplastics.order_items;
create policy "admin manage order items" on hiplastics.order_items for all to authenticated
  using (hiplastics.has_role(auth.uid(), 'admin')) with check (hiplastics.has_role(auth.uid(), 'admin'));
drop policy if exists "own order items read" on hiplastics.order_items;
create policy "own order items read" on hiplastics.order_items for select to authenticated
  using (exists (select 1 from hiplastics.orders o where o.id = order_id and o.user_id = auth.uid()));

-- ---------- Addresses ----------
create table if not exists hiplastics.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text default 'Home',
  full_name text not null,
  phone text not null,
  address1 text not null,
  address2 text default '',
  city text not null,
  state text not null,
  postcode text not null,
  is_default boolean default false,
  created_at timestamptz default now()
);
grant select, insert, update, delete on hiplastics.addresses to authenticated;
grant all on hiplastics.addresses to service_role;
alter table hiplastics.addresses enable row level security;
drop policy if exists "own addresses" on hiplastics.addresses;
create policy "own addresses" on hiplastics.addresses for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Cart items ----------
create table if not exists hiplastics.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  slug text not null,
  qty int not null default 1 check (qty > 0 and qty <= 999),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, slug)
);
grant select, insert, update, delete on hiplastics.cart_items to authenticated;
grant all on hiplastics.cart_items to service_role;
alter table hiplastics.cart_items enable row level security;
drop policy if exists "own cart" on hiplastics.cart_items;
create policy "own cart" on hiplastics.cart_items for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Wishlists ----------
create table if not exists hiplastics.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  slug text not null,
  created_at timestamptz default now(),
  unique (user_id, slug)
);
grant select, insert, update, delete on hiplastics.wishlists to authenticated;
grant all on hiplastics.wishlists to service_role;
alter table hiplastics.wishlists enable row level security;
drop policy if exists "own wishlist" on hiplastics.wishlists;
create policy "own wishlist" on hiplastics.wishlists for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Reviews ----------
create table if not exists hiplastics.reviews (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Customer',
  rating int not null check (rating between 1 and 5),
  title text default '',
  body text default '',
  is_approved boolean default false,
  created_at timestamptz default now()
);
create index if not exists hip_reviews_product_idx on hiplastics.reviews (product_slug);
grant select on hiplastics.reviews to anon;
grant select, insert on hiplastics.reviews to authenticated;
grant all on hiplastics.reviews to service_role;
alter table hiplastics.reviews enable row level security;
drop policy if exists "public read approved reviews" on hiplastics.reviews;
create policy "public read approved reviews" on hiplastics.reviews for select using (is_approved);
drop policy if exists "own read reviews" on hiplastics.reviews;
create policy "own read reviews" on hiplastics.reviews for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "write own review" on hiplastics.reviews;
create policy "write own review" on hiplastics.reviews for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "admin manage reviews" on hiplastics.reviews;
create policy "admin manage reviews" on hiplastics.reviews for all to authenticated
  using (hiplastics.has_role(auth.uid(), 'admin')) with check (hiplastics.has_role(auth.uid(), 'admin'));

-- ---------- Coupons ----------
create table if not exists hiplastics.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null default 'percent',   -- percent | fixed
  discount_value numeric(10,2) not null default 0,
  min_subtotal numeric(10,2) not null default 0,
  max_uses int default 0,                          -- 0 = unlimited
  used_count int not null default 0,
  starts_at timestamptz default now(),
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);
grant all on hiplastics.coupons to service_role;
alter table hiplastics.coupons enable row level security;
drop policy if exists "admin manage coupons" on hiplastics.coupons;
create policy "admin manage coupons" on hiplastics.coupons for all to authenticated
  using (hiplastics.has_role(auth.uid(), 'admin')) with check (hiplastics.has_role(auth.uid(), 'admin'));

-- =============================================================
-- STORAGE (bucket is isolated by name; Nasah buckets untouched)
-- =============================================================
insert into storage.buckets (id, name, public)
values ('hiplastics-media', 'hiplastics-media', true)
on conflict (id) do update set public = true;

drop policy if exists "hiplastics public read media" on storage.objects;
create policy "hiplastics public read media" on storage.objects
  for select using (bucket_id = 'hiplastics-media');

drop policy if exists "hiplastics admin write media" on storage.objects;
create policy "hiplastics admin write media" on storage.objects for all to authenticated
  using (bucket_id = 'hiplastics-media' and hiplastics.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'hiplastics-media' and hiplastics.has_role(auth.uid(), 'admin'));

-- =============================================================
-- ADMIN ACCOUNT — mr.ariyanahmad@gmail.com
-- =============================================================
insert into hiplastics.user_roles (user_id, role)
select id, 'admin'::hiplastics.app_role from auth.users
where lower(email) = 'mr.ariyanahmad@gmail.com'
on conflict (user_id, role) do nothing;

create or replace function hiplastics.grant_owner_admin()
returns trigger language plpgsql security definer set search_path = hiplastics, public as $$
begin
  -- Never grant from an unverified address. Auth must first prove mailbox
  -- ownership, whether confirmation happened at signup or on a later update.
  if new.email_confirmed_at is not null
     and lower(new.email) = 'mr.ariyanahmad@gmail.com' then
    insert into hiplastics.user_roles (user_id, role)
    values (new.id, 'admin'::hiplastics.app_role)
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;

-- distinct trigger name so Nasah's own auth triggers are not touched
drop trigger if exists on_auth_user_created_hiplastics_admin on auth.users;
create trigger on_auth_user_created_hiplastics_admin
after insert on auth.users
for each row execute function hiplastics.grant_owner_admin();

drop trigger if exists on_auth_user_confirmed_hiplastics_admin on auth.users;
create trigger on_auth_user_confirmed_hiplastics_admin
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function hiplastics.grant_owner_admin();

-- =============================================================
-- SEED initial content
-- =============================================================
insert into hiplastics.categories (slug, name, description, sort_order) values
  ('esl-rails', 'ESL Rails', 'Mounting rails for electronic shelf labels', 1),
  ('shelf-communication', 'Shelf Communication', 'Sign holders, dividers, frames and pockets', 2),
  ('plastic-frames-stands', 'Plastic Frames & Stands', 'Shelf talkers and poster holders', 3),
  ('biodegradable', '100% Biodegradable', 'Eco-friendly biodegradable products', 4),
  ('custom', 'Custom / OEM', 'Tailor-made tooling and moulds', 5)
on conflict (slug) do nothing;

insert into hiplastics.products (slug, name, category, description, features, sort_order, is_featured) values
  ('esl-rails', 'ESL Rails', 'ESL Rails',
   'Durable mounting rails designed for electronic shelf labels. Compatible with leading ESL brands.',
   array['Aluminium-grade plastic','Multiple lengths','Snap-fit install'], 1, true),
  ('sign-holders', 'Sign Holders', 'Shelf Communication',
   'Clear sign holders for shelf-edge price and promotion communication.',
   array['Crystal-clear PVC','Standard supermarket sizes','Easy refill'], 2, true),
  ('clip-strip-hang-tab', 'Clip Strip & Hang Tab', 'Shelf Communication',
   'Strip clips and hang tabs for cross-merchandising and impulse displays.',
   array['Reusable','High-load grip','Multiple sizes'], 3, false),
  ('plastic-dividers', 'Plastic Dividers', 'Shelf Communication',
   'Shelf dividers to keep facings tidy and product fronts aligned.',
   array['Adhesive base','Cut-to-length','Clear visibility'], 4, false),
  ('plastic-frames-pockets', 'Plastic Frames and Pockets', 'Shelf Communication',
   'Plastic frames and pockets for printed signage and labels.',
   array['A4/A5/Custom','Indoor/outdoor','Anti-glare'], 5, false),
  ('frame-stands', 'Frame Stands', 'Shelf Communication',
   'Counter and shelf frame stands for clean signage display.',
   array['Stable base','Portrait/landscape','Bulk pack'], 6, false),
  ('shelf-talkers', 'Shelf Talkers', 'Plastic Frames & Stands',
   'Eye-catching shelf talkers to drive attention to promotions.',
   array['Flag/wobbler styles','Custom print ready','High durability'], 7, false),
  ('poster-holders', 'Poster Holders', 'Plastic Frames & Stands',
   'Wall, ceiling and floor poster holders for in-store campaigns.',
   array['Multiple mounts','Clear protection','Quick swap'], 8, false),
  ('100-biodegradable', '100% Biodegradable', '100% Biodegradable',
   'Eco-friendly biodegradable retail accessories that reduce plastic impact.',
   array['Compostable','Retail-grade','OEM available'], 9, true),
  ('petg-products', 'PETG Products', '100% Biodegradable',
   'High-clarity PETG products — recyclable and durable.',
   array['Crystal clarity','Recyclable','Impact resistant'], 10, false)
on conflict (slug) do nothing;

insert into hiplastics.industries (name, icon, sort_order)
select * from (values
  ('Supermarkets','ShoppingCart',1),
  ('Pharmacies','Pill',2),
  ('Convenience Stores','Store',3),
  ('Electronics Stores','Cpu',4),
  ('Department Stores','Building2',5),
  ('Retail Chains','Network',6)
) as v(name, icon, sort_order)
where not exists (select 1 from hiplastics.industries i where i.name = v.name);

insert into hiplastics.downloads (title, size_label, sort_order)
select * from (values
  ('Full Product Catalogue 2026','PDF · 4.2 MB',1),
  ('ESL Rail Specification Sheet','PDF · 820 KB',2),
  ('Shelf Label Holder Sizes Guide','PDF · 1.1 MB',3),
  ('Installation & Care Manual','PDF · 950 KB',4)
) as v(title, size_label, sort_order)
where not exists (select 1 from hiplastics.downloads d where d.title = v.title);

-- =============================================================
-- ATOMIC STOCK RESERVATION (race-condition / overselling fix)
-- Safe to re-run: functions are create-or-replace, idempotent.
-- =============================================================

-- Atomically deduct stock for one order line. The UPDATE ... WHERE stock >= qty
-- is a single row-locked statement, so two concurrent checkouts for the last
-- unit can never both succeed — Postgres serializes the two UPDATEs on that row.
create or replace function hiplastics.reserve_stock(p_slug text, p_qty int)
returns table(ok boolean, remaining int, product_name text)
language plpgsql
security definer
set search_path = hiplastics, pg_temp
as $$
declare
  v_id uuid;
  v_stock int;
  v_name text;
begin
  update hiplastics.products
    set stock = stock - p_qty,
        updated_at = now()
    where slug = p_slug
      and is_active = true
      and is_purchasable = true
      and stock >= p_qty
    returning id, stock, name into v_id, v_stock, v_name;

  if v_id is null then
    select p.stock, p.name into v_stock, v_name from hiplastics.products p where p.slug = p_slug;
    return query select false, coalesce(v_stock, 0), coalesce(v_name, p_slug);
  else
    return query select true, v_stock, v_name;
  end if;
end;
$$;

-- Compensating restock, used for rollback-on-failure and for
-- cancelled / failed / refunded orders.
create or replace function hiplastics.restore_stock(p_slug text, p_qty int)
returns void
language sql
security definer
set search_path = hiplastics, pg_temp
as $$
  update hiplastics.products set stock = stock + p_qty, updated_at = now() where slug = p_slug;
$$;

revoke all on function hiplastics.reserve_stock(text, int) from public, anon, authenticated;
revoke all on function hiplastics.restore_stock(text, int) from public, anon, authenticated;
grant execute on function hiplastics.reserve_stock(text, int) to service_role;
grant execute on function hiplastics.restore_stock(text, int) to service_role;

-- =============================================================
-- COUPON VALIDATION (read-only check, safe to call repeatedly while
-- the customer is on the cart page) + atomic redemption (used once,
-- at order-creation time, race-condition safe like reserve_stock).
-- =============================================================

create or replace function hiplastics.check_coupon(p_code text, p_subtotal numeric)
returns table(ok boolean, discount numeric, message text)
language plpgsql
security definer
set search_path = hiplastics, pg_temp
as $$
declare
  c hiplastics.coupons%rowtype;
  v_discount numeric := 0;
begin
  select * into c from hiplastics.coupons where code = upper(trim(p_code));
  if c.id is null or c.is_active = false then
    return query select false, 0::numeric, 'Invalid coupon code.'; return;
  end if;
  if c.starts_at is not null and c.starts_at > now() then
    return query select false, 0::numeric, 'This coupon is not active yet.'; return;
  end if;
  if c.expires_at is not null and c.expires_at < now() then
    return query select false, 0::numeric, 'This coupon has expired.'; return;
  end if;
  if c.max_uses > 0 and c.used_count >= c.max_uses then
    return query select false, 0::numeric, 'This coupon has reached its usage limit.'; return;
  end if;
  if p_subtotal < c.min_subtotal then
    return query select false, 0::numeric, format('This coupon needs a minimum order of RM %s.', c.min_subtotal); return;
  end if;
  if c.discount_type = 'fixed' then
    v_discount := c.discount_value;
  else
    v_discount := round(p_subtotal * c.discount_value / 100.0, 2);
  end if;
  if v_discount > p_subtotal then v_discount := p_subtotal; end if;
  if v_discount < 0 then v_discount := 0; end if;
  return query select true, v_discount, 'ok';
end;
$$;

-- Atomic check-and-increment, called once per order right before it's
-- created. Guards against two customers using the last redemption of a
-- limited coupon at the same moment.
create or replace function hiplastics.redeem_coupon(p_code text)
returns boolean
language plpgsql
security definer
set search_path = hiplastics, pg_temp
as $$
declare
  v_id uuid;
begin
  update hiplastics.coupons
    set used_count = used_count + 1
    where code = upper(trim(p_code))
      and is_active = true
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at >= now())
      and (max_uses = 0 or used_count < max_uses)
    returning id into v_id;
  return v_id is not null;
end;
$$;

create or replace function hiplastics.release_coupon(p_code text)
returns void
language sql
security definer
set search_path = hiplastics, pg_temp
as $$
  update hiplastics.coupons set used_count = greatest(0, used_count - 1) where code = upper(trim(p_code));
$$;

revoke all on function hiplastics.check_coupon(text, numeric) from public, anon, authenticated;
revoke all on function hiplastics.redeem_coupon(text) from public, anon, authenticated;
revoke all on function hiplastics.release_coupon(text) from public, anon, authenticated;
grant execute on function hiplastics.check_coupon(text, numeric) to service_role;
grant execute on function hiplastics.redeem_coupon(text) to service_role;
grant execute on function hiplastics.release_coupon(text) to service_role;

-- ============================================================================
-- MIGRATION — 2026-08-13 bug-fix pass
-- Safe to run on top of an existing database: everything here is either
-- `add column if not exists`, `create index/policy if not exists`, or a
-- `drop ... if exists` followed by `create`. Run this whole block once in
-- the Supabase SQL Editor.
-- ============================================================================

-- 1) Site logo, configurable from Admin → Settings, used in the header,
--    footer and invoice instead of the hardcoded image asset.
alter table hiplastics.site_settings add column if not exists logo_url text not null default '';

-- 2) Reviews table: the file above accidentally contained TWO conflicting
--    `create table if not exists hiplastics.reviews (...)` blocks with
--    different columns. Because of `if not exists`, whichever ran first on
--    your database "won" and the second block silently did nothing — so
--    depending on history, some of these columns may already be missing.
--    This section is column-additive and safe either way.
alter table hiplastics.reviews add column if not exists customer_email text not null default '';
alter table hiplastics.reviews add column if not exists comment text not null default '';
alter table hiplastics.reviews add column if not exists is_approved boolean not null default false;

-- One review per customer per product — matches the app-level check in
-- submitReview(), enforced here too as defense in depth.
create unique index if not exists hip_reviews_one_per_customer_idx
  on hiplastics.reviews (product_slug, lower(customer_email))
  where customer_email <> '';

-- Reviews are written by the server's service-role client (which bypasses
-- RLS), so the anon/authenticated write policy is no longer needed for the
-- app to function — but keep public read of approved reviews.
grant select on hiplastics.reviews to anon, authenticated;
grant all on hiplastics.reviews to service_role;
alter table hiplastics.reviews enable row level security;
drop policy if exists "public read approved reviews" on hiplastics.reviews;
create policy "public read approved reviews" on hiplastics.reviews for select using (is_approved = true);

-- 3) Backfill: normalize any customer_phone values stored without the +60
--    country code, so existing orders' WhatsApp buttons start working too.
update hiplastics.orders
  set customer_phone = '+60' || regexp_replace(customer_phone, '^(\+?60|0)', '')
  where customer_phone !~ '^\+60';

-- 4) Invoice customization (Admin → Invoice Settings): accent color, footer
--    note, and signed-off-by name. Defaults are blank so the invoice keeps
--    using your site's normal button-blue theme until you explicitly set
--    an override.
alter table hiplastics.site_settings add column if not exists invoice_accent_color text not null default '';
alter table hiplastics.site_settings add column if not exists invoice_footer_note text not null default '';
alter table hiplastics.site_settings add column if not exists invoice_signature_name text not null default '';

-- ============================================================================
-- MIGRATION — 2026-08-14 feature pass (back-in-stock notify + abandoned cart)
-- Safe to run on top of an existing database — same additive style as above.
-- Run this whole block once in the Supabase SQL Editor.
-- ============================================================================

-- 1) Back-in-stock "notify me" requests. A customer submits their email on
--    an out-of-stock product page; when an admin restocks that product
--    above zero, everyone here gets emailed once (notified_at set) and the
--    request stays as a record. One row per (product, email) — resubmitting
--    while still pending just updates the timestamp instead of duplicating.
create table if not exists hiplastics.stock_notify_requests (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  email text not null,
  notified_at timestamptz,
  created_at timestamptz default now()
);
create unique index if not exists hip_stock_notify_unique_idx
  on hiplastics.stock_notify_requests (product_slug, lower(email));
create index if not exists hip_stock_notify_pending_idx
  on hiplastics.stock_notify_requests (product_slug) where notified_at is null;

grant all on hiplastics.stock_notify_requests to service_role;
alter table hiplastics.stock_notify_requests enable row level security;
-- Written only via the server's service-role client (requestStockNotify),
-- which bypasses RLS — no anon/authenticated policy needed for the app to
-- function, so RLS here defaults to fully closed for those roles.

-- 2) Abandoned-cart snapshots. One row per signed-in customer (their cart,
--    debounced-saved as it changes). The daily cron
--    (api/public/cart-reminder-cron) emails anyone whose snapshot is 2–72
--    hours old and hasn't been reminded yet; createOrder() deletes the row
--    the moment that customer actually checks out.
create table if not exists hiplastics.cart_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade not null,
  customer_email text not null,
  customer_name text default '',
  items jsonb not null default '[]',
  reminder_sent_at timestamptz,
  updated_at timestamptz default now()
);
create index if not exists hip_cart_snapshots_reminder_idx
  on hiplastics.cart_snapshots (updated_at) where reminder_sent_at is null;

grant all on hiplastics.cart_snapshots to service_role;
alter table hiplastics.cart_snapshots enable row level security;
-- Written only via the server's service-role client — no anon/authenticated
-- policy needed; this table is never read directly from the browser.
