"use client";

import Link from "next/link";

type PillNavItem = {
  key: string;
  label: string;
  href?: string;
};

export default function PillNav({
  items,
  activeKey,
  onSelect,
}: {
  items: PillNavItem[];
  activeKey: string;
  onSelect?: (key: string) => void;
}) {
  return (
    <nav className="inline-flex items-center gap-0.5 rounded-lg bg-gray-200/60 p-1 overflow-x-auto scrollbar-hide">
      {items.map((item) => {
        const isActive = item.key === activeKey;
        const cls = `px-4 py-2.5 rounded-md text-base font-medium transition-all ${
          isActive
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
        }`;

        if (item.href && !onSelect) {
          return (
            <Link key={item.key} href={item.href} className={cls}>
              {item.label}
            </Link>
          );
        }

        return (
          <button
            key={item.key}
            onClick={() => onSelect?.(item.key)}
            className={`${cls} cursor-pointer`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
