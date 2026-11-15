import type Stripe from "stripe";
import { recordPaidSession } from "@/lib/server/orders";
import { syncAccount } from "@/lib/server/sellers";
import { stripe } from "@/lib/server/stripe";

/**
 * Stripe webhook (Connect endpoint — events come from sellers' connected accounts).
 *  - checkout.session.completed → save the order, mark the listing Sold
 *  - account.updated            → keep the seller's charges_enabled in sync
 * The sandbox is shared between candidates, so events we don't recognise are
 * acknowledged with 200 and otherwise ignored.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    // Signature check needs the raw, unparsed body.
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        if (event.account) await recordPaidSession(event.data.object, event.account, "webhook");
        break;
      case "account.updated":
        await syncAccount(event.data.object);
        break;
    }
  } catch (error) {
    console.error(`Webhook ${event.type} failed:`, error);
    return new Response("Handler error", { status: 500 }); // Stripe will retry
  }

  return Response.json({ received: true });
}
