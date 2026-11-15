import { CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, type Listing } from "@/lib/listings";
import { buyState } from "@/lib/payments";
import { getSeller } from "@/lib/server/sellers";
import { buyNow } from "./buy";

export async function BuySection({ listing, cancelled }: { listing: Listing; cancelled: boolean }) {
  const seller = await getSeller(listing.seller_email).catch(() => null);
  const state = buyState(listing, Boolean(seller?.charges_enabled));

  if (state.kind === "sold") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="flex items-center gap-2 text-[17px] font-bold text-red-700">
          <span className="rounded bg-red-600 px-2 py-0.5 text-sm text-white">SOLD</span>
          This item has been sold
        </p>
        <p className="mt-1 text-sm text-red-900/80">Payment was confirmed by Stripe.</p>
      </div>
    );
  }

  if (state.kind !== "buy") {
    return (
      <p className="rounded-lg bg-muted/70 p-3 text-sm text-muted-foreground">
        {state.kind === "free"
          ? "This item is free. Message the seller to arrange pickup."
          : "The seller hasn't set up payments yet. Send them a message below."}
      </p>
    );
  }

  return (
    <form action={buyNow} className="flex flex-col gap-2">
      <input type="hidden" name="listingId" value={listing.id} />
      {cancelled && (
        <p role="status" className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
          Checkout was cancelled. You haven&apos;t been charged.
        </p>
      )}
      <Button type="submit" size="lg" className="h-11 bg-green-600 text-[16px] font-semibold hover:bg-green-700">
        <CreditCard aria-hidden />
        Buy Now · {formatPrice(listing.price)}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3" aria-hidden />
        Secure checkout by Stripe · sandbox, use card 4242 4242 4242 4242
      </p>
    </form>
  );
}
