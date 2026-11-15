import type { Metadata } from "next";
import { BadgeDollarSign, ShieldCheck, Store } from "lucide-react";
import { PLATFORM_FEE_PERCENT } from "@/lib/payments";
import { ConnectForm } from "./connect-form";

export const metadata: Metadata = { title: "Get paid with Stripe" };

export default function SellPage() {
  return (
    <div className="mx-auto max-w-[560px] px-4 py-8">
      <div className="rounded-xl bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.1)]">
        <h1 className="text-[24px] font-bold">Get paid for your listings</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Connect a Stripe account to the email you list items with. Once you&apos;re set up, every one of your
          listings gets a <strong className="text-foreground">Buy Now</strong> button and buyers pay you directly.
        </p>

        <ul className="my-5 flex flex-col gap-3 text-[15px]">
          <li className="flex gap-3">
            <Store className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            Stripe hosts the onboarding. We never see your bank or identity details.
          </li>
          <li className="flex gap-3">
            <BadgeDollarSign className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            You receive the sale price minus a {PLATFORM_FEE_PERCENT}% marketplace fee.
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            Sandbox mode: use Stripe&apos;s test data. No real money moves.
          </li>
        </ul>

        <ConnectForm />

        <details className="mt-5 rounded-lg bg-muted/60 p-3 text-sm">
          <summary className="cursor-pointer font-medium">Test data for Stripe onboarding</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              The sandbox platform is in Estonia, so accounts are EU accounts. Wherever Stripe offers a{" "}
              <strong>&ldquo;Use test …&rdquo;</strong> button, click it.
            </li>
            <li>SMS / email verification code: <code>000000</code></li>
            <li>Date of birth: <code>01/01/1901</code> · ID number: <code>000000000</code></li>
            <li>Address line 1: <code>address_full_match</code> (any city and postal code)</li>
            <li>Bank account (IBAN): <code>EE382200221020145685</code></li>
            <li>
              More:{" "}
              <a className="underline" href="https://docs.stripe.com/connect/testing" target="_blank" rel="noreferrer">
                docs.stripe.com/connect/testing
              </a>
            </li>
          </ul>
        </details>
      </div>
    </div>
  );
}
