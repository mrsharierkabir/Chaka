# Shohaz Bazar — E-commerce Website

A full React + Supabase e-commerce site: storefront (home, shop, product page, cart,
checkout) and an admin panel to manage everything without touching code.

## 1. Set up Supabase (one-time — and the only way you ever need to run this)

1. Go to your project: https://supabase.com/dashboard/project/ivpiwardlmjsogogxpjm
2. Open **SQL Editor** → paste the **entire** contents of `supabase/schema.sql` → **Run**.
   This is the only database step there is. The file is a single,
   self-contained script: run it on a brand-new project and it builds
   everything from scratch; run it again later (e.g. after downloading an
   updated copy of the project) and it safely picks up whatever changed,
   with no errors and no risk to your existing products, orders, or
   customers. You never need to hunt for "just run this part" — always run
   the whole file, every time.
3. Create your admin login: **Authentication → Users → Add user** (email + password).
   This is the account you'll use to log into `/admin/login`. Customer checkout does
   **not** require an account — only the admin panel does.
4. Turn on Realtime for the orders table so the dashboard can pop up new orders
   live: **Database → Replication** → find the `orders` table → toggle it on.
   (If you skip this, orders still show up fine everywhere — you'd just need to
   refresh the Dashboard to see the "new order" popup instead of it appearing
   automatically.)
5. Run `npm install` (the checkout's Division/District/Upazila dropdowns use
   the `bangladesh-geojson` package, which needs installing like any other
   dependency).

**If you already had this database set up from before:** just run the file
again as-is — nothing extra to do. Two things are worth double-checking
afterward, since they involve real content rather than structure:
- **Admin → Site Settings** — if "Logo Line 1" said "SHOHOZ", it's now been
  auto-corrected to "SHOHAZ".
- **Products → any variable product** — the variant/SKU system was rebuilt
  from the ground up at one point; if you had configured product options
  under the *old* single-value system before that change, they won't have
  carried over (nothing else about your products was touched). Re-add them
  through **Attributes Manager** on that product's edit page if needed.

> ⚠️ **Security note:** the database password you shared in chat
> (`qemcod-haqkuj-zupsE5`) is a *Postgres* password — this frontend never uses it
> (only the public "publishable" API key is used, which is safe to expose). Since
> that password was pasted into a chat, I'd recommend rotating it from
> **Project Settings → Database → Reset password** just to be safe, and avoid
> pasting real passwords into chats going forward.

## 2. Run the site locally

```bash
npm install
npm run dev
```

Open the printed local URL (usually http://localhost:5173).

## 3. Build for production / deploy

```bash
npm run build
```

This outputs a static site in `dist/` — deployable to Vercel, Netlify, Cloudflare
Pages, or any static host. No server/back-end needed; everything talks directly to
Supabase.

> This project includes `vercel.json` and `public/_redirects` so that direct or
> hard-refreshed links to internal pages (like `/terms`) work correctly on
> Vercel or Netlify. If you deploy elsewhere, make sure your host redirects all
> unknown paths to `index.html` (standard single-page-app config) — otherwise
> footer links opened directly can 404.

## 4. Using the Admin Panel

- Click **Admin Panel** (top right of the site) → sign in with the account you
  created in step 1.
- **Site Settings** — hotline number, WhatsApp number, "24 hours open" text, "Cash
  on delivery" label, logo text, footer text, and two separate logo images: a
  **header logo** (shown in the top nav next to the site name — upload/remove
  it anytime, it never affects anything else) and a **small icon** used in the
  "Daily Essentials" banner on the home page.
- **Rotating Titles** — the announcement strip under the header; each active title
  rotates automatically every 5 seconds. Add/edit/delete/reorder freely.
- **Banners** — hero banner carousel on the home page. Upload images, optional
  headline/subheadline/link. Auto-advances every 5s; visitors can also use the
  arrows. Use the ↑/↓ buttons to reorder. This page also has a **Popup Banner**
  section at the top — a promotional overlay shown to storefront visitors:
  - **Global ON/OFF switch** — nothing shows at all while it's off.
  - **Image** — a 4:3 photo is recommended; it's shown at a fixed 4:3 size on
    both desktop and mobile so it never gets stretched or cropped oddly.
  - **Offer type** — either a copyable coupon code, or a button linking
    anywhere (an internal page like `/shop?category=...`, or a full external
    URL).
  - **Delay** — how many seconds after the page loads before it appears.
  - **"Don't show again today"** — when on, closing the popup hides it for
    the rest of that day (per browser, via localStorage). When off, it still
    won't reappear again in the same browser tab session, but will show
    again on the next visit.
  It never covers the whole page — it's a centered card with a backdrop, and
  clicking outside the card closes it too.
- **Categories** — icon + name shown in the sidebar, "Browse Category" grid, and
  shop page filters. Also has an optional **SKU Prefix** (e.g. "TSH" for
  T-Shirts) — if you leave it blank, one is auto-derived from the category
  name instead when a product's SKU is generated.
- **Products** — see the dedicated "Product system" section below; this is
  now a much bigger part of the admin panel (simple vs. variable products,
  SKUs, attributes, per-variant stock).
- **Footer Links** — controls the "Quick Links" column only. The "Policies"
  column is fixed (Terms & Conditions / Privacy Policy / Returns & Refunds) —
  edit its content from Policy Pages below.
- **Policy Pages** — edit the Terms & Conditions (numbered table-of-contents
  style), Privacy Policy, and Returns & Refunds pages. Add/edit/delete/reorder
  sections; each section has a heading and content — start every content line
  with "-" for a bulleted list, or leave it plain for a paragraph.
- **Orders** — organized into tabs: Pending / Shipped / Delivered / Returned /
  Cancelled, each with a live count. Search by invoice number, customer name,
  or phone, and optionally filter to one date. Each order shows its
  auto-generated invoice number (SB001, SB002, ...), the customer's landmark
  note, its full delivery area, and a price breakdown (subtotal + delivery −
  discount), and lets you change its status from a dropdown right in the table.
- **Incomplete Orders** — customers who started checkout (entered a name or
  phone, with items in their cart) but never clicked "Place Order" show up
  here automatically, a couple seconds after they stop typing. Call or
  WhatsApp them straight from the list, mark them "Contacted", and use
  **"Complete Order →"** to fill in whatever's still missing and turn it into
  a real order yourself — it then disappears from this list and shows up in
  Orders like normal. If the customer finishes checkout themselves, their
  draft is removed automatically.
- **Coupons** — percentage off (with an optional max discount cap), flat ৳
  off, or free delivery. Set a minimum order amount, a total usage limit, and
  a per-customer limit, plus an optional start/expiry window. Codes can be
  typed or auto-generated. All limits are enforced server-side at the moment
  an order is placed — never trusting the browser — so they can't be bypassed.
- **Delivery Charges** — set two fees per division: an "Inside Major City"
  rate (used when the customer's district matches that division's main city,
  e.g. Dhaka district within Dhaka Division) and a "Standard" rate for
  everywhere else in that division. Pre-seeded with all 8 divisions.

### New-order notifications

The Dashboard shows a 🔔 badge and automatically pops up a card whenever a new
order comes in while you're on that page (via Supabase Realtime), or whenever
there are unread orders when you open it. Mark individual orders as read from
the popup, or use "Mark all as read".

### Mobile admin panel

The sidebar becomes a slide-out drawer on phones — tap the ☰ icon in the top
bar to open it, tap outside or the ✕ to close.

## 5. Checkout (cascading address, delivery pricing, coupons)

The checkout form uses the `bangladesh-geojson` dataset for cascading
Division → District → Upazila dropdowns (Union/Ward is a free-text field,
since that level of data isn't available). Selecting a Division and District
looks up the matching row from **Delivery Charges** to price shipping
automatically — "Inside Major City" if the District matches that division's
main city, "Standard" otherwise.

Customers can enter a coupon code in the order summary; "Apply" calls a
read-only database check (so codes can't be listed/browsed, only tested one
at a time) and shows the discount immediately. The actual rules — active
window, minimum order, total/per-customer usage limits — are re-verified
from scratch on the server the moment the order is actually placed, so
nothing about the discount can be manipulated from the browser.

## 6. Product system (SKUs, simple vs. variable, stock)

### Adding a product

Go to **Admin → Products → + Add Product**. First choose a type:

- **Simple Product** — one price, one stock count. Fill in name, category,
  SKU (or leave blank to auto-generate one like `TSH-00102`), description
  (rich text — bold/italic/underline/lists/headings/links), regular +
  discounted price, stock, images (first one is the main image, the rest
  become the gallery), whether it's a Featured Pick, and delivery info.
- **Variable Product** — has options like Size or Color, where each
  combination needs its own price/stock/SKU (e.g. a T-shirt in Red/Small vs.
  Blue/Large). Fill in the same name/category/description/images/featured/
  delivery info, then **save the product first** — the Attributes Manager
  and Variants table only appear once it has an ID to attach to.

### Setting up variants

On a variable product's edit page, after saving:

1. **Attributes Manager** — add each option type with its values, e.g.
   name `Size`, values `S, M, L`. Add as many attributes as you need (e.g.
   also `Color` with `Red, Blue`).
2. Click **Save & Generate Variants** — this creates one row per
   combination (S+Red, S+Blue, M+Red, M+Blue, L+Red, L+Blue, ...) in the
   Variants table below, each with a suggested SKU built from the parent SKU
   + attribute values (e.g. `TSH-00102-RED-S`). **SKU fields are always
   editable** — override any of them if you already have your own product
   codes or supplier SKUs.
3. Fill in each variant's regular price, discounted price, stock, and
   optionally its own photo (e.g. a photo of the red one). Fields save
   automatically when you click away from them.
4. Running Attributes Manager again after adding a new attribute value only
   creates the *new* combinations — it won't duplicate or wipe out variants
   you've already priced.

The parent product's price/stock shown everywhere else (home page, shop
grid, cards) is kept in sync automatically — it always shows "From [lowest
variant price]" and the total stock across all variants. You never have to
update this by hand.

### How this shows up for shoppers

- **Simple products** show a normal **"Add to Bag"** button everywhere
  (cards and the product page) — clicking it adds the product straight to
  the cart.
- **Variable products** show a **"Select Option"** button on cards (which
  takes the shopper to the product page instead of adding anything to the
  cart directly, since you can't add a T-shirt without knowing the size).
  On the product page, they pick a value for every attribute; once a valid
  combination is selected, the price/stock/image update to match that exact
  variant and "Add to Bag"/"Buy Now" become available.

### Stock system

Stock is no longer just a display number — it's now enforced end-to-end:

- Simple products: stock is on the product itself.
- Variable products: stock lives on each variant; the parent product's
  stock is always the sum of all its variants (kept in sync automatically).
- **Stock only decreases when an order's status is changed to
  "Delivered"** in Admin → Orders (not at checkout, since Cash-on-Delivery
  orders can still fall through before that point). This happens via a
  database trigger, so it works no matter which admin changes the status,
  and it only fires once per order even if the status is changed back and
  forth later.
- A product/variant that hits 0 stock automatically shows "Out of Stock" on
  the storefront and disables its Add to Bag / Buy Now buttons.

## 7. How the storefront works

- **Cart** is stored in the browser (localStorage) — no login needed to shop.
  Clicking the cart icon or the floating tab on the right opens the popup cart;
  "View Full Cart" goes to the full `/cart` page.
- **Checkout** collects name/phone/address/an optional note and creates a
  Cash-on-Delivery order in Supabase. The phone field only accepts digits, is
  capped at 11 characters, and must start with "01" (e.g. `01712345678`) —
  it's checked as the person types and again before the order submits.
- **WhatsApp Order** button on the product page opens a WhatsApp chat pre-filled
  with the product name, using the number set in Site Settings.

## 8. Project structure

```
src/
  lib/            supabaseClient.js, helpers.js (price/discount/upload utils)
  context/        CartContext, SiteContext (settings + admin auth)
  components/     Header, TopBar, RotatingTitle, CartPopup, HeroBanner,
                  CategorySidebar, BrowseCategories, TrustBar, ProductCard, Footer
  pages/          Home, Shop, AllCategories, ProductPage, CartPage, Checkout,
                  AdminLogin
  admin/          AdminLayout, Dashboard, ManageSettings, ManageTitles,
                  ManageBanners, ManageCategories, ManageProducts,
                  ManageProductForm, ManageFooterLinks, ManageOrders
supabase/
  schema.sql      run once in the Supabase SQL editor
```

Every screen/component lives in its own file as requested.

## 9. Notes

- The **Admin Panel** button currently goes straight to a login form, exactly as
  requested ("later I remove the button and add login section").
- Category "View All" links to `/categories`.
- Product URLs use a slug when available, falling back to the product's ID.
- The discount badge and % are computed automatically from regular vs. discounted
  price — no manual entry needed.
- Nothing is hard-coded/seeded: banners, categories, products, titles, and footer
  links all start empty and are fully controlled from the Admin Panel.
