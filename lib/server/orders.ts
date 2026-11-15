import "server-only";
import type Stripe from "stripe";
import { isUuid } from "@/lib/listings";
import { toCents } from "@/lib/payments";
import { supabaseAdmin } from "./admin";
import { getSeller } from "./sellers";

export interface Order {
  id: string;
  listing_id: string | null;
  stripe_session_id: string;
  amount_total: number;
  application_fee: number;
  currency: string;
  buyer_email: string | null;
  created_at: string;
}

/**
 * Records a paid Checkout Session and marks the listing sold. Idempotent:
 * Stripe may deliver the webhook more than once, and the success page may
 * record it too — the unique session id makes repeats a no-op.
 * Returns false for sessions that aren't ours (the sandbox is shared).
 */
export async function recordPaidSession(
  session: Stripe.Checkout.Session,
  accountId: string,
  recordedBy: "webhook" | "success_page",
): Promise<boolean> {
  const listingId = session.metadata?.listing_id;
  if (!listingId || !isUuid(listingId) || session.metadata?.app !== "cris-marketplace") return false;
  if (session.payment_status !== "paid") return false;

  const db = supabaseAdmin();
  const { data: listing } = await db
    .from("listings")
    .select("id, price, seller_email")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) return false;

  // The sandbox is shared: only accept a payment that went to THIS listing's
  // seller, for THIS listing's price — not a look-alike session from elsewhere.
  const seller = await getSeller(listing.seller_email);
  if (!seller || seller.stripe_account_id !== accountId) return false;
  if (session.amount_total !== toCents(Number(listing.price))) return false;

  const { error } = await db.from("orders").upsert(
    {
      listing_id: listingId,
      stripe_session_id: session.id,
      stripe_account_id: accountId,
      payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
      amount_total: session.amount_total ?? 0,
      application_fee: Number(session.metadata?.application_fee ?? 0),
      currency: session.currency ?? "usd",
      buyer_email: session.customer_details?.email ?? null,
      status: "paid",
      recorded_by: recordedBy,
    },
    { onConflict: "stripe_session_id", ignoreDuplicates: true },
  );
  if (error) throw error;

  const sold = await db
    .from("listings")
    .update({ sold_at: new Date().toISOString() })
    .eq("id", listingId)
    .is("sold_at", null);
  if (sold.error) throw sold.error;
  return true;
}

export async function getOrderBySession(sessionId: string): Promise<Order | null> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("id, listing_id, stripe_session_id, amount_total, application_fee, currency, buyer_email, created_at")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
