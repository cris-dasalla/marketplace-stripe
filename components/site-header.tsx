import Link from "next/link";
import { Plus, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-white shadow-[0_1px_2px_rgb(0_0_0/0.06)]">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 rounded-md font-bold text-[20px] tracking-tight">
          <span className="grid size-9 place-items-center rounded-full bg-primary text-white">
            <Store className="size-5" aria-hidden />
          </span>
          Marketplace
        </Link>
        <Button asChild size="lg" className="rounded-md px-3 font-semibold">
          <Link href="/create">
            <Plus aria-hidden />
            <span className="hidden sm:inline">Create new listing</span>
            <span className="sm:hidden">Sell</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
