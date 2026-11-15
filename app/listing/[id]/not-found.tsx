import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ListingNotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-[22px] font-bold">This listing isn&apos;t available</h1>
      <p className="mt-2 text-muted-foreground">It may have been removed, or the link is wrong.</p>
      <Button asChild className="mt-6">
        <Link href="/">Browse Marketplace</Link>
      </Button>
    </div>
  );
}
