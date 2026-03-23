"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminLoading, AdminEmpty, AdminSectionHeader, AdminCard, AdminRowActions } from "../components";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldOff,
  Users,
  UserMinus,
  X,
} from "lucide-react";

import type { Page } from "../types";

type User = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
  isEnvAdmin: boolean;
  groupId: string | null;
  group: { id: string; name: string } | null;
  lastLogin: string;
};

type GroupMember = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

type GroupData = {
  id: string;
  name: string;
  defaultPageId: string | null;
  defaultPage: Page | null;
  members: GroupMember[];
  createdAt: string;
};

export default function AdminUsersPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [editingGroup, setEditingGroup] = useState<Partial<GroupData> | null>(null);
  const [addingMembersGroupId, setAddingMembersGroupId] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    const res = await fetch("/api/admin/pages");
    if (res.ok) setPages(await res.json());
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
  }, []);

  const fetchGroups = useCallback(async () => {
    const res = await fetch("/api/admin/groups");
    if (res.ok) setGroups(await res.json());
  }, []);

  useEffect(() => {
    async function load() {
      await Promise.all([fetchPages(), fetchUsers(), fetchGroups()]);
      setLoading(false);
    }
    load();
  }, [fetchPages, fetchUsers, fetchGroups]);

  async function toggleAdmin(userId: string, newStatus: boolean) {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggleAdmin", userId, isAdmin: newStatus }),
    });
    await fetchUsers();
  }

  async function setUserGroup(userId: string, groupId: string | null) {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setGroup", userId, groupId }),
    });
    await Promise.all([fetchUsers(), fetchGroups()]);
  }

  async function saveGroup() {
    if (!editingGroup) return;
    if (editingGroup.id) {
      await fetch("/api/admin/groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingGroup.id,
          action: "update",
          name: editingGroup.name,
          defaultPageId: editingGroup.defaultPageId,
        }),
      });
    } else {
      await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingGroup.name,
          defaultPageId: editingGroup.defaultPageId,
        }),
      });
    }
    setEditingGroup(null);
    await fetchGroups();
  }

  async function deleteGroup(id: string) {
    if (!confirm("Delete this group? Members will become unassigned.")) return;
    await fetch(`/api/admin/groups?id=${id}`, { method: "DELETE" });
    await Promise.all([fetchGroups(), fetchUsers()]);
  }

  async function removeGroupMember(groupId: string, userId: string) {
    await fetch("/api/admin/groups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: groupId, action: "removeMember", userId }),
    });
    await Promise.all([fetchGroups(), fetchUsers()]);
  }

  async function addGroupMembers(groupId: string, userIds: string[]) {
    await fetch("/api/admin/groups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: groupId, action: "addMembers", userIds }),
    });
    setAddingMembersGroupId(null);
    await Promise.all([fetchGroups(), fetchUsers()]);
  }

  function toggleGroup(groupId: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  const ungroupedUsers = users.filter((u) => !u.groupId);

  if (loading) return <AdminLoading />;

  return (
    <>
      <div className="space-y-8">

        {/* --- Groups --- */}
        <section>
          <AdminSectionHeader
            title="Groups"
            addLabel="Create Group"
            onAdd={() => setEditingGroup({ name: "", defaultPageId: null })}
          />
          <AdminCard>
            {groups.map((group) => {
              const isExpanded = expandedGroups.has(group.id);
              return (
                <div key={group.id}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 min-h-[48px] cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <span className="typo-label text-foreground">{group.name}</span>
                      <span className="typo-meta">
                        {group.members.length} {group.members.length === 1 ? "member" : "members"}
                      </span>
                    </div>
                    <AdminRowActions actions={[
                      { label: "Edit", icon: <Pencil className="h-4 w-4 mr-2" />, onClick: () => setEditingGroup(group) },
                      "separator",
                      { label: "Delete", icon: <Trash2 className="h-4 w-4 mr-2" />, onClick: () => deleteGroup(group.id), destructive: true },
                    ]} />
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border bg-muted/30">
                      {group.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 pl-10 pr-4 py-2.5 min-h-[44px] hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="typo-body text-foreground block truncate">{member.name || "Unknown"}</span>
                            <span className="typo-meta block truncate">{member.email}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                            onClick={() => removeGroupMember(group.id, member.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      {group.members.length === 0 && (
                        <div className="pl-10 pr-4 py-4 typo-meta">
                          No members in this group.
                        </div>
                      )}
                      <div className="pl-10 pr-4 py-2 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => setAddingMembersGroupId(group.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Members
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {groups.length === 0 && <AdminEmpty message="No groups yet. Create one to organize users." />}
          </AdminCard>
        </section>

        {/* --- All Users --- */}
        <section>
          <AdminSectionHeader title="Users" />
          <AdminCard>
            {users.map((user) => {
              const isAnyAdmin = user.isAdmin || user.isEnvAdmin;
              return (
                <div key={user.id} className="px-4 py-3 min-h-[48px] flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="typo-label text-foreground block truncate">{user.name || "Unknown"}</span>
                    <span className="typo-meta block truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAnyAdmin && (
                      <Badge variant="secondary" className="gap-1 shrink-0">
                        <ShieldCheck className="h-3 w-3" /> Admin
                      </Badge>
                    )}
                    {user.group && (
                      <Badge variant="outline" className="shrink-0">
                        {user.group.name}
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex items-center justify-center h-9 w-9 shrink-0 cursor-pointer rounded-lg hover:bg-muted transition-colors"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!user.isEnvAdmin && (
                          isAnyAdmin ? (
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive"
                              onClick={() => {
                                if (confirm("Remove admin access for this user?")) {
                                  toggleAdmin(user.id, false);
                                }
                              }}
                            >
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Remove Admin Access
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => toggleAdmin(user.id, true)}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Grant Admin Access
                            </DropdownMenuItem>
                          )
                        )}
                        {!user.isEnvAdmin && <DropdownMenuSeparator />}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="cursor-pointer">
                            <Users className="h-4 w-4 mr-2" />
                            Assign to Group
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {groups.map((g) => (
                              <DropdownMenuItem
                                key={g.id}
                                className="cursor-pointer"
                                disabled={user.groupId === g.id}
                                onClick={() => setUserGroup(user.id, g.id)}
                              >
                                {g.name}
                              </DropdownMenuItem>
                            ))}
                            {groups.length === 0 && (
                              <DropdownMenuItem disabled>No groups available</DropdownMenuItem>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        {user.groupId && (
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive"
                            onClick={() => setUserGroup(user.id, null)}
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Remove from Group
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
            {users.length === 0 && <AdminEmpty message="No users have logged in yet." />}
          </AdminCard>
          <p className="typo-meta mt-3">
            Users appear here automatically when they sign in.
          </p>
        </section>
      </div>

      {/* ============ GROUP DIALOG ============ */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup?.id ? "Edit Group" : "Create Group"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveGroup(); }}>
            <DialogBody className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Name</Label>
                <Input
                  id="group-name"
                  value={editingGroup?.name ?? ""}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Page</Label>
                <Select
                  value={editingGroup?.defaultPageId || "__home__"}
                  onValueChange={(v) => setEditingGroup({ ...editingGroup, defaultPageId: v === "__home__" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {editingGroup?.defaultPageId
                        ? pages.find((p) => p.id === editingGroup.defaultPageId)?.label ?? "Home"
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
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingGroup(null)} className="cursor-pointer">Cancel</Button>
              <Button type="submit" className="cursor-pointer">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============ ADD MEMBERS DIALOG ============ */}
      <Dialog open={!!addingMembersGroupId} onOpenChange={(open) => !open && setAddingMembersGroupId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Members</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-2">
            {ungroupedUsers.length === 0 ? (
              <p className="typo-body text-muted-foreground text-center py-4">All users are already in a group.</p>
            ) : (
              ungroupedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => {
                    if (addingMembersGroupId) {
                      addGroupMembers(addingMembersGroupId, [user.id]);
                    }
                  }}
                >
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="typo-body text-foreground block truncate">{user.name || "Unknown"}</span>
                    <span className="typo-meta block truncate">{user.email}</span>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                </div>
              ))
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingMembersGroupId(null)} className="cursor-pointer">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
