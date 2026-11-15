import Link from "next/link";
import { formatPrice, type Listing } from "@/lib/listings";
import { imageUrl } from "@/lib/supabase";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/listing/${listing.id}`} className="group block rounded-lg outline-offset-4">
      <div className="aspect-square overflow-hidden rounded-lg bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- user photos from Supabase Storage */}
        <img
          src={imageUrl(listing.image_path)}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <p className="mt-2 text-[17px] font-bold">{formatPrice(listing.price)}</p>
      <h3 className="line-clamp-2 text-[15px] leading-snug">{listing.title}</h3>
      {listing.location && <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{listing.location}</p>}
    </Link>
  );
}
