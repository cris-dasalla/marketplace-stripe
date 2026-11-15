import "server-only";
import type Stripe from "stripe";
import { normalizeEmail } from "@/lib/payments";
import { supabaseAdmin } from "./admin";

export interface Seller {
  email: string;
  stripe_account_id: string;
  charges_enabled: boolean;
  details_submitted: boolean;
}

export async function getSeller(email: string): Promise<Seller | null> {
  const { data, error } = await supabaseAdmin()
    .from("sellers")
    .select("email, stripe_account_id, charges_enabled, details_submitted")
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Emails of sellers who can take payments — used to show Buy Now on the grid. */
export async function getPayableEmails(): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin().from("sellers").select("email").eq("charges_enabled", true);
  if (error) throw error;
  return new Set(data.map((s) => s.email));
}

export async function saveSeller(email: string, accountId: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("sellers")
    .insert({ email: normalizeEmail(email), stripe_account_id: accountId });
  if (error) throw error;
}

/** Mirrors a Stripe account's status into our table. Returns false if we don't know the account. */
export async function syncAccount(account: Stripe.Account): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("sellers")
    .update({
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_account_id", account.id)
    .select("email");
  if (error) throw error;
  return data.length > 0;
}
