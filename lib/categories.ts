/** Marketplace categories. Slugs are stored in the database (see supabase/schema.sql). */
export const CATEGORIES = [
  { slug: "vehicles", name: "Vehicles" },
  { slug: "property-rentals", name: "Property Rentals" },
  { slug: "apparel", name: "Apparel" },
  { slug: "classifieds", name: "Classifieds" },
  { slug: "electronics", name: "Electronics" },
  { slug: "entertainment", name: "Entertainment" },
  { slug: "family", name: "Family" },
  { slug: "free-stuff", name: "Free Stuff" },
  { slug: "garden-outdoor", name: "Garden & Outdoor" },
  { slug: "hobbies", name: "Hobbies" },
  { slug: "home-goods", name: "Home Goods" },
  { slug: "home-improvement", name: "Home Improvement" },
  { slug: "home-sales", name: "Home Sales" },
  { slug: "musical-instruments", name: "Musical Instruments" },
  { slug: "office-supplies", name: "Office Supplies" },
  { slug: "pet-supplies", name: "Pet Supplies" },
  { slug: "sporting-goods", name: "Sporting Goods" },
  { slug: "toys-games", name: "Toys & Games" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function isCategory(value: unknown): value is CategorySlug {
  return CATEGORIES.some((c) => c.slug === value);
}

export function categoryName(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? "Other";
}

/** Listing types on the "Choose listing type" screen, each with a sensible default category. */
export const LISTING_TYPES = {
  item: { label: "Item for sale", blurb: "Create a single listing for one or more items to sell.", category: "" },
  vehicle: { label: "Vehicle for sale", blurb: "Sell a car, truck, bike or other vehicle.", category: "vehicles" },
  home: { label: "Home for sale or rent", blurb: "List a house or apartment for sale or rent.", category: "property-rentals" },
} as const;

export type ListingType = keyof typeof LISTING_TYPES;
