"use server";

import { redirect } from "next/navigation";
import { isEmail } from "@/lib/listings";
import { normalizeEmail } from "@/lib/payments";
import { getSeller, saveSeller } from "@/lib/server/sellers";
import { onboardingLink } from "@/lib/server/onboarding";
import { stripe } from "@/lib/server/stripe";

export type ConnectState =
  | { status: "idle" }
  | { status: "already-connected"; email: string }
  | { status: "error"; message: string; email: string };

/** Creates (or resumes) a Stripe Express account for this email and sends the seller to Stripe's hosted onboarding. */
export async function connectWithStripe(_prev: ConnectState, formData: FormData): Promise<ConnectState> {
  const raw = String(formData.get("email") ?? "");
  const email = normalizeEmail(raw);
  if (!isEmail(email)) return { status: "error", message: "Enter the email you used on your listings.", email: raw };

  let onboardingUrl: string;
  try {
    let seller = await getSeller(email);

    // Once a seller can take payments we never hand out another onboarding link for
    // that email, so nobody else can type it in and edit the payout details.
    if (seller?.charges_enabled) return { status: "already-connected", email };

    if (!seller) {
      const account = await stripe().accounts.create({
        type: "express",
        email,
        business_type: "individual",
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { app: "cris-marketplace" },
      });
      await saveSeller(email, account.id);
      seller = { email, stripe_account_id: account.id, charges_enabled: false, details_submitted: false };
    }

    onboardingUrl = await onboardingLink(seller.stripe_account_id);
  } catch (error) {
    console.error("Stripe onboarding failed:", error);
    return { status: "error", message: "Couldn't start Stripe onboarding. Please try again.", email: raw };
  }

  redirect(onboardingUrl);
}
