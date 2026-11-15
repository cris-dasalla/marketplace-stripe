-- Test 4 — Stripe Connect additions. Run AFTER supabase/schema.sql.
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run more than once.
-- Nothing here is readable or writable with the public (publishable) key:
-- the app's server uses the secret key for sellers, orders and marking items sold.

-- 1. Listings can be sold ----------------------------------------------------
alter table public.listings add column if not exists sold_at timestamptz;
-- (anon keeps SELECT on listings, so everyone can see the Sold badge, but has no
--  UPDATE privilege — only the server, after Stripe confirms payment, sets sold_at.)

-- 2. Sellers: listing email → Stripe connected account -----------------------
create table if not exists public.sellers (
  email             text primary key,
  stripe_account_id text not null unique,
  charges_enabled   boolean not null default false,
  details_submitted boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint sellers_email_lowercase check (email = lower(btrim(email))),
  constraint sellers_account_format  check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$')
);

-- 3. Orders: one row per completed Checkout Session --------------------------
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  listing_id        uuid references public.listings (id) on delete set null,
  stripe_session_id text not null unique,
  stripe_account_id text not null,
  payment_intent_id text,
  amount_total      integer not null,          -- in cents
  application_fee   integer not null,          -- platform fee, in cents
  currency          text not null,
  buyer_email       text,
  status            text not null default 'paid',
  recorded_by       text not null default 'webhook',  -- 'webhook' or 'success_page' (backstop)
  created_at        timestamptz not null default now()
);

create index if not exists orders_listing_idx on public.orders (listing_id);
alter table public.orders add column if not exists recorded_by text not null default 'webhook';

-- 4. Access: server-only -----------------------------------------------------
alter table public.sellers enable row level security;
alter table public.orders  enable row level security;
revoke all on public.sellers from anon, authenticated;
revoke all on public.orders  from anon, authenticated;

-- The secret key acts as service_role (bypasses RLS) but still needs privileges,
-- because this project doesn't auto-expose new tables.
grant select, insert, update on public.sellers to service_role;
grant select, insert, update on public.orders  to service_role;
grant select, insert, update on public.listings to service_role;
grant select, insert on public.messages to service_role;
