import { describe, expect, it } from "vitest";
import { escapeLike } from "./listings";
import { buyState, formatCents, normalizeEmail, platformFee, sellerPayout, toCents } from "./payments";

describe("money", () => {
  it("converts dollars to cents without float drift", () => {
    expect(toCents(220)).toBe(22000);
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it("takes a 10% platform fee, rounded to the cent", () => {
    expect(platformFee(22000)).toBe(2200);
    expect(platformFee(1999)).toBe(200);
    expect(sellerPayout(22000)).toBe(19800);
  });

  it("fee + payout always add back to the total", () => {
    for (const cents of [50, 99, 1999, 22000, 65001]) {
      expect(platformFee(cents) + sellerPayout(cents)).toBe(cents);
    }
  });

  it("formats cents as currency", () => {
    expect(formatCents(22000)).toBe("$220.00");
    expect(formatCents(2200, "usd")).toBe("$22.00");
  });
});

describe("escapeLike", () => {
  it("escapes wildcards so emails match exactly", () => {
    expect(escapeLike("first_last@x.com")).toBe("first\\_last@x.com");
    expect(escapeLike("100%@x.com")).toBe("100\\%@x.com");
    expect(escapeLike("a\\b")).toBe("a\\\\b");
  });
});

describe("normalizeEmail", () => {
  it("matches listing emails case-insensitively", () => {
    expect(normalizeEmail("  Seller@Example.COM ")).toBe("seller@example.com");
  });
});

describe("buyState", () => {
  const listing = { price: 220, sold_at: null };

  it("is buyable when the seller is connected", () => {
    expect(buyState(listing, true)).toEqual({ kind: "buy" });
  });
  it("is not buyable when the seller hasn't onboarded", () => {
    expect(buyState(listing, false)).toEqual({ kind: "seller-not-connected" });
  });
  it("is not buyable once sold, even if the seller is connected", () => {
    expect(buyState({ ...listing, sold_at: "2026-11-15T00:00:00Z" }, true)).toEqual({ kind: "sold" });
  });
  it("free items (below Stripe's 50¢ minimum) can't go through Checkout", () => {
    expect(buyState({ price: 0, sold_at: null }, true)).toEqual({ kind: "free" });
    expect(buyState({ price: 0.49, sold_at: null }, true)).toEqual({ kind: "free" });
  });
});
