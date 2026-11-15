import Link from "next/link";
import { formatPrice, type Listing } from "@/lib/listings";
import { imageUrl } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function ListingCard({ listing, payable = false }: { listing: Listing; payable?: boolean }) {
  const sold = Boolean(listing.sold_at);
  return (
    <Link href={`/listing/${listing.id}`} className="group block rounded-lg outline-offset-4">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- user photos from Supabase Storage */}
        <img
          src={imageUrl(listing.image_path)}
          alt=""
          loading="lazy"
          className={cn(
            "size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]",
            sold && "opacity-60 grayscale",
          )}
        />
        {sold && (
          <span className="absolute top-2 left-2 rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow">SOLD</span>
        )}
        {!sold && payable && (
          <span className="absolute top-2 left-2 rounded bg-green-600 px-2 py-0.5 text-xs font-semibold text-white shadow">
            Buy Now
          </span>
        )}
      </div>
      <p className={cn("mt-2 text-[17px] font-bold", sold && "text-muted-foreground line-through")}>
        {formatPrice(listing.price)}
      </p>
      <h3 className="line-clamp-2 text-[15px] leading-snug">{listing.title}</h3>
      {listing.location && <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{listing.location}</p>}
    </Link>
  );
}
