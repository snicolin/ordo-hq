"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type Suggestion = {
  label: string;
  value: string;
  meta?: Record<string, string | null>;
};

type AutocompleteInputProps = Omit<
  React.ComponentProps<"input">,
  "onSelect"
> & {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
};

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

function AutocompleteInput({
  suggestions,
  onSelect,
  className,
  value,
  onChange,
  ...props
}: AutocompleteInputProps) {
  const [open, setOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0, width: 0 });

  const query = String(value ?? "");

  const filtered = React.useMemo(() => {
    if (!query) return [];
    return suggestions.filter(
      (s) => fuzzyMatch(s.label, query) || fuzzyMatch(s.value, query)
    ).slice(0, 8);
  }, [query, suggestions]);

  const showDropdown = open && filtered.length > 0;

  React.useEffect(() => {
    setHighlightIndex(-1);
  }, [query]);

  React.useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  React.useEffect(() => {
    if (!showDropdown || !inputRef.current) return;
    function updatePos() {
      const rect = inputRef.current!.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [showDropdown]);

  function handleSelect(suggestion: Suggestion) {
    onSelect(suggestion);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[highlightIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <>
      <Input
        ref={inputRef}
        className={className}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          setOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        {...props}
      />
      {showDropdown && createPortal(
        <ul
          ref={listRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          className="z-[100] max-h-48 overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {filtered.map((s, i) => (
            <li
              key={`${s.label}-${s.value}`}
              className={cn(
                "flex cursor-pointer flex-col rounded-md px-2.5 py-1.5 text-sm",
                i === highlightIndex && "bg-accent"
              )}
              onMouseEnter={() => setHighlightIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s);
              }}
            >
              <span className="font-medium truncate">{s.label}</span>
              {s.value && (
                <span className="text-xs text-muted-foreground truncate">
                  {s.value}
                </span>
              )}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </>
  );
}

export { AutocompleteInput };
