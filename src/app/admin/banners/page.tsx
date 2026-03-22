"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogStepper, DialogStep } from "@/components/ui/dialog-stepper";
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
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  Info,
  AlertTriangle,
  AlertCircle,
  Bell,
  Calendar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_OPTIONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: "INFO", label: "Info", Icon: Info },
  { value: "ALERT_TRIANGLE", label: "Warning", Icon: AlertTriangle },
  { value: "ALERT_CIRCLE", label: "Alert", Icon: AlertCircle },
  { value: "BELL", label: "Bell", Icon: Bell },
  { value: "MEGAPHONE", label: "Megaphone", Icon: Megaphone },
  { value: "CALENDAR", label: "Calendar", Icon: Calendar },
];

type GroupOption = {
  id: string;
  name: string;
};

type BannerData = {
  id: string;
  title: string;
  body: string | null;
  color: string;
  icon: string | null;
  link: string | null;
  dismissible: boolean;
  expiresAt: string;
  targetType: string;
  groupId: string | null;
  group: GroupOption | null;
  active: boolean;
  createdAt: string;
  _count?: { dismissals: number };
};

type BannerForm = {
  id?: string;
  title: string;
  body: string;
  color: string;
  icon: string;
  link: string;
  dismissible: boolean;
  expiresAt: string;
  targetType: string;
  groupId: string;
  active: boolean;
};

function emptyForm(): BannerForm {
  const oneWeek = new Date();
  oneWeek.setDate(oneWeek.getDate() + 7);
  return {
    title: "",
    body: "",
    color: "YELLOW",
    icon: "",
    link: "",
    dismissible: true,
    expiresAt: oneWeek.toISOString().slice(0, 10),
    targetType: "ALL",
    groupId: "",
    active: true,
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BannerForm | null>(null);

  const fetchBanners = useCallback(async () => {
    const res = await fetch("/api/admin/banners");
    if (res.ok) setBanners(await res.json());
  }, []);

  const fetchGroups = useCallback(async () => {
    const res = await fetch("/api/admin/groups");
    if (res.ok) {
      const data = await res.json();
      setGroups(data.map((g: GroupOption) => ({ id: g.id, name: g.name })));
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchBanners(), fetchGroups()]).then(() => setLoading(false));
  }, [fetchBanners, fetchGroups]);

  function openCreate() {
    setEditing(emptyForm());
  }

  function openEdit(b: BannerData) {
    setEditing({
      id: b.id,
      title: b.title,
      body: b.body ?? "",
      color: b.color,
      icon: b.icon ?? "",
      link: b.link ?? "",
      dismissible: b.dismissible,
      expiresAt: b.expiresAt.slice(0, 10),
      targetType: b.targetType,
      groupId: b.groupId ?? "",
      active: b.active,
    });
  }

  async function save() {
    if (!editing) return;
    const method = editing.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/banners", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editing,
        body: editing.body.trim() || null,
        icon: editing.icon || null,
        link: editing.link.trim() || null,
        groupId: editing.targetType === "GROUP" ? editing.groupId : null,
      }),
    });
    if (res.ok) {
      setEditing(null);
      await fetchBanners();
    }
  }

  async function deleteBanner(id: string) {
    if (!confirm("Delete this banner?")) return;
    await fetch(`/api/admin/banners?id=${id}`, { method: "DELETE" });
    await fetchBanners();
  }

  function isExpired(expiresAt: string) {
    return new Date(expiresAt) <= new Date();
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
      <div className="space-y-8">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="typo-heading">Banners</h2>
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer"
              onClick={openCreate}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Banner
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-border divide-y divide-border">
            {banners.map((banner) => {
              const expired = isExpired(banner.expiresAt);
              return (
                <div
                  key={banner.id}
                  className="flex items-center gap-3 px-4 py-3 min-h-[48px]"
                >
                  {(() => {
                    const match = ICON_OPTIONS.find((o) => o.value === banner.icon);
                    const IconComp = match?.Icon ?? Megaphone;
                    return <IconComp className="h-4 w-4 text-muted-foreground shrink-0" />;
                  })()}
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="typo-label text-foreground">
                      {banner.title}
                    </span>
                    <Badge variant="outline" className="text-xs font-normal">
                      {banner.targetType === "ALL"
                        ? "Everyone"
                        : banner.group?.name ?? "Group"}
                    </Badge>
                    {!banner.dismissible && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        fixed
                      </Badge>
                    )}
                    {expired ? (
                      <Badge variant="destructive" className="text-xs font-normal">
                        expired
                      </Badge>
                    ) : !banner.active ? (
                      <Badge variant="secondary" className="text-xs font-normal">
                        inactive
                      </Badge>
                    ) : (
                      <Badge className="text-xs font-normal bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        active
                      </Badge>
                    )}
                    <span className="typo-meta">
                      expires {formatDate(banner.expiresAt)}
                    </span>
                    {(banner._count?.dismissals ?? 0) > 0 && (
                      <span className="typo-meta">
                        · {banner._count!.dismissals} dismissed
                      </span>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex items-center justify-center h-9 w-9 shrink-0 cursor-pointer rounded-lg hover:bg-muted transition-colors"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => openEdit(banner)}
                      >
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive cursor-pointer"
                        onClick={() => deleteBanner(banner.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
            {banners.length === 0 && (
              <div className="px-4 py-8 text-center typo-body text-muted-foreground">
                No banners yet. Create one to get started.
              </div>
            )}
          </div>
        </section>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit Banner" : "Add Banner"}
            </DialogTitle>
          </DialogHeader>
          <DialogStepper
            onComplete={save}
            onCancel={() => setEditing(null)}
            completeLabel="Save"
          >
            <DialogStep label="Content">
              <div className="space-y-2">
                <Label htmlFor="banner-title">Title</Label>
                <Input
                  id="banner-title"
                  value={editing?.title ?? ""}
                  onChange={(e) =>
                    setEditing((prev) => prev && { ...prev, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner-body">
                  Body <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <textarea
                  id="banner-body"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Leave empty if the title is the full message"
                  value={editing?.body ?? ""}
                  onChange={(e) =>
                    setEditing((prev) => prev && { ...prev, body: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing((prev) => prev && { ...prev, color: "YELLOW" })}
                    className={`flex-1 h-9 rounded-md border-2 transition-colors cursor-pointer bg-yellow-100 ${
                      editing?.color === "YELLOW" ? "border-yellow-500 ring-2 ring-yellow-200" : "border-yellow-200 hover:border-yellow-300"
                    }`}
                  >
                    <span className="text-xs font-medium text-yellow-800">Yellow</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing((prev) => prev && { ...prev, color: "GRAY" })}
                    className={`flex-1 h-9 rounded-md border-2 transition-colors cursor-pointer bg-gray-100 ${
                      editing?.color === "GRAY" ? "border-gray-500 ring-2 ring-gray-200" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-xs font-medium text-gray-600">Gray</span>
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={editing?.icon || "NONE"}
                  onValueChange={(v) =>
                    setEditing((prev) => prev && { ...prev, icon: v === "NONE" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(() => {
                        const match = ICON_OPTIONS.find((o) => o.value === editing?.icon);
                        if (!match) return "None";
                        const IconComp = match.Icon;
                        return (
                          <span className="flex items-center gap-2">
                            <IconComp className="h-4 w-4" />
                            {match.label}
                          </span>
                        );
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <opt.Icon className="h-4 w-4" />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </DialogStep>
            <DialogStep label="Delivery">
              <div className="space-y-2">
                <Label htmlFor="banner-link">
                  Link <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="banner-link"
                  type="url"
                  placeholder="https://example.com"
                  value={editing?.link ?? ""}
                  onChange={(e) =>
                    setEditing((prev) => prev && { ...prev, link: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner-expires">Expires</Label>
                <Input
                  id="banner-expires"
                  type="date"
                  value={editing?.expiresAt ?? ""}
                  onChange={(e) =>
                    setEditing((prev) => prev && { ...prev, expiresAt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Target</Label>
                <Select
                  value={editing?.targetType ?? "ALL"}
                  onValueChange={(v) =>
                    setEditing((prev) =>
                      prev && { ...prev, targetType: v, groupId: v === "ALL" ? "" : prev.groupId }
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {editing?.targetType === "GROUP" ? "Specific Group" : "Everyone"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Everyone</SelectItem>
                    <SelectItem value="GROUP">Specific Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editing?.targetType === "GROUP" && (
                <div className="space-y-2">
                  <Label>Group</Label>
                  <Select
                    value={editing.groupId}
                    onValueChange={(v) =>
                      setEditing((prev) => prev && { ...prev, groupId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {groups.find((g) => g.id === editing.groupId)?.name ?? "Select a group"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="banner-dismissible"
                  checked={editing?.dismissible ?? true}
                  onCheckedChange={(checked) =>
                    setEditing((prev) => prev && { ...prev, dismissible: !!checked })
                  }
                />
                <Label htmlFor="banner-dismissible" className="cursor-pointer">
                  Users can dismiss this banner
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="banner-active"
                  checked={editing?.active ?? true}
                  onCheckedChange={(checked) =>
                    setEditing((prev) => prev && { ...prev, active: !!checked })
                  }
                />
                <Label htmlFor="banner-active" className="cursor-pointer">
                  Active
                </Label>
              </div>
            </DialogStep>
          </DialogStepper>
        </DialogContent>
      </Dialog>
    </>
  );
}
