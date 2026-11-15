-- Marketplace — database setup.
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once. It does not touch the Test 2 `posts` table.

-- 1. Listings ----------------------------------------------------------------
create table if not exists public.listings (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null default '',
  price        numeric(12, 2) not null,
  category     text not null,
  seller_email text not null,
  location     text not null default '',
  image_path   text not null,
  created_at   timestamptz not null default now(),

  constraint listings_title_length       check (char_length(btrim(title)) between 1 and 100),
  constraint listings_description_length check (char_length(description) <= 2000),
  constraint listings_price_range        check (price >= 0 and price <= 10000000),
  constraint listings_location_length    check (char_length(location) <= 80),
  constraint listings_email_format       check (char_length(seller_email) <= 254
                                                and seller_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint listings_image_path_format  check (image_path ~ '^[A-Za-z0-9_-]{1,64}\.(jpg|png|gif|webp)$'),
  constraint listings_category_valid     check (category in (
    'vehicles', 'property-rentals', 'apparel', 'classifieds', 'electronics', 'entertainment',
    'family', 'free-stuff', 'garden-outdoor', 'hobbies', 'home-goods', 'home-improvement',
    'home-sales', 'musical-instruments', 'office-supplies', 'pet-supplies', 'sporting-goods',
    'toys-games'))
);

create index if not exists listings_created_at_idx on public.listings (created_at desc);
create index if not exists listings_category_idx   on public.listings (category, created_at desc);

-- 2. Messages from buyers ----------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings (id) on delete cascade,
  buyer_email text not null,
  body        text not null,
  created_at  timestamptz not null default now(),

  constraint messages_email_format check (char_length(buyer_email) <= 254
                                          and buyer_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint messages_body_length  check (char_length(btrim(body)) between 1 and 1000)
);

create index if not exists messages_listing_idx on public.messages (listing_id, created_at desc);

-- 3. Access ------------------------------------------------------------------
-- Listings: anyone can browse and create. Nobody can edit or delete.
-- Messages: anyone can send. Nobody can read them through the public API,
--           so buyers' emails are never exposed (read them in the dashboard).
alter table public.listings enable row level security;
alter table public.messages enable row level security;

revoke all on public.listings from anon, authenticated;
revoke all on public.messages from anon, authenticated;
grant select on public.listings to anon, authenticated;
grant insert (title, description, price, category, seller_email, location, image_path)
  on public.listings to anon, authenticated;
grant insert (listing_id, buyer_email, body) on public.messages to anon, authenticated;

drop policy if exists "Anyone can browse listings" on public.listings;
create policy "Anyone can browse listings" on public.listings
  for select to anon, authenticated using (true);

drop policy if exists "Anyone can create a listing" on public.listings;
create policy "Anyone can create a listing" on public.listings
  for insert to anon, authenticated with check (true);

drop policy if exists "Anyone can message a seller" on public.messages;
create policy "Anyone can message a seller" on public.messages
  for insert to anon, authenticated with check (true);

-- 4. Light spam protection ---------------------------------------------------
-- At most 20 messages per listing per hour, and 30 new listings per 10 minutes overall.
create or replace function public.limit_message_rate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.messages
      where listing_id = new.listing_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many messages for this listing. Please try again later.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit before insert on public.messages
  for each row execute function public.limit_message_rate();

create or replace function public.limit_listing_rate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.listings where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Lots of new listings right now. Please try again in a few minutes.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists listings_rate_limit on public.listings;
create trigger listings_rate_limit before insert on public.listings
  for each row execute function public.limit_listing_rate();

revoke execute on function public.limit_message_rate() from public, anon, authenticated;
revoke execute on function public.limit_listing_rate() from public, anon, authenticated;

-- 5. Listing photos: public bucket, images only, 5 MB max --------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can upload listing images" on storage.objects;
create policy "Anyone can upload listing images" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'listing-images');
