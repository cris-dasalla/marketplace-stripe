"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectWithStripe, type ConnectState } from "./actions";

export function ConnectForm() {
  const [state, action, pending] = useActionState<ConnectState, FormData>(connectWithStripe, { status: "idle" });

  if (state.status === "already-connected") {
    return (
      <div role="status" className="flex gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-green-600" aria-hidden />
        <div>
          <p className="font-semibold">{state.email} is already connected to Stripe.</p>
          <p className="mt-1 text-sm">
            Every listing with this email shows a Buy Now button.{" "}
            <Link href="/" className="font-medium underline">
              Browse Marketplace
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const error = state.status === "error" ? state : null;

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="seller-email">Email on your listings</Label>
        <Input
          id="seller-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={error?.email}
          placeholder="you@example.com"
          className="h-10"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error.message}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="h-11 bg-[#635bff] text-[15px] font-semibold hover:bg-[#5249e0]">
        {pending ? "Opening Stripe..." : "Connect with Stripe"}
      </Button>
    </form>
  );
}
