import { Suspense } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategorySidebar, CategoryTabs } from "@/components/category-nav";
import { ListingCard } from "@/components/listing-card";
import { categoryName, isCategory } from "@/lib/categories";
import { getListings, supabase } from "@/lib/supabase";

type SearchParams = Promise<{ category?: string | string[]; q?: string | string[] }>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function readFilters(searchParams: SearchParams) {
  const sp = await searchParams;
  const category = first(sp.category);
  return { category: isCategory(category) ? category : undefined, q: first(sp.q).trim() };
}

export default function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-[72px] max-h-[calc(100vh-88px)] overflow-y-auto">
          <Suspense fallback={<CategorySidebar />}>
            <Sidebar searchParams={searchParams} />
          </Suspense>
        </div>
      </aside>

      <section className="min-w-0">
        <Suspense fallback={<ResultsSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </section>
    </div>
  );
}

async function Sidebar({ searchParams }: { searchParams: SearchParams }) {
  const { category, q } = await readFilters(searchParams);
  return <CategorySidebar active={category} q={q || undefined} />;
}

function SearchForm({ category, q }: { category?: string; q: string }) {
  return (
    <form action="/" role="search" className="flex gap-2">
      {category && <input type="hidden" name="category" value={category} />}
      <label htmlFor="q" className="sr-only">
        Search Marketplace
      </label>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder={category ? `Search ${categoryName(category)}` : "Search Marketplace"}
          className="h-10 rounded-full border-0 bg-white pl-9 text-[15px] shadow-[0_1px_2px_rgb(0_0_0/0.1)]"
        />
      </div>
      <Button type="submit" size="lg" className="h-10 rounded-full px-5 font-semibold">
        Search
      </Button>
    </form>
  );
}

async function Results({ searchParams }: { searchParams: SearchParams }) {
  const { category, q } = await readFilters(searchParams);

  if (!supabase) {
    return <p role="alert">Supabase isn&apos;t configured. Copy .env.example to .env.local and add your keys.</p>;
  }

  const listings = await getListings({ category, q });
  const heading = q ? `Results for “${q}”` : category ? categoryName(category) : "Today's picks";

  return (
    <div className="flex flex-col gap-4">
      <SearchForm category={category} q={q} />
      <div className="lg:hidden">
        <CategoryTabs active={category} q={q || undefined} />
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-[20px] font-bold">
          {heading}
          {q && category && <span className="font-normal text-muted-foreground"> in {categoryName(category)}</span>}
        </h1>
        <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
          {listings.length} {listings.length === 1 ? "listing" : "listings"}
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center shadow-[0_1px_2px_rgb(0_0_0/0.1)]">
          <p className="text-[17px] font-semibold">No listings found</p>
          <p className="mt-1 text-muted-foreground">
            {q || category ? "Try another search or category." : "Be the first to sell something!"}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {(q || category) && (
              <Button asChild variant="secondary">
                <Link href="/">See all listings</Link>
              </Button>
            )}
            <Button asChild>
              <Link href="/create">Create new listing</Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {listings.map((listing) => (
            <li key={listing.id}>
              <ListingCard listing={listing} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading listings">
      <div className="h-10 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.1)]" />
      <div className="h-7 w-40 rounded bg-black/5" />
      <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <li key={i}>
            <div className="aspect-square animate-pulse rounded-lg bg-black/5" />
            <div className="mt-2 h-5 w-16 rounded bg-black/5" />
            <div className="mt-1 h-4 w-3/4 rounded bg-black/5" />
          </li>
        ))}
      </ul>
    </div>
  );
}
