"use server";

import { redirect } from "next/navigation";
import { isUuid } from "@/lib/listings";
import { buyState, CURRENCY, platformFee, toCents } from "@/lib/payments";
import { getSeller } from "@/lib/server/sellers";
import { siteOrigin, stripe } from "@/lib/server/stripe";
import { getListing, imageUrl } from "@/lib/supabase";

/**
 * Buy Now → Stripe Checkout as a DIRECT CHARGE on the seller's connected
 * account, with our platform fee taken as an application fee.
 * Price, seller and fee all come from the database, never from the browser.
 */
export async function buyNow(formData: FormData): Promise<void> {
  const listingId = String(formData.get("listingId") ?? "");
  if (!isUuid(listingId)) redirect("/");

  const listing = await getListing(listingId);
  if (!listing) redirect("/");
  const seller = await getSeller(listing.seller_email);
  if (buyState(listing, Boolean(seller?.charges_enabled)).kind !== "buy" || !seller) {
    redirect(`/listing/${listingId}`);
  }

  const amount = toCents(listing.price);
  const fee = platformFee(amount);
  const origin = await siteOrigin();

  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: amount,
            product_data: {
              name: listing.title,
              images: [imageUrl(listing.image_path)],
              ...(listing.description ? { description: listing.description.slice(0, 300) } : {}),
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: fee,
        metadata: { app: "cris-marketplace", listing_id: listing.id },
      },
      metadata: { app: "cris-marketplace", listing_id: listing.id, application_fee: String(fee) },
      success_url: `${origin}/orders/success?listing=${listing.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/listing/${listing.id}?checkout=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // hold for 30 min, Stripe's minimum
    },
    { stripeAccount: seller.stripe_account_id },
  );

  redirect(session.url ?? `/listing/${listingId}`);
}
