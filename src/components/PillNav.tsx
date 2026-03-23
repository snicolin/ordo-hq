"use client";

import Link from "next/link";

type PillNavItem = {
  key: string;
  label: string;
  href: string;
};

export default function PillNav({
  items,
  activeKey,
}: {
  items: PillNavItem[];
  activeKey: string;
}) {
  return (
    <nav className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-1 max-w-full overflow-x-auto overscroll-none scrollbar-hide">
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`shrink-0 whitespace-nowrap px-4 py-3 md:py-2.5 rounded-md text-base md:text-sm font-medium transition-all ${
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
