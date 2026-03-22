"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminLoading, AdminEmpty, AdminSectionHeader, AdminCard, AdminRowActions, type AdminAction } from "./components";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Home,
  Globe,
  Group,
} from "lucide-react";
import type { Page } from "./types";

type GroupData = {
  id: string;
  name: string;
  defaultPageId: string | null;
};

export default function AdminContentPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<Partial<Page> | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});

  const fetchPages = useCallback(async () => {
    const res = await fetch("/api/admin/pages");
    if (res.ok) setPages(await res.json());
  }, []);

  const fetchGroups = useCallback(async () => {
    const res = await fetch("/api/admin/groups");
    if (res.ok) setGroups(await res.json());
  }, []);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    if (res.ok) setSettings(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([fetchPages(), fetchGroups(), fetchSettings()]).then(() => setLoading(false));
  }, [fetchPages, fetchGroups, fetchSettings]);

  async function updateSetting(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  }

  async function updateGroupDefaultPage(groupId: string, defaultPageId: string | null) {
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, defaultPageId } : g));
    await fetch("/api/admin/groups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: groupId, action: "update", defaultPageId }),
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

  if (loading) return <AdminLoading />;

  return (
    <>
      <section>
        <AdminSectionHeader
          title="Pages"
          addLabel="Add Page"
          onAdd={() => setEditingPage({ label: "", slug: "", isHome: false })}
        />
        <AdminCard>
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
              <AdminRowActions actions={[
                { label: "Edit", icon: <Pencil className="h-4 w-4 mr-2" />, onClick: () => setEditingPage(page) },
                ...(!page.isHome ? [{ label: "Set as Home", icon: <Home className="h-4 w-4 mr-2" />, onClick: () => setAsHome(page.id) }] as AdminAction[] : []),
                "separator",
                { label: "Move Up", icon: <ChevronUp className="h-4 w-4 mr-2" />, onClick: () => reorderPages(page.id, "up"), disabled: idx === 0 },
                { label: "Move Down", icon: <ChevronDown className="h-4 w-4 mr-2" />, onClick: () => reorderPages(page.id, "down"), disabled: idx === pages.length - 1 },
                ...(!page.isHome ? ["separator" as const, { label: "Delete", icon: <Trash2 className="h-4 w-4 mr-2" />, onClick: () => deletePage(page.id), destructive: true }] as AdminAction[] : []),
              ]} />
              <Link href={`/admin/pages/${page.slug}`} className="shrink-0">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          ))}
          {pages.length === 0 && <AdminEmpty message="No pages yet. Add one to get started." />}
        </AdminCard>
      </section>

      <section className="mt-8">
        <h2 className="typo-heading mb-3">Homepage</h2>
        <div className="bg-card rounded-xl border border-border flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
          <button
            onClick={() => updateSetting("homepage_mode", "global")}
            className={`flex-1 flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer first:rounded-t-xl last:rounded-b-xl md:first:rounded-l-xl md:first:rounded-tr-none md:last:rounded-r-xl md:last:rounded-bl-none ${
              homepageMode === "global"
                ? "bg-accent"
                : "hover:bg-muted"
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
            className={`flex-1 flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer first:rounded-t-xl last:rounded-b-xl md:first:rounded-l-xl md:first:rounded-tr-none md:last:rounded-r-xl md:last:rounded-bl-none ${
              homepageMode === "groups"
                ? "bg-accent"
                : "hover:bg-muted"
            }`}
          >
            <Group className="h-5 w-5 shrink-0" />
            <div className="text-left">
              <p className="typo-label">Per Group</p>
              <p className="typo-meta">Each group lands on its assigned page</p>
            </div>
          </button>
        </div>
        {homepageMode === "groups" && (
          <div className="mt-3">
            <AdminCard>
              {groups.length === 0 ? (
                <div className="px-4 py-4 typo-meta text-center">
                  No groups yet. Create groups in the Users tab to assign landing pages.
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.id} className="flex items-center gap-3 px-4 py-3 min-h-[48px]">
                    <span className="typo-label text-foreground flex-1">{group.name}</span>
                    <Select
                      value={group.defaultPageId || "__home__"}
                      onValueChange={(v) => updateGroupDefaultPage(group.id, v === "__home__" ? null : v)}
                    >
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue>
                          {group.defaultPageId
                            ? pages.find((p) => p.id === group.defaultPageId)?.label ?? "Home"
                            : "Home"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__home__">Home</SelectItem>
                        {pages.filter((p) => !p.isHome).map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))
              )}
            </AdminCard>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="typo-heading mb-3">Page Navigation</h2>
        <div className="bg-card rounded-xl border border-border px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
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
                      : "bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  Top
                </button>
                <button
                  onClick={() => updateSetting("nav_position", "bottom")}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors border-l border-border ${
                    navPosition === "bottom"
                      ? "bg-foreground text-background"
                      : "bg-card text-foreground hover:bg-muted"
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
