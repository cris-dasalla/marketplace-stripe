import "server-only";
import { siteOrigin, stripe } from "./stripe";

/**
 * Creates a Stripe-hosted onboarding link for a connected account.
 * Deliberately NOT in a "use server" file: exports there become callable
 * endpoints, and this must only run behind the checks in its callers.
 */
export async function onboardingLink(accountId: string): Promise<string> {
  const origin = await siteOrigin();
  const link = await stripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${origin}/sell/refresh?account=${accountId}`,
    return_url: `${origin}/sell/return?account=${accountId}`,
  });
  return link.url;
}
