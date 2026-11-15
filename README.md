# Marketplace

A mini Facebook-style marketplace. Visitors post items for sale with a photo, browse by category, search by keyword, open a page for each listing, and message the seller. No login is needed.

Built with React 19, Next.js (App Router, Cache Components), TypeScript, Supabase (Postgres and Storage), Tailwind CSS and shadcn/ui.

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
