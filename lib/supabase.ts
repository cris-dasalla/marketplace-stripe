import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { IMAGE_TYPES, cleanSearch, isUuid, parsePrice, type Listing, type ListingDraft } from "./listings";

// NEXT_PUBLIC values are inlined at build time; they must be referenced literally.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const IMAGE_BUCKET = "listing-images";
const COLUMNS = "id, title, description, price, category, seller_email, location, image_path, created_at";

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

function db(): SupabaseClient {
  if (!supabase) throw new Error("Supabase is not configured. See .env.example.");
  return supabase;
}

/** Postgres numeric comes back as a string; normalise it. */
const toListing = (row: Record<string, unknown>): Listing => ({ ...(row as unknown as Listing), price: Number(row.price) });

export async function getListings(filter: { category?: string; q?: string } = {}): Promise<Listing[]> {
  let query = db().from("listings").select(COLUMNS).order("created_at", { ascending: false }).limit(100);
  if (filter.category) query = query.eq("category", filter.category);
  const q = cleanSearch(filter.q ?? "");
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(toListing);
}

export async function getListing(id: string): Promise<Listing | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await db().from("listings").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toListing(data) : null;
}

export function imageUrl(path: string): string {
  return db().storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Browser-side: uploads the photo, saves the listing, returns its id. */
export async function createListing(draft: Omit<ListingDraft, "hasImage">, image: File): Promise<string> {
  const client = db();
  const image_path = `${crypto.randomUUID()}.${IMAGE_TYPES[image.type]}`;
  const upload = await client.storage
    .from(IMAGE_BUCKET)
    .upload(image_path, image, { contentType: image.type, upsert: false });
  if (upload.error) throw upload.error;

  const { data, error } = await client
    .from("listings")
    .insert({
      title: draft.title.trim(),
      description: draft.description.trim(),
      price: parsePrice(draft.price),
      category: draft.category,
      seller_email: draft.seller_email.trim(),
      location: draft.location.trim(),
      image_path,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Server-side (server action): stores a buyer's message. Messages are write-only. */
export async function saveMessage(listingId: string, buyerEmail: string, body: string): Promise<void> {
  const { error } = await db()
    .from("messages")
    .insert({ listing_id: listingId, buyer_email: buyerEmail.trim(), body: body.trim() });
  if (error) throw error;
}
