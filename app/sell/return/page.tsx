import { Suspense } from "react";
import Link from "next/link";
import { CircleCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { supabaseAdmin } from "@/lib/server/admin";
import { syncAccount } from "@/lib/server/sellers";
import { stripe } from "@/lib/server/stripe";
import { getListingsBySeller } from "@/lib/supabase";

type SearchParams = Promise<{ account?: string }>;

export default function OnboardingReturnPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-8">
      <Suspense fallback={<p className="text-center text-muted-foreground">Checking your Stripe account...</p>}>
        <Status searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Status({ searchParams }: { searchParams: SearchParams }) {
  const { account: accountId = "" } = await searchParams;
  const { data: seller } = /^acct_[A-Za-z0-9]+$/.test(accountId)
    ? await supabaseAdmin().from("sellers").select("email").eq("stripe_account_id", accountId).maybeSingle()
    : { data: null };

  if (!seller) {
    return (
      <Panel title="We couldn't find that seller account">
        <Button asChild className="mt-4">
          <Link href="/sell">Connect with Stripe</Link>
        </Button>
      </Panel>
    );
  }

  // Don't wait for the account.updated webhook: read the status straight from Stripe.
  const account = await stripe().accounts.retrieve(accountId);
  await syncAccount(account);
  const listings = await getListingsBySeller(seller.email);

  if (!account.charges_enabled) {
    return (
      <Panel
        icon={<Clock className="size-7 text-amber-500" aria-hidden />}
        title="Onboarding isn't finished yet"
        text={
          account.details_submitted
            ? "Stripe is still reviewing your details. This usually takes a few seconds in test mode. Refresh this page in a moment."
            : "Stripe still needs a few details before you can accept payments."
        }
      >
        <div className="mt-4 flex justify-center gap-2">
          {!account.details_submitted && (
            <Button asChild>
              <Link href={`/sell/refresh?account=${accountId}`}>Continue onboarding</Link>
            </Button>
          )}
          <Button asChild variant="secondary">
            <Link href={`/sell/return?account=${accountId}`}>Refresh status</Link>
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <>
      <Panel
        icon={<CircleCheck className="size-7 text-green-600" aria-hidden />}
        title="You're connected to Stripe"
        text={`Payments for ${seller.email} are enabled. Your listings now show a Buy Now button.`}
      >
        <p className="mt-2 font-mono text-xs text-muted-foreground">Connected account: {accountId}</p>
      </Panel>

      <h2 className="mt-8 mb-3 text-[17px] font-bold">Your listings ({listings.length})</h2>
      {listings.length === 0 ? (
        <p className="text-muted-foreground">
          No listings use this email yet.{" "}
          <Link href="/create" className="font-medium text-primary underline">
            Create one
          </Link>{" "}
          and it will be buyable right away.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
          {listings.map((l) => (
            <li key={l.id}>
              <ListingCard listing={l} payable />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Panel({ icon, title, text, children }: { icon?: React.ReactNode; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[560px] rounded-xl bg-white p-6 text-center shadow-[0_1px_2px_rgb(0_0_0/0.1)]">
      {icon && <div className="mb-2 flex justify-center">{icon}</div>}
      <h1 className="text-[22px] font-bold">{title}</h1>
      {text && <p className="mt-2 text-muted-foreground">{text}</p>}
      {children}
    </div>
  );
}
