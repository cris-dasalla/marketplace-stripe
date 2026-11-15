/**
 * Pure listing rules shared by the UI, the server action and the tests.
 * The database enforces the same limits again (supabase/schema.sql).
 */
import { isCategory } from "./categories";

export const LIMITS = {
  title: 100,
  description: 2000,
  location: 80,
  email: 254,
  message: 1000,
  maxPrice: 10_000_000,
  imageBytes: 5 * 1024 * 1024,
} as const;

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  seller_email: string;
  location: string;
  image_path: string;
  created_at: string;
  /** Set by the server when a Stripe payment for this listing completes. */
  sold_at: string | null;
}

export interface ListingDraft {
  title: string;
  description: string;
  price: string;
  category: string;
  seller_email: string;
  location: string;
  hasImage: boolean;
}

export type FieldErrors = Partial<Record<"title" | "description" | "price" | "category" | "seller_email" | "location" | "image", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isEmail = (value: string) => value.length <= LIMITS.email && EMAIL_RE.test(value);
export const isUuid = (value: string) => UUID_RE.test(value);

/** Parses "1,200.50" / "$99" into a number, or null if it isn't a valid price. */
export function parsePrice(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return value <= LIMITS.maxPrice ? value : null;
}

export function validateListing(d: ListingDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!d.hasImage) errors.image = "Add a photo.";
  if (!d.title.trim()) errors.title = "Add a title.";
  else if (d.title.trim().length > LIMITS.title) errors.title = `Keep the title under ${LIMITS.title} characters.`;
  if (!isCategory(d.category)) errors.category = "Choose a category.";
  if (parsePrice(d.price) === null) errors.price = "Enter a price, e.g. 120 or 99.50 (0 for free).";
  if (!isEmail(d.seller_email.trim())) errors.seller_email = "Enter a valid email so buyers can reach you.";
  if (d.location.trim().length > LIMITS.location) errors.location = `Keep the location under ${LIMITS.location} characters.`;
  if (d.description.length > LIMITS.description) errors.description = `Keep the description under ${LIMITS.description} characters.`;
  return errors;
}

export function validateImage(file: { type: string; size: number }): string | null {
  if (!(file.type in IMAGE_TYPES)) return "Photos must be JPG, PNG, GIF or WebP.";
  if (file.size > LIMITS.imageBytes) return "Photos can be at most 5 MB.";
  return null;
}

export function validateMessage(email: string, body: string): string | null {
  if (!isEmail(email.trim())) return "Enter your email so the seller can reply.";
  if (!body.trim()) return "Write a message to the seller.";
  if (body.length > LIMITS.message) return `Keep your message under ${LIMITS.message} characters.`;
  return null;
}

export function formatPrice(price: number): string {
  if (price === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Makes a keyword safe for a PostgREST `or=(…ilike…)` filter: drops the
 * characters that have meaning there (commas, parentheses, wildcards, quotes).
 */
export function cleanSearch(q: string): string {
  return q.replace(/[,()%*\\"':.]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

/** Escapes LIKE/ILIKE wildcards so an email like "a_b@x.com" matches only itself. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => "\\" + c);
}

/** "just now", "5 minutes ago", "3 hours ago", "2 days ago", "on Nov 3". */
export function listedAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;

  if (minutes < 1) return "just now";
  if (minutes < 60) return plural(minutes, "minute");
  if (hours < 24) return plural(hours, "hour");
  if (days < 7) return plural(days, "day");
  return `on ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso))}`;
}
