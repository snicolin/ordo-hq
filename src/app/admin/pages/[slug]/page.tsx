"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminLoading, AdminEmpty, AdminSectionHeader, AdminCard } from "../../components";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  EyeOff,
  Eye,
  Upload,
  ImageIcon,
  X,
} from "lucide-react";
import type { Page, Section, PageSectionJoin, Item } from "../../types";

export default function PageDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const [pages, setPages] = useState<Page[]>([]);
  const [page, setPage] = useState<Page | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [sectionItems, setSectionItems] = useState<Record<string, Item[]>>({});
  const [loading, setLoading] = useState(true);

  const [editingPage, setEditingPage] = useState<Partial<Page> | null>(null);
  const [editingSection, setEditingSection] = useState<Partial<Section & { pageAssignments?: { pageId: string; order: number }[] }> | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<Item & { pageIds?: string[] }> | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string>("");

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fetchPages = useCallback(async () => {
    const res = await fetch("/api/admin/pages");
    if (res.ok) {
      const data: Page[] = await res.json();
      setPages(data);
      const current = data.find((p) => p.slug === slug);
      setPage(current ?? null);
    }
  }, [slug]);

  const fetchSections = useCallback(async () => {
    const res = await fetch("/api/admin/sections");
    if (res.ok) setSections(await res.json());
  }, []);

  const fetchItemsForSection = useCallback(async (sectionId: string, pageId: string) => {
    const res = await fetch(`/api/admin/items?sectionId=${sectionId}&pageId=${pageId}`);
    if (res.ok) {
      const data = await res.json();
      setSectionItems((prev) => ({ ...prev, [sectionId]: data }));
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchPages(), fetchSections()]).then(() => setLoading(false));
  }, [fetchPages, fetchSections]);

  useEffect(() => {
    if (!page) return;
    expandedSections.forEach((sectionId) => {
      fetchItemsForSection(sectionId, page.id);
    });
  }, [expandedSections, page, fetchItemsForSection]);

  const pageSections = page?.sections?.sort((a, b) => a.order - b.order) ?? [];

  function toggleSection(sectionId: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  async function savePage() {
    if (!editingPage) return;
    const res = await fetch("/api/admin/pages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingPage),
    });
    if (res.ok) {
      setEditingPage(null);
      await fetchPages();
    }
  }

  async function saveSection() {
    if (!editingSection) return;
    const method = editingSection.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/sections", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingSection),
    });
    if (res.ok) {
      setEditingSection(null);
      await Promise.all([fetchPages(), fetchSections()]);
    }
  }

  async function deleteSection(id: string) {
    if (!confirm("Delete this section and ALL its items?")) return;
    await fetch(`/api/admin/sections?id=${id}`, { method: "DELETE" });
    await Promise.all([fetchPages(), fetchSections()]);
  }

  async function reorderPageSections(sectionId: string, direction: "up" | "down") {
    if (!page) return;
    const idx = pageSections.findIndex((ps) => ps.sectionId === sectionId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= pageSections.length) return;
    await fetch("/api/admin/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "pageSection",
        items: [
          { pageId: page.id, sectionId: pageSections[idx].sectionId, order: pageSections[swapIdx].order },
          { pageId: page.id, sectionId: pageSections[swapIdx].sectionId, order: pageSections[idx].order },
        ],
      }),
    });
    await fetchPages();
  }

  async function saveItem() {
    if (!editingItem || !page) return;
    const method = editingItem.id ? "PUT" : "POST";
    const payload = {
      ...editingItem,
      sectionId: editingItem.sectionId || editingSectionId,
    };
    const res = await fetch("/api/admin/items", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setEditingItem(null);
      const sid = editingItem.sectionId || editingSectionId;
      if (sid) await fetchItemsForSection(sid, page.id);
      await Promise.all([fetchPages(), fetchSections()]);
    }
  }

  async function deleteItem(item: Item) {
    if (!page) return;
    if (!confirm(`Delete "${item.name}"?`)) return;
    await fetch(`/api/admin/items?id=${item.id}`, { method: "DELETE" });
    await fetchItemsForSection(item.sectionId, page.id);
    await Promise.all([fetchPages(), fetchSections()]);
  }

  async function toggleItemDisabled(item: Item) {
    if (!page) return;
    await fetch("/api/admin/items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, disabled: !item.disabled }),
    });
    await fetchItemsForSection(item.sectionId, page.id);
  }

  async function reorderItems(sectionId: string, itemId: string, direction: "up" | "down") {
    if (!page) return;
    const items = sectionItems[sectionId] ?? [];
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    await fetch("/api/admin/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "item",
        items: [
          { id: items[idx].id, order: items[swapIdx].order },
          { id: items[swapIdx].id, order: items[idx].order },
        ],
      }),
    });
    await fetchItemsForSection(sectionId, page.id);
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        setEditingItem((prev) => ({ ...prev, image: url }));
      }
    } finally {
      setUploading(false);
    }
  }

  const currentSectionDisplayType = editingItem?.sectionId
    ? sections.find((s) => s.id === editingItem.sectionId)?.displayType
    : sections.find((s) => s.id === editingSectionId)?.displayType;

  if (loading) return <AdminLoading />;

  if (!page) {
    return (
      <div className="space-y-4">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Pages
        </Link>
        <p className="typo-body text-muted-foreground">Page not found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Pages
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="typo-heading">{page.label}</h1>
              <span className="typo-meta">/{page.slug === "team" ? "" : page.slug}</span>
              {page.isHome && <Badge variant="secondary" className="text-xs">Home</Badge>}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setEditingPage(page)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Page
            </Button>
          </div>
        </div>

        <section>
          <AdminSectionHeader
            title="Sections"
            addLabel="Add Section"
            onAdd={() =>
              setEditingSection({
                title: "",
                displayType: "BUTTON",
                pageAssignments: [{ pageId: page.id, order: pageSections.length }],
              })
            }
          />
          <AdminCard>
            {pageSections.map((ps, idx) => {
              const isExpanded = expandedSections.has(ps.sectionId);
              const items = sectionItems[ps.sectionId] ?? [];
              const title = ps.section.title;
              const itemCount = ps.section.items?.length ?? 0;

              return (
                <div key={ps.sectionId}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 min-h-[48px] cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => toggleSection(ps.sectionId)}
                  >
                    <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <span className="typo-label text-foreground">{title}</span>
                      <Badge variant="outline" className="text-xs font-normal">{ps.section.displayType}</Badge>
                      {ps.section.hideTitle && <Badge variant="secondary" className="text-xs font-normal">hidden title</Badge>}
                      <span className="typo-meta">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex items-center justify-center h-9 w-9 shrink-0 cursor-pointer rounded-lg hover:bg-muted transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer" onClick={() => {
                          const sec = sections.find((s) => s.id === ps.sectionId);
                          if (sec) {
                            setEditingSection({
                              ...sec,
                              pageAssignments: sec.pages?.map((p) => ({
                                pageId: p.pageId,
                                order: p.order,
                              })),
                            });
                          }
                        }}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => {
                          setEditingSectionId(ps.sectionId);
                          setEditingItem({
                            name: "",
                            href: "",
                            description: "",
                            image: "",
                            disabled: false,
                            sectionId: ps.sectionId,
                            pageIds: [page.id],
                          });
                        }}>
                          <Plus className="h-4 w-4 mr-2" /> Add Item
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" disabled={idx === 0} onClick={() => reorderPageSections(ps.sectionId, "up")}>
                          <ChevronUp className="h-4 w-4 mr-2" /> Move Up
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" disabled={idx === pageSections.length - 1} onClick={() => reorderPageSections(ps.sectionId, "down")}>
                          <ChevronDown className="h-4 w-4 mr-2" /> Move Down
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => deleteSection(ps.sectionId)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border bg-muted/30">
                      {items.map((item, itemIdx) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 pl-10 pr-4 py-2.5 min-h-[44px] hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm ${item.disabled ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                {item.name}
                              </span>
                              {item.disabled && <Badge variant="outline" className="text-xs">disabled</Badge>}
                            </div>
                            <p className="typo-meta truncate mt-0.5">
                              {item.href}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 shrink-0 cursor-pointer rounded-lg hover:bg-muted transition-colors">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="cursor-pointer" onClick={() => {
                                setEditingSectionId(item.sectionId);
                                setEditingItem({
                                  ...item,
                                  pageIds: item.pages?.map((p) => p.pageId) ?? [],
                                });
                              }}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => toggleItemDisabled(item)}>
                                {item.disabled ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                                {item.disabled ? "Enable" : "Disable"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="cursor-pointer" disabled={itemIdx === 0} onClick={() => reorderItems(ps.sectionId, item.id, "up")}>
                                <ChevronUp className="h-4 w-4 mr-2" /> Move Up
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" disabled={itemIdx === items.length - 1} onClick={() => reorderItems(ps.sectionId, item.id, "down")}>
                                <ChevronDown className="h-4 w-4 mr-2" /> Move Down
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => deleteItem(item)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                      {items.length === 0 && (
                        <div className="pl-10 pr-4 py-4 typo-meta">
                          No items on this page.
                        </div>
                      )}
                      <div className="pl-10 pr-4 py-2 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs cursor-pointer"
                          onClick={() => {
                            setEditingSectionId(ps.sectionId);
                            setEditingItem({
                              name: "",
                              href: "",
                              description: "",
                              image: "",
                              disabled: false,
                              sectionId: ps.sectionId,
                              pageIds: [page.id],
                            });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Item
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {pageSections.length === 0 && <AdminEmpty message="No sections on this page." />}
          </AdminCard>
        </section>
      </div>

      {/* Page Dialog */}
      <Dialog open={!!editingPage} onOpenChange={(open) => !open && setEditingPage(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Page</DialogTitle>
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

      {/* Section Dialog */}
      <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSection?.id ? "Edit Section" : "Add Section"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveSection(); }}>
            <DialogBody className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="section-title">Title</Label>
                <Input
                  id="section-title"
                  value={editingSection?.title ?? ""}
                  onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Display Type</Label>
                <Select
                  value={editingSection?.displayType ?? "BUTTON"}
                  onValueChange={(v) => setEditingSection({ ...editingSection, displayType: v as "BUTTON" | "LINK" | "TILE" })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {{ BUTTON: "Button", LINK: "Link", TILE: "Tile" }[editingSection?.displayType ?? "BUTTON"]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUTTON">Button</SelectItem>
                    <SelectItem value="LINK">Link</SelectItem>
                    <SelectItem value="TILE">Tile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="section-hide-title"
                  checked={editingSection?.hideTitle ?? false}
                  onCheckedChange={(checked) => setEditingSection({ ...editingSection, hideTitle: !!checked })}
                />
                <Label htmlFor="section-hide-title" className="cursor-pointer">Hide title on page</Label>
              </div>
              <div className="space-y-2">
                <Label>Assigned to pages</Label>
                {pages.map((p) => {
                  const assignment = editingSection?.pageAssignments?.find((pa) => pa.pageId === p.id);
                  return (
                    <div key={p.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={!!assignment}
                        onCheckedChange={(checked) => {
                          const current = editingSection?.pageAssignments ?? [];
                          if (checked) {
                            setEditingSection({
                              ...editingSection,
                              pageAssignments: [...current, { pageId: p.id, order: current.length }],
                            });
                          } else {
                            setEditingSection({
                              ...editingSection,
                              pageAssignments: current.filter((pa) => pa.pageId !== p.id),
                            });
                          }
                        }}
                      />
                      <span className="typo-body">{p.label}</span>
                    </div>
                  );
                })}
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingSection(null)} className="cursor-pointer">Cancel</Button>
              <Button type="submit" className="cursor-pointer">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem?.id ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveItem(); }}>
            <DialogBody className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="item-name">Name</Label>
                <Input
                  id="item-name"
                  value={editingItem?.name ?? ""}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-url">URL</Label>
                <Input
                  id="item-url"
                  value={editingItem?.href ?? ""}
                  onChange={(e) => setEditingItem({ ...editingItem, href: e.target.value })}
                />
              </div>
              {currentSectionDisplayType === "TILE" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="item-desc">Description</Label>
                    <Input
                      id="item-desc"
                      value={editingItem?.description ?? ""}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Image</Label>
                    {editingItem?.image ? (
                      <div className="relative group rounded-lg border border-border overflow-hidden">
                        <img
                          src={editingItem.image}
                          alt="Preview"
                          className="w-full h-32 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-foreground text-xs font-medium rounded-md hover:bg-muted transition-colors">
                            <Upload className="h-3 w-3" />
                            Replace
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleImageUpload(f);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-destructive text-xs font-medium rounded-md hover:bg-muted transition-colors cursor-pointer"
                            onClick={() => setEditingItem({ ...editingItem, image: "" })}
                          >
                            <X className="h-3 w-3" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label
                        className={`flex flex-col items-center justify-center h-28 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                          dragOver
                            ? "border-foreground bg-accent"
                            : "border-border hover:border-muted-foreground/40"
                        } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOver(false);
                          const f = e.dataTransfer.files[0];
                          if (f?.type.startsWith("image/")) handleImageUpload(f);
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleImageUpload(f);
                          }}
                        />
                        {uploading ? (
                          <p className="typo-meta">Uploading...</p>
                        ) : (
                          <>
                            <ImageIcon className="h-5 w-5 text-muted-foreground mb-1.5" />
                            <p className="typo-meta">Drag image or click to upload</p>
                            <p className="typo-caption mt-0.5">Recommended: 500 x 500px &middot; PNG or JPG</p>
                          </>
                        )}
                      </label>
                    )}
                    <Input
                      placeholder="Or paste image URL"
                      value={editingItem?.image ?? ""}
                      onChange={(e) => setEditingItem({ ...editingItem, image: e.target.value })}
                      className="h-7 text-xs"
                    />
                  </div>
                </>
              )}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="item-disabled"
                  checked={editingItem?.disabled ?? false}
                  onCheckedChange={(checked) => setEditingItem({ ...editingItem, disabled: !!checked })}
                />
                <Label htmlFor="item-disabled" className="cursor-pointer">Disabled</Label>
              </div>
              <div className="space-y-2">
                <Label>Visible on pages</Label>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {pages.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5">
                      <Checkbox
                        checked={editingItem?.pageIds?.includes(p.id) ?? false}
                        onCheckedChange={(checked) => {
                          const current = editingItem?.pageIds ?? [];
                          setEditingItem({
                            ...editingItem,
                            pageIds: checked
                              ? [...current, p.id]
                              : current.filter((id) => id !== p.id),
                          });
                        }}
                      />
                      <span className="typo-body">{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingItem(null)} className="cursor-pointer">Cancel</Button>
              <Button type="submit" className="cursor-pointer">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
