"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UserMenu({
  firstName,
  isAdmin,
  isOnAdmin,
  signOutAction,
}: {
  firstName: string;
  isAdmin?: boolean;
  isOnAdmin?: boolean;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey && e.key === "/") {
        e.preventDefault();
        router.push(isOnAdmin ? "/" : "/admin");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isAdmin, isOnAdmin, router]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 typo-label text-foreground hover:text-foreground/80 cursor-pointer transition-colors"
      >
        {firstName}
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-popover rounded-lg shadow-lg border border-border py-1 z-50">
          {isAdmin && (
            <Link
              href={isOnAdmin ? "/" : "/admin"}
              className="block w-full text-left px-4 py-2 typo-body text-foreground hover:bg-muted transition-colors"
              onClick={() => setOpen(false)}
            >
              {isOnAdmin ? "Back to HQ" : "Admin"}
            </Link>
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full text-left px-4 py-2 typo-body text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
