// Registers this app's webhook endpoint in the Stripe sandbox (run once after deploying).
// Usage: node --env-file=.env.local scripts/create-webhook.mjs https://YOUR-APP.vercel.app
import Stripe from "stripe";

const base = process.argv[2];
if (!base?.startsWith("https://")) {
  console.error("Pass your production URL, e.g. https://my-app.vercel.app");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpoint = await stripe.webhookEndpoints.create({
  url: `${base.replace(/\/$/, "")}/api/stripe/webhook`,
  connect: true, // direct charges: events come from sellers' connected accounts
  enabled_events: ["checkout.session.completed", "checkout.session.async_payment_succeeded", "account.updated"],
  description: "cris-marketplace (hiring test)",
});

console.log("Endpoint:", endpoint.id, endpoint.url);
console.log("Signing secret (save as STRIPE_WEBHOOK_SECRET):", endpoint.secret);
