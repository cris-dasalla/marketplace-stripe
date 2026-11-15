/** Pure payment rules (tested). Amounts are integer cents, as Stripe expects. */

export const PLATFORM_FEE_PERCENT = 10;
export const CURRENCY = "usd";
/** Stripe's minimum charge for USD. */
export const MIN_CHARGE_CENTS = 50;

export function toCents(price: number): number {
  return Math.round(price * 100);
}

export function platformFee(amountCents: number): number {
  return Math.round((amountCents * PLATFORM_FEE_PERCENT) / 100);
}

export function sellerPayout(amountCents: number): number {
  return amountCents - platformFee(amountCents);
}

export function formatCents(cents: number, currency = CURRENCY): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type BuyState =
  | { kind: "buy" }
  | { kind: "sold" }
  | { kind: "free" }
  | { kind: "seller-not-connected" };

/** Whether a listing can be bought right now, and if not, why. */
export function buyState(listing: { price: number; sold_at: string | null }, sellerCanCharge: boolean): BuyState {
  if (listing.sold_at) return { kind: "sold" };
  if (toCents(listing.price) < MIN_CHARGE_CENTS) return { kind: "free" };
  if (!sellerCanCharge) return { kind: "seller-not-connected" };
  return { kind: "buy" };
}
