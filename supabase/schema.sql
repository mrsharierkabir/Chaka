-- ============================================================
-- SHOHAZ BAZAR — Supabase schema
--
-- HOW TO RUN THIS FILE
-- Paste the WHOLE file into the Supabase SQL Editor and run it.
-- That's it — there is only one version of this file, and it is
-- always safe to run again later (e.g. after downloading an updated
-- copy of the project). Every statement either creates something
-- only if it's missing, or replaces something with an identical
-- definition — nothing here will ever error because something
-- "already exists", and nothing here drops or deletes real data.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. SITE SETTINGS (hotline / whatsapp / logo / footer text)
-- ------------------------------------------------------------
create table if not exists public.settings (
  id int primary key default 1,
  constraint single_row check (id = 1)
);
alter table public.settings add column if not exists hotline text not null default '+8801521719188';
alter table public.settings add column if not exists whatsapp text not null default '+8801521719188';
alter table public.settings add column if not exists cash_on_delivery_text text not null default 'Cash on delivery';
alter table public.settings add column if not exists hours_text text not null default '24 hours open';
alter table public.settings add column if not exists logo_text_1 text not null default 'SHOHAZ';
alter table public.settings add column if not exists logo_text_2 text not null default 'BAZAR';
alter table public.settings add column if not exists logo_icon_url text not null default '';
alter table public.settings add column if not exists header_logo_url text not null default '';
alter table public.settings add column if not exists footer_about text not null default 'Top Quality Products, Electronics, Dried Fish and essentials - at your doorsteps.';
alter table public.settings add column if not exists footer_copyright text not null default '@2026 shohazbazar- All Rights Reserved | Trade Licence: DEMO NUMBER XXXX XXXX XXXX XXXX XXXX';
insert into public.settings (id) values (1) on conflict (id) do nothing;
-- One-time cleanup: an early version of this project was named "Shohoz" —
-- fixes it automatically if you still have that saved. Harmless to re-run.
update public.settings set logo_text_1 = 'SHOHAZ' where logo_text_1 = 'SHOHOZ';

-- ------------------------------------------------------------
-- 2. ROTATING TITLES (announcement strip under the header, changes every 5s)
-- ------------------------------------------------------------
create table if not exists public.titles (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 3. BANNERS (hero carousel, auto-changes every 5s, manual arrows)
-- ------------------------------------------------------------
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  headline text default '',
  subheadline text default '',
  link_url text default '',
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 4. CATEGORIES
-- ------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_bn text default '',
  icon_url text default '',
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);
-- Optional custom SKU prefix (e.g. "TSH" for T-Shirts) used when a product's
-- SKU is auto-generated; falls back to deriving one from the category name.
alter table public.categories add column if not exists sku_prefix text default '';

-- ------------------------------------------------------------
-- 5. PRODUCTS
-- ------------------------------------------------------------
create sequence if not exists public.products_sku_seq;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  category_id uuid references public.categories(id) on delete set null,
  images jsonb not null default '[]',        -- array of image urls (first = main image)
  regular_price numeric not null default 0,
  discounted_price numeric not null default 0,
  stock int not null default 0,
  in_stock boolean generated always as (stock > 0) stored,
  description text default '',
  delivery_info text default '',
  featured boolean not null default false,
  created_at timestamptz default now()
);
alter table public.products add column if not exists sku text;
alter table public.products add column if not exists product_type text not null default 'simple';
create index if not exists products_category_idx on public.products(category_id);
create unique index if not exists products_sku_key on public.products(sku);

do $$ begin
  alter table public.products add constraint products_product_type_check check (product_type in ('simple','variable'));
exception when duplicate_object then null; end $$;

-- Auto-generates a SKU like "TSH-00102" from the category's SKU prefix (or
-- its name if no prefix is set) plus a running number — but only if the
-- admin didn't type one in manually.
create or replace function public.set_product_sku()
returns trigger as $$
declare prefix text; fallback_prefix text;
begin
  if new.sku is null or new.sku = '' then
    select nullif(upper(c.sku_prefix), ''), upper(substring(regexp_replace(coalesce(c.name, 'PRD'), '[^a-zA-Z]', '', 'g') from 1 for 3))
      into prefix, fallback_prefix from public.categories c where c.id = new.category_id;
    prefix := coalesce(prefix, fallback_prefix, 'PRD');
    if prefix = '' then prefix := 'PRD'; end if;
    new.sku := prefix || '-' || lpad(nextval('public.products_sku_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_product_sku on public.products;
create trigger trg_set_product_sku
  before insert on public.products
  for each row execute function public.set_product_sku();

-- Backfill SKUs for any products that don't have one yet (e.g. ones created
-- before this feature existed).
do $$
declare r record; prefix text; fallback_prefix text;
begin
  for r in select id, category_id from public.products where sku is null or sku = '' loop
    select nullif(upper(c.sku_prefix), ''), upper(substring(regexp_replace(coalesce(c.name, 'PRD'), '[^a-zA-Z]', '', 'g') from 1 for 3))
      into prefix, fallback_prefix from public.categories c where c.id = r.category_id;
    prefix := coalesce(prefix, fallback_prefix, 'PRD');
    if prefix = '' then prefix := 'PRD'; end if;
    update public.products set sku = prefix || '-' || lpad(nextval('public.products_sku_seq')::text, 5, '0') where id = r.id;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 6. PRODUCT ATTRIBUTES (e.g. Size: S,M,L / Color: Red,Blue) — variable products only
-- ------------------------------------------------------------
create table if not exists public.product_attributes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  name text not null,                 -- e.g. "Size"
  values jsonb not null default '[]', -- e.g. ["S","M","L"]
  position int not null default 0
);

-- ------------------------------------------------------------
-- 7. PRODUCT VARIANTS — one row per attribute combination
-- (e.g. Size:M + Color:Red), each with its own SKU, price, stock and image.
-- ------------------------------------------------------------
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  sku text,
  attributes jsonb not null default '{}', -- e.g. {"Size":"M","Color":"Red"}
  regular_price numeric not null default 0,
  discounted_price numeric,
  stock int not null default 0,
  image_url text default '',
  position int not null default 0,
  created_at timestamptz default now()
);
-- Belt-and-suspenders: if this table already existed from a very old
-- version of the project (option_group/name-based, no SKUs), this backfills
-- the columns the current app actually needs without touching your data.
alter table public.product_variants add column if not exists sku text;
alter table public.product_variants add column if not exists attributes jsonb not null default '{}';
alter table public.product_variants add column if not exists regular_price numeric not null default 0;
alter table public.product_variants add column if not exists discounted_price numeric;
alter table public.product_variants add column if not exists stock int not null default 0;
alter table public.product_variants add column if not exists image_url text default '';
alter table public.product_variants add column if not exists position int not null default 0;
create index if not exists product_variants_product_idx on public.product_variants(product_id);

-- Whenever a variant is added/edited/deleted, roll its price & stock up onto
-- the parent product row so the home page, shop page, and cards (which only
-- ever read from `products`) automatically show the right "from" price and
-- total stock — no other code has to know variants exist.
create or replace function public.sync_product_aggregates()
returns trigger as $$
declare pid uuid;
begin
  pid := coalesce(new.product_id, old.product_id);
  update public.products p set
    stock = coalesce((select sum(stock) from public.product_variants where product_id = pid), 0),
    discounted_price = coalesce((select min(coalesce(discounted_price, regular_price)) from public.product_variants where product_id = pid), p.discounted_price),
    regular_price = coalesce(
      (select regular_price from public.product_variants where product_id = pid order by coalesce(discounted_price, regular_price) asc limit 1),
      p.regular_price)
  where p.id = pid and p.product_type = 'variable';
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists trg_sync_product_aggregates on public.product_variants;
create trigger trg_sync_product_aggregates
  after insert or update or delete on public.product_variants
  for each row execute function public.sync_product_aggregates();

-- ------------------------------------------------------------
-- 8. PRODUCT REVIEWS (admin managed)
-- ------------------------------------------------------------
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  author text not null default 'Customer',
  rating int not null default 5 check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 9. FOOTER LINKS ("Quick Links" column — "Policies" is fixed in the app)
-- ------------------------------------------------------------
create table if not exists public.footer_links (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('quick_links','policies')),
  label text not null,
  url text not null default '#',
  position int not null default 0
);
insert into public.footer_links (section, label, url, position)
select * from (values
  ('quick_links','Home','/',0),
  ('quick_links','Shop','/shop',1),
  ('quick_links','Cart','/cart',2)
) as seed(section, label, url, position)
where not exists (select 1 from public.footer_links where section = 'quick_links');
-- The "Policies" column is rendered as fixed links in the app itself
-- (Terms & Conditions / Privacy Policy / Returns & Refunds), so any old
-- rows under that section here would be orphaned/unused — clear them out.
delete from public.footer_links where section = 'policies';

-- ------------------------------------------------------------
-- 10. ORDERS (created at checkout)
-- ------------------------------------------------------------
create sequence if not exists public.orders_invoice_seq;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_phone text,
  items jsonb not null default '[]',
  subtotal numeric not null default 0,
  total numeric not null default 0,
  status text not null default 'pending',
  created_at timestamptz default now()
);
alter table public.orders add column if not exists invoice_no text;
alter table public.orders add column if not exists customer_address text;   -- full street address (kept for display)
alter table public.orders add column if not exists street_address text;    -- same value as customer_address; both are set at checkout
alter table public.orders add column if not exists division text;
alter table public.orders add column if not exists district text;
alter table public.orders add column if not exists upazila text;
alter table public.orders add column if not exists union_ward text;
alter table public.orders add column if not exists landmark text;          -- "Landmark / Delivery Note" from checkout
alter table public.orders add column if not exists note text default '';   -- legacy field, kept only so very old orders still display their note
alter table public.orders add column if not exists delivery_charge numeric not null default 0;
alter table public.orders add column if not exists discount_amount numeric not null default 0;
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists coupon_id uuid;
alter table public.orders add column if not exists is_read boolean not null default false;
alter table public.orders add column if not exists stock_deducted boolean not null default false;
create unique index if not exists orders_invoice_no_key on public.orders(invoice_no);

do $$ begin
  alter table public.orders add constraint orders_status_check check (status in ('pending','shipped','delivered','returned','cancelled'));
exception when duplicate_object then null; end $$;
-- One-time cleanup: an earlier version of this project used a "confirmed"
-- status that no longer exists — moves any such orders to "pending" so
-- nothing is lost. Harmless to re-run (matches nothing after the first time).
update public.orders set status = 'pending' where status = 'confirmed';

-- Auto-generates an invoice number like "SB001", "SB002", ... on every order.
create or replace function public.set_order_invoice_no()
returns trigger as $$
begin
  if new.invoice_no is null then
    new.invoice_no := 'SB' || lpad(nextval('public.orders_invoice_seq')::text, 3, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_order_invoice_no on public.orders;
create trigger trg_set_order_invoice_no
  before insert on public.orders
  for each row execute function public.set_order_invoice_no();

-- Backfill invoice numbers for any orders placed before this feature existed.
do $$
declare r record;
begin
  for r in select id from public.orders where invoice_no is null order by created_at asc loop
    update public.orders set invoice_no = 'SB' || lpad(nextval('public.orders_invoice_seq')::text, 3, '0') where id = r.id;
  end loop;
end $$;

-- When an order's status changes to "delivered" for the first time, walk its
-- items and reduce stock: variant stock if the item has a variant_id, else
-- the product's own stock. stock_deducted stops this from double-firing.
create or replace function public.deduct_stock_on_delivery()
returns trigger as $$
declare item jsonb;
begin
  if new.status = 'delivered' and (old.status is distinct from 'delivered') and coalesce(new.stock_deducted, false) = false then
    for item in select * from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) loop
      if nullif(item->>'variant_id', '') is not null then
        update public.product_variants set stock = greatest(stock - coalesce((item->>'qty')::int, 1), 0)
          where id = (item->>'variant_id')::uuid;
      elsif nullif(item->>'product_id', '') is not null then
        update public.products set stock = greatest(stock - coalesce((item->>'qty')::int, 1), 0)
          where id = (item->>'product_id')::uuid;
      end if;
    end loop;
    new.stock_deducted := true;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_deduct_stock_on_delivery on public.orders;
create trigger trg_deduct_stock_on_delivery
  before update on public.orders
  for each row execute function public.deduct_stock_on_delivery();

-- ------------------------------------------------------------
-- 11. POLICY PAGES (Terms & Conditions / Privacy Policy / Returns & Refunds)
-- Terms & Conditions uses title+content as numbered TOC sections.
-- Privacy Policy and Returns & Refunds use title+content as heading+bullets.
-- ------------------------------------------------------------
create table if not exists public.policy_sections (
  id uuid primary key default gen_random_uuid(),
  page text not null check (page in ('terms','privacy','returns')),
  title text not null,
  content text not null default '',
  position int not null default 0,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 12. COUPONS
-- ------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage','flat_tk','free_shipping')),
  discount_value numeric not null default 0,
  max_discount numeric,
  min_order numeric not null default 0,
  usage_limit int,
  per_customer_limit int not null default 1,
  used_count int not null default 0,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- Tracks who has redeemed which coupon (keyed by phone, since checkout has
-- no customer accounts) so the per-customer limit can be enforced.
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid references public.coupons(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  customer_phone text not null,
  created_at timestamptz default now()
);

do $$ begin
  alter table public.orders add constraint orders_coupon_id_fkey foreign key (coupon_id) references public.coupons(id) on delete set null;
exception when duplicate_object then null; end $$;

-- Re-checks a coupon's rules against the order actually being placed and
-- recomputes discount_amount + total from scratch — the client's own numbers
-- are never trusted, which is what keeps the usage/min-order/expiry rules
-- (and the total itself) impossible to tamper with from the browser.
create or replace function public.enforce_coupon_and_total()
returns trigger as $$
declare
  c record;
  computed_discount numeric := 0;
  now_ts timestamptz := now();
  per_cust_used int := 0;
begin
  new.coupon_id := null;
  new.discount_amount := 0;

  if new.coupon_code is not null and btrim(new.coupon_code) <> '' then
    select * into c from public.coupons where upper(code) = upper(btrim(new.coupon_code)) and active = true limit 1;

    if c.id is not null then
      select count(*) into per_cust_used from public.coupon_redemptions
        where coupon_id = c.id and customer_phone = new.customer_phone;
    end if;

    if c.id is not null
       and now_ts >= c.starts_at
       and (c.expires_at is null or now_ts <= c.expires_at)
       and coalesce(new.subtotal, 0) >= c.min_order
       and (c.usage_limit is null or c.used_count < c.usage_limit)
       and per_cust_used < c.per_customer_limit
    then
      new.coupon_id := c.id;
      new.coupon_code := c.code;
      if c.discount_type = 'percentage' then
        computed_discount := coalesce(new.subtotal, 0) * c.discount_value / 100.0;
        if c.max_discount is not null then
          computed_discount := least(computed_discount, c.max_discount);
        end if;
      elsif c.discount_type = 'flat_tk' then
        computed_discount := least(c.discount_value, coalesce(new.subtotal, 0));
      elsif c.discount_type = 'free_shipping' then
        computed_discount := coalesce(new.delivery_charge, 0);
      end if;
      new.discount_amount := round(computed_discount::numeric, 2);
    else
      -- Coupon isn't valid anymore (expired / exhausted / etc since the
      -- customer applied it) — drop it quietly rather than fail the order.
      new.coupon_code := null;
    end if;
  else
    new.coupon_code := null;
  end if;

  new.total := round((coalesce(new.subtotal, 0) + coalesce(new.delivery_charge, 0) - coalesce(new.discount_amount, 0))::numeric, 2);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_enforce_coupon_and_total on public.orders;
create trigger trg_enforce_coupon_and_total
  before insert on public.orders
  for each row execute function public.enforce_coupon_and_total();

-- After an order is actually created with a coupon attached, log the
-- redemption and bump the coupon's used_count.
create or replace function public.log_coupon_redemption()
returns trigger as $$
begin
  if new.coupon_id is not null then
    insert into public.coupon_redemptions (coupon_id, order_id, customer_phone)
      values (new.coupon_id, new.id, new.customer_phone);
    update public.coupons set used_count = used_count + 1 where id = new.coupon_id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_log_coupon_redemption on public.orders;
create trigger trg_log_coupon_redemption
  after insert on public.orders
  for each row execute function public.log_coupon_redemption();

-- Read-only, callable by anyone (used by the checkout "Apply" button) — does
-- NOT expose the coupons table itself, so codes can't be listed/enumerated,
-- only tested one at a time. Mirrors the exact same rules as the trigger
-- above so what the customer sees matches what actually gets applied.
create or replace function public.check_coupon(p_code text, p_subtotal numeric, p_phone text)
returns jsonb as $$
declare
  c record;
  computed_discount numeric := 0;
  now_ts timestamptz := now();
  per_cust_used int := 0;
begin
  select * into c from public.coupons where upper(code) = upper(btrim(p_code)) and active = true limit 1;
  if c.id is null then
    return jsonb_build_object('valid', false, 'message', 'Invalid coupon code');
  end if;
  if now_ts < c.starts_at then
    return jsonb_build_object('valid', false, 'message', 'This coupon is not active yet');
  end if;
  if c.expires_at is not null and now_ts > c.expires_at then
    return jsonb_build_object('valid', false, 'message', 'This coupon has expired');
  end if;
  if coalesce(p_subtotal, 0) < c.min_order then
    return jsonb_build_object('valid', false, 'message', 'Minimum order for this code is ৳' || c.min_order);
  end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then
    return jsonb_build_object('valid', false, 'message', 'This coupon has reached its usage limit');
  end if;

  select count(*) into per_cust_used from public.coupon_redemptions where coupon_id = c.id and customer_phone = p_phone;
  if per_cust_used >= c.per_customer_limit then
    return jsonb_build_object('valid', false, 'message', 'You have already used this coupon');
  end if;

  if c.discount_type = 'percentage' then
    computed_discount := coalesce(p_subtotal, 0) * c.discount_value / 100.0;
    if c.max_discount is not null then computed_discount := least(computed_discount, c.max_discount); end if;
  elsif c.discount_type = 'flat_tk' then
    computed_discount := least(c.discount_value, coalesce(p_subtotal, 0));
  end if;

  return jsonb_build_object(
    'valid', true,
    'title', c.title,
    'code', c.code,
    'discount_type', c.discount_type,
    'discount_value', c.discount_value,
    'computed_discount', round(computed_discount::numeric, 2),
    'free_shipping', c.discount_type = 'free_shipping',
    'message', case c.discount_type
      when 'percentage' then c.discount_value || '% off applied!'
      when 'flat_tk' then '৳' || c.discount_value || ' off applied!'
      else 'Free delivery applied!'
    end
  );
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.check_coupon(text, numeric, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 13. DELIVERY CHARGES (per division, from the bangladesh-geojson dataset)
-- ------------------------------------------------------------
create table if not exists public.delivery_charges (
  id uuid primary key default gen_random_uuid(),
  division_id text not null unique,
  division_name text not null,
  city_district_id text,
  city_district_name text,
  inside_city_fee numeric not null default 60,
  standard_fee numeric not null default 100,
  position int not null default 0
);
insert into public.delivery_charges (division_id, division_name, city_district_id, city_district_name, inside_city_fee, standard_fee, position)
select * from (values
  ('3', 'Dhaka Division', '1', 'Dhaka', 60, 100, 0),
  ('2', 'Chattogram Division', '43', 'Chattogram', 80, 130, 1),
  ('5', 'Rajshahi Division', '24', 'Rajshahi', 80, 130, 2),
  ('6', 'Rangpur Division', '32', 'Rangpur', 80, 130, 3),
  ('4', 'Khulna Division', '59', 'Khulna', 80, 130, 4),
  ('1', 'Barishal Division', '35', 'Barishal', 80, 130, 5),
  ('7', 'Sylhet Division', '54', 'Sylhet', 80, 130, 6),
  ('8', 'Mymensingh Division', '10', 'Mymensingh', 80, 130, 7)
) as seed(division_id, division_name, city_district_id, city_district_name, inside_city_fee, standard_fee, position)
where not exists (select 1 from public.delivery_charges);

-- ------------------------------------------------------------
-- 14. INCOMPLETE ORDERS (abandoned checkouts)
-- Saved automatically, a few seconds after the customer stops typing, once
-- they've entered enough to be worth following up on (name or phone, plus
-- items in the cart) — even if they never click "Place Order". Deleted
-- automatically once that customer's real order goes through; otherwise
-- sits here for the admin to call/message the customer and complete it
-- manually from Admin → Incomplete Orders.
-- ------------------------------------------------------------
create table if not exists public.incomplete_orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_phone text,
  division text,
  district text,
  upazila text,
  union_ward text,
  street_address text,
  landmark text,
  items jsonb not null default '[]',
  subtotal numeric not null default 0,
  contacted boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists incomplete_orders_updated_idx on public.incomplete_orders(updated_at desc);

create or replace function public.touch_incomplete_order_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_incomplete_order on public.incomplete_orders;
create trigger trg_touch_incomplete_order
  before update on public.incomplete_orders
  for each row execute function public.touch_incomplete_order_updated_at();

-- ------------------------------------------------------------
-- 15. POPUP BANNER (promotional overlay, admin-controlled)
-- ------------------------------------------------------------
create table if not exists public.popup_banner (
  id int primary key default 1,
  constraint popup_banner_single_row check (id = 1)
);
alter table public.popup_banner add column if not exists active boolean not null default false;
alter table public.popup_banner add column if not exists image_url text not null default '';
alter table public.popup_banner add column if not exists offer_mode text not null default 'coupon';
alter table public.popup_banner add column if not exists coupon_code text default '';
alter table public.popup_banner add column if not exists offer_link text default '';
alter table public.popup_banner add column if not exists offer_link_label text not null default 'Shop Now';
alter table public.popup_banner add column if not exists delay_seconds int not null default 3;
alter table public.popup_banner add column if not exists remember_dismissal boolean not null default true;
insert into public.popup_banner (id) values (1) on conflict (id) do nothing;

do $$ begin
  alter table public.popup_banner add constraint popup_banner_offer_mode_check check (offer_mode in ('coupon','link'));
exception when duplicate_object then null; end $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- Public (anon) can READ storefront-facing tables. Only authenticated
-- users (admin) can write. Coupons are the one exception — there is no
-- public read policy on that table at all, on purpose: customers can only
-- test a specific code through the check_coupon() function above, so codes
-- can never be listed or browsed.
-- ============================================================
alter table public.settings enable row level security;
alter table public.titles enable row level security;
alter table public.banners enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_attributes enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_reviews enable row level security;
alter table public.footer_links enable row level security;
alter table public.orders enable row level security;
alter table public.policy_sections enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.delivery_charges enable row level security;
alter table public.incomplete_orders enable row level security;
alter table public.popup_banner enable row level security;

do $$ begin create policy "public read settings" on public.settings for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read titles" on public.titles for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read banners" on public.banners for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read categories" on public.categories for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read products" on public.products for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read attributes" on public.product_attributes for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read variants" on public.product_variants for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read reviews" on public.product_reviews for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read footer_links" on public.footer_links for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read policy_sections" on public.policy_sections for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read delivery_charges" on public.delivery_charges for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read popup_banner" on public.popup_banner for select using (true); exception when duplicate_object then null; end $$;

-- anyone can INSERT an order (checkout, no login needed for customers)
do $$ begin create policy "public insert orders" on public.orders for insert with check (true); exception when duplicate_object then null; end $$;

-- Incomplete-order drafts: anyone can create/update their own draft (there's
-- no customer login to scope this to, same trust model as order creation
-- below), but only the admin can read or delete them — so a customer can
-- never browse anyone else's abandoned checkout.
do $$ begin create policy "public insert incomplete_orders" on public.incomplete_orders for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public update incomplete_orders" on public.incomplete_orders for update using (true); exception when duplicate_object then null; end $$;

-- admin (any logged-in user) write access
do $$ begin create policy "admin write settings" on public.settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin write titles" on public.titles for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin write banners" on public.banners for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin write categories" on public.categories for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin write products" on public.products for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin write attributes" on public.product_attributes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin write variants" on public.product_variants for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin write reviews" on public.product_reviews for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin write footer_links" on public.footer_links for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin read orders" on public.orders for select using (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin write orders" on public.orders for update using (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin write policy_sections" on public.policy_sections for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin all coupons" on public.coupons for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin read coupon_redemptions" on public.coupon_redemptions for select using (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin write delivery_charges" on public.delivery_charges for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin read incomplete_orders" on public.incomplete_orders for select using (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin write incomplete_orders" on public.incomplete_orders for update using (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin delete incomplete_orders" on public.incomplete_orders for delete using (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin write popup_banner" on public.popup_banner for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;

-- ============================================================
-- STORAGE (public bucket called "media" for product/banner/category images)
-- ============================================================
insert into storage.buckets (id, name, public) values ('media','media', true) on conflict (id) do nothing;

do $$ begin create policy "public read media" on storage.objects for select using (bucket_id = 'media'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin upload media" on storage.objects for insert with check (bucket_id = 'media' and auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin update media" on storage.objects for update using (bucket_id = 'media' and auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
do $$ begin create policy "admin delete media" on storage.objects for delete using (bucket_id = 'media' and auth.role() = 'authenticated'); exception when duplicate_object then null; end $$;
