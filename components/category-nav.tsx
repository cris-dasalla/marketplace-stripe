import Link from "next/link";
import { LayoutGrid, Tag } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

function href(category: string | undefined, q: string | undefined) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

interface NavProps {
  active?: string;
  q?: string;
}

/** Desktop: vertical category list in the left sidebar. */
export function CategorySidebar({ active, q }: NavProps) {
  return (
    <nav aria-label="Categories" className="rounded-xl bg-white p-2 shadow-[0_1px_2px_rgb(0_0_0/0.1)]">
      <Link
        href="/create"
        className="mb-2 flex items-center gap-2 rounded-lg px-2 py-2 font-semibold hover:bg-muted"
      >
        <span className="grid size-8 place-items-center rounded-full bg-muted">
          <Tag className="size-4" aria-hidden />
        </span>
        Create new listing
      </Link>
      <h2 className="px-2 pt-2 pb-1 text-[17px] font-bold">Categories</h2>
      <ul>
        <li>
          <CategoryLink label="All listings" to={href(undefined, q)} current={!active} icon />
        </li>
        {CATEGORIES.map((c) => (
          <li key={c.slug}>
            <CategoryLink label={c.name} to={href(c.slug, q)} current={active === c.slug} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function CategoryLink({ label, to, current, icon }: { label: string; to: string; current: boolean; icon?: boolean }) {
  return (
    <Link
      href={to}
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[15px] hover:bg-muted",
        current && "bg-primary/10 font-semibold text-primary hover:bg-primary/15",
      )}
    >
      {icon && <LayoutGrid className="size-4" aria-hidden />}
      {label}
    </Link>
  );
}

/** Mobile/tablet: horizontally scrolling category tabs. */
export function CategoryTabs({ active, q }: NavProps) {
  const tabs = [{ slug: undefined, name: "All" }, ...CATEGORIES];
  return (
    <nav aria-label="Categories" className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      <ul className="flex w-max gap-2">
        {tabs.map((c) => {
          const current = (c.slug ?? undefined) === active;
          return (
            <li key={c.name}>
              <Link
                href={href(c.slug, q)}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "block rounded-full border bg-white px-3 py-1.5 text-sm font-medium whitespace-nowrap",
                  current && "border-primary bg-primary text-white",
                )}
              >
                {c.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
