"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Home,
  Globe,
  Group,
} from "lucide-react";
import type { Page } from "./types";

export default function AdminContentPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<Partial<Page> | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});

  const fetchPages = useCallback(async () => {
    const res = await fetch("/api/admin/pages");
    if (res.ok) setPages(await res.json());
  }, []);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    if (res.ok) setSettings(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([fetchPages(), fetchSettings()]).then(() => setLoading(false));
  }, [fetchPages, fetchSettings]);

  async function updateSetting(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  }

  const homepageMode = settings.homepage_mode ?? "global";
  const navVisible = settings.nav_visible !== "false";
  const navPosition = settings.nav_position ?? "top";

  async function savePage() {
    if (!editingPage) return;
    const method = editingPage.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/pages", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingPage),
    });
    if (res.ok) {
      setEditingPage(null);
      await fetchPages();
    }
  }

  async function deletePage(id: string) {
    if (!confirm("Delete this page? Sections and items will remain but lose this page assignment.")) return;
    await fetch(`/api/admin/pages?id=${id}`, { method: "DELETE" });
    await fetchPages();
  }

  async function setAsHome(id: string) {
    await fetch("/api/admin/pages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isHome: true }),
    });
    await fetchPages();
  }

  async function reorderPages(id: string, direction: "up" | "down") {
    const idx = pages.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= pages.length) return;
    await fetch("/api/admin/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "page",
        items: [
          { id: pages[idx].id, order: pages[swapIdx].order },
          { id: pages[swapIdx].id, order: pages[idx].order },
        ],
      }),
    });
    await fetchPages();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="typo-body text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="typo-heading">Pages</h2>
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer"
            onClick={() => setEditingPage({ label: "", slug: "", isHome: false })}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Page
          </Button>
        </div>
        <div className="bg-white rounded-xl border border-border divide-y divide-border">
          {pages.map((page, idx) => (
            <div
              key={page.id}
              className="flex items-center gap-3 px-4 py-3 min-h-[48px] hover:bg-muted transition-colors"
            >
              <Link
                href={`/admin/pages/${page.slug}`}
                className="flex-1 min-w-0 flex items-center gap-2 flex-wrap"
              >
                <span className="typo-label text-foreground">{page.label}</span>
                <span className="typo-meta">/{page.slug === "team" ? "" : page.slug}</span>
                {page.isHome && <Badge variant="secondary" className="text-xs">Home</Badge>}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex items-center justify-center h-9 w-9 shrink-0 cursor-pointer rounded-lg hover:bg-muted transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setEditingPage(page)}>
                    <Pencil className="h-4 w-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  {!page.isHome && (
                    <DropdownMenuItem className="cursor-pointer" onClick={() => setAsHome(page.id)}>
                      <Home className="h-4 w-4 mr-2" /> Set as Home
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" disabled={idx === 0} onClick={() => reorderPages(page.id, "up")}>
                    <ChevronUp className="h-4 w-4 mr-2" /> Move Up
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" disabled={idx === pages.length - 1} onClick={() => reorderPages(page.id, "down")}>
                    <ChevronDown className="h-4 w-4 mr-2" /> Move Down
                  </DropdownMenuItem>
                  {!page.isHome && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => deletePage(page.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href={`/admin/pages/${page.slug}`} className="shrink-0">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          ))}
          {pages.length === 0 && (
            <div className="px-4 py-8 text-center typo-body text-muted-foreground">
              No pages yet. Add one to get started.
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="typo-heading mb-3">Homepage Routing</h2>
        <div className="bg-white rounded-xl border border-border p-3 flex flex-col gap-3 md:flex-row md:p-4">
          <button
            onClick={() => updateSetting("homepage_mode", "global")}
            className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-colors cursor-pointer ${
              homepageMode === "global"
                ? "border-foreground bg-accent"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <Globe className="h-5 w-5 shrink-0" />
            <div className="text-left">
              <p className="typo-label">Global Home</p>
              <p className="typo-meta">Everyone lands on the home page</p>
            </div>
          </button>
          <button
            onClick={() => updateSetting("homepage_mode", "groups")}
            className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-colors cursor-pointer ${
              homepageMode === "groups"
                ? "border-foreground bg-accent"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <Group className="h-5 w-5 shrink-0" />
            <div className="text-left">
              <p className="typo-label">Per Group</p>
              <p className="typo-meta">Each group lands on its assigned page</p>
            </div>
          </button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="typo-heading mb-3">Page Navigation</h2>
        <div className="bg-white rounded-xl border border-border px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="nav-visible"
              checked={navVisible}
              onCheckedChange={(checked) =>
                updateSetting("nav_visible", checked ? "true" : "false")
              }
            />
            <Label htmlFor="nav-visible" className="cursor-pointer text-sm">
              Show navigation tabs
            </Label>
          </div>
          {navVisible && (
            <div className="flex items-center gap-2">
              <Label className="typo-body text-muted-foreground">Position:</Label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => updateSetting("nav_position", "top")}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                    navPosition === "top"
                      ? "bg-foreground text-background"
                      : "bg-white text-foreground hover:bg-muted"
                  }`}
                >
                  Top
                </button>
                <button
                  onClick={() => updateSetting("nav_position", "bottom")}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors border-l border-border ${
                    navPosition === "bottom"
                      ? "bg-foreground text-background"
                      : "bg-white text-foreground hover:bg-muted"
                  }`}
                >
                  Bottom
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <Dialog open={!!editingPage} onOpenChange={(open) => !open && setEditingPage(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPage?.id ? "Edit Page" : "Add Page"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); savePage(); }}>
            <DialogBody className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="page-label">Label</Label>
                <Input
                  id="page-label"
                  value={editingPage?.label ?? ""}
                  onChange={(e) => setEditingPage({ ...editingPage, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="page-slug">Slug</Label>
                <Input
                  id="page-slug"
                  value={editingPage?.slug ?? ""}
                  onChange={(e) => setEditingPage({ ...editingPage, slug: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="page-home"
                  checked={editingPage?.isHome ?? false}
                  onCheckedChange={(checked) => setEditingPage({ ...editingPage, isHome: !!checked })}
                />
                <Label htmlFor="page-home" className="cursor-pointer">Home page</Label>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingPage(null)} className="cursor-pointer">Cancel</Button>
              <Button type="submit" className="cursor-pointer">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
