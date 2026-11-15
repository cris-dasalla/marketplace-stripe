"use client";

import { useActionState } from "react";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LIMITS } from "@/lib/listings";
import { sendMessage, type MessageState } from "./actions";

export function MessageForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<MessageState, FormData>(sendMessage, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div role="status" className="flex gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-900">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-green-600" aria-hidden />
        <p>
          <strong>Message sent!</strong> The seller will reply to the email you gave.
        </p>
      </div>
    );
  }

  const error = state.status === "error" ? state : null;

  return (
    <form action={action} className="flex flex-col gap-3" aria-labelledby="message-heading">
      <input type="hidden" name="listingId" value={listingId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="buyer-email">Your email</Label>
        <Input
          id="buyer-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={LIMITS.email}
          defaultValue={error?.email}
          placeholder="you@example.com"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="buyer-message">Message</Label>
        <Textarea
          id="buyer-message"
          name="body"
          required
          maxLength={LIMITS.message}
          defaultValue={error?.body ?? "Hi, is this still available?"}
          className="min-h-24"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error.message}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="h-10 font-semibold">
        {pending ? "Sending..." : "Send"}
      </Button>
    </form>
  );
}
