import { notFound } from "next/navigation";
import { LISTING_TYPES, type ListingType } from "@/lib/categories";
import { CreateListingForm } from "./create-listing-form";

export function generateStaticParams() {
  return Object.keys(LISTING_TYPES).map((type) => ({ type }));
}

export default async function CreateListingPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!(type in LISTING_TYPES)) notFound();
  const listingType = LISTING_TYPES[type as ListingType];

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-5">
      <CreateListingForm heading={listingType.label} defaultCategory={listingType.category} />
    </div>
  );
}
