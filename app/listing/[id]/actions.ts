"use server";

import { headers } from "next/headers";
import { emailSeller } from "@/lib/email";
import { isUuid, validateMessage } from "@/lib/listings";
import { getListing, saveMessage } from "@/lib/supabase";

export type MessageState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "error"; message: string; email: string; body: string };

async function siteOrigin(): Promise<string> {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${production}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function sendMessage(_prev: MessageState, formData: FormData): Promise<MessageState> {
  const listingId = String(formData.get("listingId") ?? "");
  const email = String(formData.get("email") ?? "");
  const body = String(formData.get("body") ?? "");
  const fail = (message: string): MessageState => ({ status: "error", message, email, body });

  if (!isUuid(listingId)) return fail("This listing no longer exists.");
  const problem = validateMessage(email, body);
  if (problem) return fail(problem);

  // Look the seller up on the server — the recipient never comes from the browser.
  const listing = await getListing(listingId).catch(() => null);
  if (!listing) return fail("This listing no longer exists.");

  try {
    await saveMessage(listingId, email, body);
  } catch (error) {
    const e = error as { code?: string; message?: string };
    if (e.code === "23503") return fail("This listing no longer exists.");
    if (e.code === "P0001" && e.message) return fail(e.message); // rate limit
    return fail("Couldn't send your message. Please try again.");
  }

  // The message is saved; an email problem shouldn't turn that into a failure.
  try {
    await emailSeller({
      sellerEmail: listing.seller_email,
      buyerEmail: email.trim(),
      listingTitle: listing.title,
      message: body.trim(),
      listingUrl: `${await siteOrigin()}/listing/${listing.id}`,
    });
  } catch (error) {
    console.error("Seller email failed:", error);
  }

  return { status: "sent" };
}
