import "server-only";
import Stripe from "stripe";
import { headers } from "next/headers";

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  client ??= new Stripe(key, { appInfo: { name: "Marketplace (hiring test)" } });
  return client;
}

/** Absolute origin for Stripe redirect URLs (production domain on Vercel). */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return production ? `https://${production}` : "http://localhost:3000";
}
