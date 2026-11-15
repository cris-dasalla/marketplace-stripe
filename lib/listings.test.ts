import { describe, expect, it } from "vitest";
import { CATEGORIES, isCategory } from "./categories";
import {
  cleanSearch,
  formatPrice,
  listedAgo,
  parsePrice,
  validateImage,
  validateListing,
  validateMessage,
  type ListingDraft,
} from "./listings";

const valid: ListingDraft = {
  title: "Bike 24 inch",
  description: "Good condition",
  price: "99",
  category: "sporting-goods",
  seller_email: "seller@example.com",
  location: "Makati",
  hasImage: true,
};

describe("validateListing", () => {
  it("accepts a complete listing", () => {
    expect(validateListing(valid)).toEqual({});
  });

  it("requires photo, title, price, category and email", () => {
    const errors = validateListing({ ...valid, hasImage: false, title: " ", price: "", category: "", seller_email: "" });
    expect(Object.keys(errors).sort()).toEqual(["category", "image", "price", "seller_email", "title"]);
  });

  it("rejects an unknown category and a bad email", () => {
    expect(validateListing({ ...valid, category: "weapons" }).category).toBeDefined();
    expect(validateListing({ ...valid, seller_email: "not-an-email" }).seller_email).toBeDefined();
  });

  it("allows an empty description and location", () => {
    expect(validateListing({ ...valid, description: "", location: "" })).toEqual({});
  });
});

describe("parsePrice", () => {
  it.each([
    ["99", 99],
    ["$1,200", 1200],
    ["99.5", 99.5],
    ["0", 0],
  ])("%s → %d", (input, expected) => expect(parsePrice(input)).toBe(expected));

  it.each(["", "abc", "-5", "1.999", "99999999"])("rejects %j", (input) => {
    expect(parsePrice(input)).toBeNull();
  });
});

describe("formatPrice", () => {
  it("formats whole and decimal prices, and 0 as Free", () => {
    expect(formatPrice(1200)).toBe("$1,200");
    expect(formatPrice(99.5)).toBe("$99.50");
    expect(formatPrice(0)).toBe("Free");
  });
});

describe("validateMessage", () => {
  it("needs a valid email and a non-empty message", () => {
    expect(validateMessage("buyer@example.com", "Is this available?")).toBeNull();
    expect(validateMessage("nope", "hi")).toMatch(/email/);
    expect(validateMessage("buyer@example.com", "   ")).toMatch(/message/);
  });
});

describe("validateImage", () => {
  it("accepts images up to 5 MB only", () => {
    expect(validateImage({ type: "image/webp", size: 1000 })).toBeNull();
    expect(validateImage({ type: "text/html", size: 10 })).toMatch(/JPG/);
    expect(validateImage({ type: "image/png", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
  });
});

describe("cleanSearch", () => {
  it("strips characters that would break or widen the database filter", () => {
    expect(cleanSearch("bike,title.eq.x)")).toBe("bike title eq x");
    expect(cleanSearch("100% *cotton*")).toBe("100 cotton");
  });
  it("trims and caps the length", () => {
    expect(cleanSearch("   bike   ")).toBe("bike");
    expect(cleanSearch("a".repeat(100))).toHaveLength(60);
  });
});

describe("listedAgo", () => {
  const now = new Date("2026-11-15T12:00:00Z");
  it.each([
    ["2026-11-15T11:59:40Z", "just now"],
    ["2026-11-15T11:59:00Z", "1 minute ago"],
    ["2026-11-15T11:15:00Z", "45 minutes ago"],
    ["2026-11-15T09:00:00Z", "3 hours ago"],
    ["2026-11-13T12:00:00Z", "2 days ago"],
    ["2026-11-01T12:00:00Z", "on Nov 1"],
  ])("%s → %s", (iso, expected) => expect(listedAgo(iso, now)).toBe(expected));
});

describe("categories", () => {
  it("has unique slugs that match the database list", () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(isCategory("electronics")).toBe(true);
    expect(isCategory("nope")).toBe(false);
  });
});
