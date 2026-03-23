"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminLoading, AdminEmpty, AdminSectionHeader, AdminCard, AdminRowActions } from "../components";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogStepper, DialogStep } from "@/components/ui/dialog-stepper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Megaphone } from "lucide-react";
import { ALERT_ICONS } from "@/lib/alert-icons";
import { formatDate } from "@/lib/utils";

type GroupOption = {
  id: string;
  name: string;
};

type AlertData = {
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

type AlertForm = {
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

function emptyForm(): AlertForm {
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

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AlertForm | null>(null);
  const patchEditing = (patch: Partial<AlertForm>) =>
    setEditing((prev) => (prev ? { ...prev, ...patch } : null));

  const fetchAlerts = useCallback(async () => {
    const res = await fetch("/api/admin/alerts");
    if (res.ok) setAlerts(await res.json());
  }, []);

  const fetchGroups = useCallback(async () => {
    const res = await fetch("/api/admin/groups");
    if (res.ok) {
      const data = await res.json();
      setGroups(data.map((g: GroupOption) => ({ id: g.id, name: g.name })));
    }
  }, []);

  useEffect(() => {
    async function load() {
      await Promise.all([fetchAlerts(), fetchGroups()]);
      setLoading(false);
    }
    load();
  }, [fetchAlerts, fetchGroups]);

  function openCreate() {
    setEditing(emptyForm());
  }

  function openEdit(a: AlertData) {
    setEditing({
      id: a.id,
      title: a.title,
      body: a.body ?? "",
      color: a.color,
      icon: a.icon ?? "",
      link: a.link ?? "",
      dismissible: a.dismissible,
      expiresAt: a.expiresAt.slice(0, 10),
      targetType: a.targetType,
      groupId: a.groupId ?? "",
      active: a.active,
    });
  }

  async function save() {
    if (!editing) return;
    const method = editing.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/alerts", {
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
      await fetchAlerts();
    }
  }

  async function deleteAlert(id: string) {
    if (!confirm("Delete this alert?")) return;
    await fetch(`/api/admin/alerts?id=${id}`, { method: "DELETE" });
    await fetchAlerts();
  }

  function isExpired(expiresAt: string) {
    return new Date(expiresAt) <= new Date();
  }

  if (loading) return <AdminLoading />;

  return (
    <>
      <div className="space-y-8">
        <section>
          <AdminSectionHeader title="Alerts" addLabel="Add Alert" onAdd={openCreate} />
          <AdminCard>
            {alerts.map((alert) => {
              const expired = isExpired(alert.expiresAt);
              return (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 px-4 py-3 min-h-[48px]"
                >
                  {(() => {
                    const match = ALERT_ICONS.find((o) => o.value === alert.icon);
                    const IconComp = match?.Icon ?? Megaphone;
                    return <IconComp className="h-4 w-4 text-muted-foreground shrink-0" />;
                  })()}
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="typo-label text-foreground">
                      {alert.title}
                    </span>
                    <Badge variant="outline" className="text-xs font-normal">
                      {alert.targetType === "ALL"
                        ? "Everyone"
                        : alert.group?.name ?? "Group"}
                    </Badge>
                    {!alert.dismissible && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        fixed
                      </Badge>
                    )}
                    {expired ? (
                      <Badge variant="destructive" className="text-xs font-normal">
                        expired
                      </Badge>
                    ) : !alert.active ? (
                      <Badge variant="secondary" className="text-xs font-normal">
                        inactive
                      </Badge>
                    ) : (
                      <Badge className="text-xs font-normal bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        active
                      </Badge>
                    )}
                    <span className="typo-meta">
                      expires {formatDate(alert.expiresAt)}
                    </span>
                    {(alert._count?.dismissals ?? 0) > 0 && (
                      <span className="typo-meta">
                        · {alert._count!.dismissals} dismissed
                      </span>
                    )}
                  </div>
                  <AdminRowActions actions={[
                    { label: "Edit", icon: <Pencil className="h-4 w-4 mr-2" />, onClick: () => openEdit(alert) },
                    "separator",
                    { label: "Delete", icon: <Trash2 className="h-4 w-4 mr-2" />, onClick: () => deleteAlert(alert.id), destructive: true },
                  ]} />
                </div>
              );
            })}
            {alerts.length === 0 && <AdminEmpty message="No alerts yet. Create one to get started." />}
          </AdminCard>
        </section>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit Alert" : "Add Alert"}
            </DialogTitle>
          </DialogHeader>
          <DialogStepper
            onComplete={save}
            onCancel={() => setEditing(null)}
            completeLabel="Save"
          >
            <DialogStep label="Content">
              <div className="space-y-2">
                <Label htmlFor="alert-title">Title</Label>
                <Input
                  id="alert-title"
                  value={editing?.title ?? ""}
                  onChange={(e) =>
                    patchEditing({ title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alert-body">
                  Body <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="alert-body"
                  rows={3}
                  placeholder="Leave empty if the title is the full message"
                  value={editing?.body ?? ""}
                  onChange={(e) =>
                    patchEditing({ body: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => patchEditing({ color: "YELLOW" })}
                    className={`flex-1 h-10 md:h-9 rounded-md border-2 transition-colors cursor-pointer bg-yellow-100 ${
                      editing?.color === "YELLOW" ? "border-yellow-500 ring-2 ring-yellow-200" : "border-yellow-200 hover:border-yellow-300"
                    }`}
                  >
                    <span className="text-base md:text-xs font-medium text-yellow-800">Yellow</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => patchEditing({ color: "GRAY" })}
                    className={`flex-1 h-10 md:h-9 rounded-md border-2 transition-colors cursor-pointer bg-gray-100 ${
                      editing?.color === "GRAY" ? "border-gray-500 ring-2 ring-gray-200" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-base md:text-xs font-medium text-gray-600">Gray</span>
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={editing?.icon || "NONE"}
                  onValueChange={(v) =>
                    patchEditing({ icon: !v || v === "NONE" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(() => {
                        const match = ALERT_ICONS.find((o) => o.value === editing?.icon);
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
                    {ALERT_ICONS.map((opt) => (
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
                <Label htmlFor="alert-link">
                  Link <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="alert-link"
                  type="url"
                  placeholder="https://example.com"
                  value={editing?.link ?? ""}
                  onChange={(e) =>
                    patchEditing({ link: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alert-expires">Expires</Label>
                <Input
                  id="alert-expires"
                  type="date"
                  value={editing?.expiresAt ?? ""}
                  onChange={(e) =>
                    patchEditing({ expiresAt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Target</Label>
                <Select
                  value={editing?.targetType ?? "ALL"}
                  onValueChange={(v) =>
                    setEditing((prev) =>
                      prev ? { ...prev, targetType: v ?? "ALL", groupId: !v || v === "ALL" ? "" : prev.groupId } : null
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
                      patchEditing({ groupId: v ?? "" })
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
                  id="alert-dismissible"
                  checked={editing?.dismissible ?? true}
                  onCheckedChange={(checked) =>
                    patchEditing({ dismissible: !!checked })
                  }
                />
                <Label htmlFor="alert-dismissible" className="cursor-pointer">
                  Users can dismiss this alert
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="alert-active"
                  checked={editing?.active ?? true}
                  onCheckedChange={(checked) =>
                    patchEditing({ active: !!checked })
                  }
                />
                <Label htmlFor="alert-active" className="cursor-pointer">
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
