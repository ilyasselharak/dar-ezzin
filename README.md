# Dar Ezzin — Ecommerce platform

Moroccan home-appliance store: customer storefront (French, MAD, cash on delivery) + full administration dashboard.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · Tailwind CSS 4 · shadcn/ui · PostgreSQL · Prisma 7 · Better Auth · Cloudflare R2 · React Hook Form + Zod · TanStack Query · Zustand.

---

## Quick start (local)

```bash
cp .env.example .env          # fill DATABASE_URL + BETTER_AUTH_SECRET (openssl rand -base64 32)
npm install                   # also runs `prisma generate`
npm run db:migrate            # create tables
npm run db:seed               # admin account, categories, brands, 20 demo products
npm run dev                   # http://localhost:3000
```

For local development set `STORAGE_DRIVER="local"` and `NEXT_PUBLIC_IMAGE_BASE_URL="http://localhost:3000/uploads"`: images are written to `public/uploads` through the same presigned-upload flow used with R2.

Sign in at `/connexion` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, then open `/admin`. **Change the seed password before going live.** Run the seed with `SEED_DEMO=false` in production to skip demo products.

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Develop, build (runs `prisma generate`), serve |
| `npm run typecheck` / `lint` | Route-type generation + `tsc`, ESLint |
| `npm run db:migrate` | Create a migration in development |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Idempotent seed |
| `npm run db:studio` | Prisma Studio |

---

## Features

### Storefront
- Home (hero, categories, featured, deals, best sellers, new arrivals, brands), category and brand pages with subcategories, search with live suggestions, promotions.
- URL-driven filters (brands, price range, in stock, on sale), sorting, and crawlable pagination.
- Product page: swipeable gallery, stock urgency, specs table, "Buy now", WhatsApp order, sticky mobile CTA, related products.
- Persistent cart drawer with a free-shipping progress bar; the server re-prices the cart (stock and price changes are synced back to the client).
- Distraction-free checkout with **cash on delivery**, Moroccan phone validation, a city list and a honeypot field.
- Order confirmation (details visible only to the buyer), order tracking by number + phone, customer account with order history.

### Administration (`/admin`, roles `STAFF` and `ADMIN`)
- **Dashboard:** 30-day revenue, order count and average basket, orders awaiting confirmation, stock alerts, 14-day revenue chart, top products.
- **Orders:** status tabs and search; detail page with an enforced status workflow (`PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED`, plus cancel/return that **restocks automatically**), timeline, internal notes, call/WhatsApp buttons, editable customer info.
- **Products:** list with filters; create/edit form with images (drag & drop, reorder, replace, delete, alt text), specs editor, pricing with margin, SEO fields with a Google preview, duplicate, delete (archived instead if the product was ever sold).
- **Categories** (2 levels, icons, image, SEO) and **Brands** (logo, SEO).
- **Inventory:** stock adjustments with reasons and a full movement log (sales, cancellations, restocks, corrections).
- **Customers:** accounts, role management (admin only), top guest customers by phone.
- **Settings** (admin only): store info, announcement bar, shipping fee, free-shipping threshold, phone/WhatsApp, social links.

---

## Architecture

```
prisma/schema.prisma        Data model (prices in centimes — integers, never floats)
prisma/seed.ts              Seed script
src/proxy.ts                Optimistic auth redirect for /admin and /compte (Next 16 "proxy")
src/lib/
  auth.ts, session.ts       Better Auth + role helpers (requireStaffPage / assertStaff / assertAdmin)
  storage/                  R2 + local drivers, presigned uploads, sharp variant generation
  images.ts                 Image URLs (Cloudflare transformations or pre-generated WebP)
  seo.ts                    Metadata builder, JSON-LD (Store, WebSite, Product, Breadcrumb, ItemList)
  validators/               Zod schemas shared by forms and server actions
src/server/
  queries/                  Read models (storefront queries cached with tags)
  actions/                  Server Actions — every mutation re-checks the role server-side
src/app/(store)             Storefront          src/app/(checkout)  Checkout & confirmation
src/app/(auth)              Sign-in / sign-up   src/app/admin       Back office
src/app/api                 Auth, uploads, search suggestions
```

**Security**
- Roles are enforced in every admin page, server action and route handler. The proxy only does an optimistic redirect.
- The `role` field cannot be set at sign-up (`input: false`). A role change revokes the user's sessions.
- Session lookups bypass the cookie cache, so revoked or demoted users lose access immediately.
- Checkout: all prices are recomputed on the server, and an atomic conditional stock decrement inside a transaction prevents overselling. There is also IP rate limiting and a honeypot.
- Upload keys are generated server-side. Completing an upload checks the key format, then validates the file with sharp (real image check, 10 MB max).
- Security headers (HSTS, nosniff, frame options, referrer and permissions policy); `/admin` is `noindex`.
- The in-memory rate limiter fits a single instance. With several instances, use Cloudflare rate-limiting rules or Redis.

**Caching:** storefront queries use `unstable_cache` tagged `catalog` / `settings`; admin mutations expire the tags immediately. Product pages use ISR. Cache Components (`cacheComponents`) is intentionally **not** enabled because this caching model doesn't combine with it.

**Logging:** `src/lib/logger.ts` writes structured JSON in production, which your host's log drain can collect. Unexpected action errors are logged with context, and users only ever see safe messages.

---

## Cloudflare R2 setup (production images)

1. **Create a bucket**, e.g. `dar-ezzin-images`.
2. **Custom domain:** in the bucket's *Settings → Public access → Custom domains*, connect `images.darezzin.ma` (the zone must be on Cloudflare).
3. **API token:** in *R2 → Manage API tokens*, create a token with *Object Read & Write* on this bucket only. Fill `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. These are server-only variables and are never exposed to the browser.
4. **CORS** (required for direct browser uploads), in the bucket's *Settings → CORS policy*:
   ```json
   [{
     "AllowedOrigins": ["https://darezzin.ma", "https://www.darezzin.ma"],
     "AllowedMethods": ["PUT"],
     "AllowedHeaders": ["content-type", "cache-control"],
     "MaxAgeSeconds": 3600
   }]
   ```
5. **Image Transformations:** in the zone settings for `darezzin.ma`, under *Images → Transformations*, enable transformations for the zone. Then set `NEXT_PUBLIC_CF_IMAGE_TRANSFORMS="true"`. Images are then served as `/cdn-cgi/image/width=…,format=auto/…`, which delivers AVIF or WebP depending on the browser. With it set to `false`, the WebP variants generated at upload time (480 px and 1200 px) are used instead.
6. Set `STORAGE_DRIVER="r2"` and `NEXT_PUBLIC_IMAGE_BASE_URL="https://images.darezzin.ma"`.

Upload flow: the browser asks `/api/admin/uploads` for a 5-minute presigned PUT URL, uploads directly to R2, then calls `/api/admin/uploads/complete`. That endpoint verifies the object, reads its dimensions and generates the WebP variants. Image metadata is stored in PostgreSQL, and images removed from a product are deleted from R2 when the product is saved.

---

## Deployment

Any Node.js 20.9+ host that supports Next.js 16 works (Vercel, Railway, Render, Fly.io, or a VPS with `next start`). `sharp` needs a Node runtime, not the edge runtime.

1. Provision PostgreSQL (Neon, Supabase, RDS…) and set `DATABASE_URL`.
2. Set every variable from `.env.example`, with `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` set to the public URL.
3. Build with `npm run build`, run `npm run db:deploy` on each release, and run `npm run db:seed` once.
4. **Cloudflare DNS/CDN:** proxy `darezzin.ma` through Cloudflare (orange cloud), use SSL mode *Full (strict)*, and leave HTML uncached at the edge unless you add cache rules. Static assets under `/_next/static` are immutable.
5. Submit `https://darezzin.ma/sitemap.xml` in Google Search Console.

---

## SEO checklist

- Unique title and description per page, canonical URLs, Open Graph/Twitter cards, and a generated OG image.
- JSON-LD: `Store`, `WebSite` + `SearchAction`, `Product` (offer in MAD, availability, shipping, return policy, warranty), `BreadcrumbList`, `ItemList`.
- Dynamic `sitemap.xml` (with product images), `robots.txt`, and a web manifest.
- Filtered, sorted and search pages are `noindex` with a canonical pointing to the clean URL; cart, checkout, account and admin are excluded.
- Clean French URLs: `/categorie/…`, `/produit/…`, `/marque/…`, `/promotions`.
- Fast by default: server components, ISR, AVIF/WebP via Cloudflare, `next/font` with swap, and `priority` set on LCP images.

**Before launch:** fill the `[À COMPLÉTER]` placeholders in `src/lib/content/pages.ts` (legal entity, RC/ICE, CNDP declaration, return terms), and set the real phone, WhatsApp, email and address in **Admin → Paramètres**.
