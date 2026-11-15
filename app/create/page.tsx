import Link from "next/link";
import { Car, House, Tag } from "lucide-react";
import { LISTING_TYPES, type ListingType } from "@/lib/categories";

const ICONS: Record<ListingType, typeof Tag> = { item: Tag, vehicle: Car, home: House };

export default function ChooseListingTypePage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-8">
      <h1 className="text-center text-[24px] font-bold">Choose listing type</h1>
      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {(Object.keys(LISTING_TYPES) as ListingType[]).map((type) => {
          const Icon = ICONS[type];
          return (
            <li key={type}>
              <Link
                href={`/create/${type}`}
                className="flex h-full flex-col items-center gap-3 rounded-xl bg-white p-6 text-center shadow-[0_1px_2px_rgb(0_0_0/0.1)] transition-shadow hover:shadow-md"
              >
                <span className="grid size-14 place-items-center rounded-full bg-muted">
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="text-[17px] font-semibold">{LISTING_TYPES[type].label}</span>
                <span className="text-sm text-muted-foreground">{LISTING_TYPES[type].blurb}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
