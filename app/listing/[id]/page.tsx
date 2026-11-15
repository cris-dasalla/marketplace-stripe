import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Tag } from "lucide-react";
import { categoryName } from "@/lib/categories";
import { formatPrice, listedAgo } from "@/lib/listings";
import { getListing, imageUrl } from "@/lib/supabase";
import { BuySection } from "./buy-section";
import { MessageForm } from "./message-form";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ checkout?: string }>;

export default function ListingPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-5">
      <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Back to Marketplace
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <ListingDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ListingDetail({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, { checkout }] = await Promise.all([params, searchParams]);
  const listing = await getListing(id);
  if (!listing) notFound();

  return (
    <article className="grid overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgb(0_0_0/0.1)] lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex items-center justify-center bg-neutral-900 lg:min-h-[560px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- user photos from Supabase Storage */}
        <img
          src={imageUrl(listing.image_path)}
          alt={listing.title}
          className="max-h-[70vh] w-full object-contain lg:max-h-[640px]"
        />
      </div>

      <div className="flex flex-col gap-5 p-5">
        <header>
          <h1 className="text-[24px] leading-tight font-bold break-words">{listing.title}</h1>
          <p className="mt-1 text-[20px] font-semibold">{formatPrice(listing.price)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Listed {listedAgo(listing.created_at)}
            {listing.location && ` in ${listing.location}`}
          </p>
        </header>

        <BuySection listing={listing} cancelled={checkout === "cancelled"} />

        <dl className="flex flex-col gap-2 text-[15px]">
          <div className="flex items-center gap-2">
            <dt>
              <Tag className="size-4 text-muted-foreground" aria-hidden />
              <span className="sr-only">Category</span>
            </dt>
            <dd>
              <Link href={`/?category=${listing.category}`} className="font-medium text-primary hover:underline">
                {categoryName(listing.category)}
              </Link>
            </dd>
          </div>
          {listing.location && (
            <div className="flex items-center gap-2">
              <dt>
                <MapPin className="size-4 text-muted-foreground" aria-hidden />
                <span className="sr-only">Location</span>
              </dt>
              <dd>{listing.location}</dd>
            </div>
          )}
        </dl>

        {listing.description && (
          <section>
            <h2 className="text-[17px] font-bold">Description</h2>
            <p className="mt-1 whitespace-pre-wrap break-words text-[15px]">{listing.description}</p>
          </section>
        )}

        <section>
          <h2 className="text-[17px] font-bold">Seller information</h2>
          <a href={`mailto:${listing.seller_email}`} className="mt-1 inline-flex items-center gap-2 text-[15px] text-primary hover:underline break-all">
            <Mail className="size-4 shrink-0" aria-hidden />
            {listing.seller_email}
          </a>
        </section>

        <section className="border-t pt-4">
          <h2 id="message-heading" className="mb-3 text-[17px] font-bold">
            Send seller a message
          </h2>
          <MessageForm listingId={listing.id} />
        </section>
      </div>
    </article>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid overflow-hidden rounded-xl bg-white lg:grid-cols-[minmax(0,1fr)_380px]" aria-busy="true" aria-label="Loading listing">
      <div className="aspect-square animate-pulse bg-black/5 lg:aspect-auto lg:min-h-[560px]" />
      <div className="flex flex-col gap-3 p-5">
        <div className="h-7 w-3/4 rounded bg-black/5" />
        <div className="h-6 w-20 rounded bg-black/5" />
        <div className="h-4 w-1/2 rounded bg-black/5" />
      </div>
    </div>
  );
}
