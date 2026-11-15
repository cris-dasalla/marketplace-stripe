import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/server/admin";
import { onboardingLink } from "@/lib/server/onboarding";

/**
 * Stripe sends sellers here when an onboarding link expires (refresh_url),
 * and "Continue onboarding" uses it too. Issues a fresh link for an
 * account we know about that hasn't finished onboarding.
 */
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("account") ?? "";
  const sellPage = new URL("/sell", request.url);
  if (!/^acct_[A-Za-z0-9]+$/.test(accountId)) return NextResponse.redirect(sellPage);

  const { data: seller } = await supabaseAdmin()
    .from("sellers")
    .select("charges_enabled")
    .eq("stripe_account_id", accountId)
    .maybeSingle();
  if (!seller) return NextResponse.redirect(sellPage);
  if (seller.charges_enabled) return NextResponse.redirect(new URL(`/sell/return?account=${accountId}`, request.url));

  return NextResponse.redirect(await onboardingLink(accountId));
}
