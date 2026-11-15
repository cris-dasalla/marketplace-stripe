# Marketplace + Stripe Connect

A mini Facebook-style marketplace. Visitors post items for sale with a photo, browse by category, search by keyword, open a page for each listing, and message the seller. No login is needed.

This version (Test 4) builds on the Test 3 marketplace and adds **payments with Stripe Connect**. Sellers onboard with Stripe, and their listings get a **Buy Now** button. Buyers pay through Stripe Checkout, the seller is paid minus a 10% platform fee, and a webhook records the order and marks the item **Sold**. Everything runs in Stripe's sandbox (test mode).

Built with React 19, Next.js (App Router, Cache Components), TypeScript, Supabase (Postgres and Storage), the Stripe Node SDK, Tailwind CSS and shadcn/ui.

## Payments (Stripe Connect)

```
Seller: /sell → enter listing email → "Connect with Stripe"
        → Stripe-hosted Express onboarding → /sell/return (status synced from Stripe)
        → every listing with that email now shows Buy Now

Buyer:  listing → "Buy Now" (server action) → Stripe Checkout on the seller's account
        → pay with 4242 4242 4242 4242 → /orders/success (re-verified with Stripe)

Stripe → POST /api/stripe/webhook (signature-verified)
        checkout.session.completed → insert order, set listings.sold_at
        account.updated            → sync seller.charges_enabled
```

- **Direct charges.** The Checkout Session is created *on the seller's connected account* (`stripeAccount`), with `application_fee_amount` set to 10% of the price, so the seller receives the price minus the fee. Price, seller and fee are always read from the database on the server, never from the browser.
- **Seller identity without login.** Sellers are matched by the email on their listings, as the spec allows. To prevent hijacking: once an email's Stripe account can take payments, the app never issues another onboarding link for it, so nobody else can type that email in and change the payout details. (With real logins, onboarding would sit behind authentication.)
- **The webhook is the source of truth.** It checks the Stripe signature against the raw body, and handles `checkout.session.completed` (plus `async_payment_succeeded`) and `account.updated`. The sandbox is shared with other candidates, so the handler only accepts a session that:
  - has our app's metadata
  - references a real listing
  - was paid to **that listing's own seller account**
  - is for **that listing's exact price**

  Anything else gets a `200` and is ignored.
- **Idempotent orders.** `orders.stripe_session_id` is unique. The success page also verifies the session with Stripe and records the order if the webhook hasn't arrived yet. `orders.recorded_by` shows which path saved it first. Repeat deliveries do nothing.
- **Sold items** show a red SOLD badge in the grid and on their page, and can't be bought again. Checkout Sessions expire after 30 minutes.
- **Private data stays server-side.** `sellers` and `orders` have RLS enabled and no public grants. Only the server, using `SUPABASE_SECRET_KEY`, reads or writes them, or sets `sold_at`.

### Stripe setup

1. Run [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/stripe.sql`](supabase/stripe.sql), in the Supabase SQL Editor.
2. Add the variables from [`.env.example`](.env.example) to `.env.local` and to Vercel.
3. Deploy, then register the Connect webhook once:

   ```bash
   node --env-file=.env.local scripts/create-webhook.mjs https://YOUR-APP.vercel.app
   ```

   Save the printed `whsec_…` as `STRIPE_WEBHOOK_SECRET` (in Vercel too) and redeploy.
4. Onboard a seller at `/sell`. In test mode, use Stripe's "Use test …" buttons, verification code `000000`, and address `address_full_match`.

## Features

- **Create a listing.** *Choose listing type* (Item, Vehicle, Home) opens a form for photo, title, price, category, location, contact email and description, with a **live preview** beside it.
  - Photos are re-drawn in the browser before upload. This strips location (EXIF) metadata and shrinks large phone photos to 1600 px.
- **Browse.** A *Today's picks* grid shows newest listings first.
  - On desktop, a category sidebar lists 18 categories. On phones, they become horizontal tabs.
  - Category filters and searches live in the URL (`/?category=electronics&q=bike`), so they can be shared and bookmarked.
- **Keyword search** (bonus) matches title, description and location.
- **Listing page.** Each listing has its own page with a large photo, price, "Listed 2 hours ago in …", category, description and seller email.
- **Message Seller.** A buyer leaves their email and a message, which is saved in Supabase through a server action.
- **Seller email** (bonus, optional). When Gmail credentials are configured, the seller also gets an email. Its *Reply-To* is the buyer, so the seller can just hit Reply.

## Setup

1. **Create a Supabase project.**
2. **Create the database.** Open *SQL Editor → New query*, paste [`supabase/schema.sql`](supabase/schema.sql), and click *Run*. It's safe to re-run.
3. **Add your keys.** Copy `.env.example` to `.env.local` and add the project URL and **publishable** key.
4. **Run it:**

   ```bash
   npm install
   npm run dev        # http://localhost:3000
   ```

5. **(Optional) Seller emails.** Add these two server-only variables:

   ```bash
   GMAIL_USER=you@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   # Google Account → Security → App passwords
   ```

   Without them, messages are still saved. Email is simply skipped.

| Command         | What it does                   |
| --------------- | ------------------------------ |
| `npm run dev`   | Start the dev server           |
| `npm run build` | Production build               |
| `npm test`      | Run the Vitest unit tests      |
| `npm run lint`  | ESLint                         |

## How it works

```
app/page.tsx                     Browse: search, category sidebar/tabs, listing grid
app/listing/[id]/page.tsx        Listing detail
app/listing/[id]/actions.ts      Server action: save message (+ optional email)
app/create/page.tsx              Choose listing type
app/create/[type]/…form.tsx      Create form with live preview
lib/listings.ts                  Pure rules: validation, price parsing, search cleaning (tested)
lib/supabase.ts                  Queries, photo upload, listing insert
lib/image.ts                     In-browser photo resize + metadata strip
lib/email.ts                     Optional Gmail notification (server-only)
supabase/schema.sql              Tables, RLS policies, rate limits, storage bucket
```

**Rendering.** Pages are prerendered shells (Next.js Partial Prerendering). Listings stream in from Supabase on each request inside `<Suspense>`, so new listings show up immediately.

**Data model.**

```
listings (id, title, description, price numeric, category, seller_email, location, image_path, created_at)
messages (id, listing_id → listings, buyer_email, body, created_at)
```

**Security.** The browser only has the public publishable key, so the database does the enforcing:

- Row Level Security allows anyone to read and create listings. Messages can only be inserted, never read through the public API, so buyers' emails stay private. Read messages in the Supabase dashboard.
- Nobody can edit or delete. Inserts are restricted to specific columns, so `id` and `created_at` can't be forged.
- `CHECK` constraints validate:
  - title, description and location lengths
  - price range
  - email format
  - category, against the fixed list
  - the format of the photo's file name
- Database triggers rate-limit spam: at most 20 messages per listing per hour, and 30 new listings per 10 minutes across the whole site.
- Search terms are cleaned before they reach the PostgREST filter, so they can't inject extra filter syntax.
- The seller email's recipient is looked up on the server from the listing ID. The browser never chooses who gets emailed.

## Tests

`lib/listings.test.ts` covers:

- listing and message validation
- price parsing and formatting ("$1,200", "$99.50", "Free")
- search-term cleaning
- "listed … ago" timestamps
- category consistency

```bash
npm test
```
