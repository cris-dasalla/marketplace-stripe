import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { AutoRefresh } from "./auto-refresh";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/payments";
import { retryUntil } from "@/lib/retry";
import { getOrderBySession, recordPaidSession } from "@/lib/server/orders";
import { getSeller } from "@/lib/server/sellers";
import { stripe } from "@/lib/server/stripe";
import { getListing, imageUrl } from "@/lib/supabase";

export const metadata: Metadata = { title: "Purchase successful" };

type SearchParams = Promise<{ session_id?: string; listing?: string }>;

export default function SuccessPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-[560px] px-4 py-10">
      <Suspense fallback={<p className="text-center text-muted-foreground">Confirming your payment with Stripe...</p>}>
        <Receipt searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Receipt({ searchParams }: { searchParams: SearchParams }) {
  const { session_id: sessionId = "", listing: listingId = "" } = await searchParams;
  const listing = /^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId) ? await getListing(listingId) : null;
  const seller = listing ? await getSeller(listing.seller_email) : null;
  if (!listing || !seller) return <NotConfirmed />;

  // Verify with Stripe instead of trusting the URL. Stripe redirects here as soon as
  // the card is charged; the session reports "paid" a moment later, so re-check briefly.
  const session = await retryUntil(
    () =>
      stripe()
        .checkout.sessions.retrieve(sessionId, {}, { stripeAccount: seller.stripe_account_id })
        .catch(() => null),
    (s) => s === null || s.payment_status === "paid",
    { attempts: 3, delayMs: 1000 },
  );
  if (!session || session.metadata?.listing_id !== listing.id || session.status === "expired") {
    return <NotConfirmed />;
  }
  // Direct charges on a connected account can take ~20s to show as paid.
  // Keep the buyer here and re-check instead of giving up.
  if (session.payment_status !== "paid") return <Finalizing />;

  // The webhook normally records the order first; this is an idempotent backstop
  // in case the buyer lands here before Stripe's event arrives.
  let order = await getOrderBySession(session.id);
  if (!order) {
    await recordPaidSession(session, seller.stripe_account_id, "success_page");
    order = await getOrderBySession(session.id);
  }
  if (!order) return <NotConfirmed />;

  const sellerGets = order.amount_total - order.application_fee;

  return (
    <div className="rounded-xl bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.1)]">
      <div className="text-center">
        <CircleCheck className="mx-auto size-12 text-green-600" aria-hidden />
        <h1 className="mt-2 text-[24px] font-bold">Purchase successful!</h1>
        <p className="mt-1 text-muted-foreground">
          Thanks{order.buyer_email ? `, ${order.buyer_email}` : ""}. The seller has been notified through Stripe.
        </p>
      </div>

      <div className="mt-6 flex gap-4 rounded-lg border p-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- user photo from Supabase Storage */}
        <img src={imageUrl(listing.image_path)} alt="" className="size-20 shrink-0 rounded-md object-cover" />
        <div className="min-w-0">
          <p className="font-semibold break-words">{listing.title}</p>
          <p className="text-sm text-muted-foreground">Sold by {listing.seller_email}</p>
          <span className="mt-1 inline-block rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">SOLD</span>
        </div>
      </div>

      <dl className="mt-4 divide-y text-[15px]">
        <Row label="You paid" value={formatCents(order.amount_total, order.currency)} strong />
        <Row label="Seller receives" value={formatCents(sellerGets, order.currency)} />
        <Row label="Marketplace fee (10%)" value={formatCents(order.application_fee, order.currency)} />
        <Row label="Order" value={order.id.slice(0, 8)} mono />
      </dl>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="flex-1">
          <Link href={`/listing/${listing.id}`}>View listing</Link>
        </Button>
        <Button asChild variant="secondary" className="flex-1">
          <Link href="/">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, strong, mono }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`${strong ? "font-bold" : ""} ${mono ? "font-mono text-sm" : ""}`}>{value}</dd>
    </div>
  );
}

function Finalizing() {
  return (
    <div role="status" className="rounded-xl bg-white p-6 text-center shadow-[0_1px_2px_rgb(0_0_0/0.1)]">
      <LoaderCircle className="mx-auto size-10 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
      <h1 className="mt-3 text-[22px] font-bold">Finalizing your payment…</h1>
      <p className="mt-1 text-muted-foreground">
        Stripe is confirming the payment with the seller&apos;s account. This page updates by itself, usually within
        30 seconds.
      </p>
      <AutoRefresh />
    </div>
  );
}

function NotConfirmed() {
  return (
    <div className="rounded-xl bg-white p-6 text-center shadow-[0_1px_2px_rgb(0_0_0/0.1)]">
      <CircleAlert className="mx-auto size-10 text-amber-500" aria-hidden />
      <h1 className="mt-2 text-[22px] font-bold">We couldn&apos;t confirm this payment</h1>
      <p className="mt-1 text-muted-foreground">If you completed checkout, refresh in a few seconds.</p>
      <Button asChild className="mt-4">
        <Link href="/">Back to Marketplace</Link>
      </Button>
    </div>
  );
}
