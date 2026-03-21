"use client";

import { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpFromLine, ArrowDownFromLine } from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    if (res.ok) setSettings(await res.json());
  }, []);

  useEffect(() => {
    fetchSettings().then(() => setLoading(false));
  }, [fetchSettings]);

  async function updateSetting(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  }

  const navVisible = settings.nav_visible !== "false";
  const navPosition = settings.nav_position ?? "top";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">Page Navigation</h2>
        <div className="bg-white rounded-xl border border-border p-4 space-y-5">
          <div className="flex items-center gap-2">
            <Checkbox
              id="nav-visible"
              checked={navVisible}
              onCheckedChange={(checked) =>
                updateSetting("nav_visible", checked ? "true" : "false")
              }
            />
            <Label htmlFor="nav-visible" className="cursor-pointer">
              Show page navigation tabs
            </Label>
          </div>

          {navVisible && (
            <div className="space-y-2">
              <Label>Position</Label>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => updateSetting("nav_position", "top")}
                  className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-colors cursor-pointer ${
                    navPosition === "top"
                      ? "border-foreground bg-accent"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <ArrowUpFromLine className="h-5 w-5 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Top of page</p>
                    <p className="text-xs text-muted-foreground">Navigation appears above content</p>
                  </div>
                </button>
                <button
                  onClick={() => updateSetting("nav_position", "bottom")}
                  className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-colors cursor-pointer ${
                    navPosition === "bottom"
                      ? "border-foreground bg-accent"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <ArrowDownFromLine className="h-5 w-5 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Bottom of page</p>
                    <p className="text-xs text-muted-foreground">Navigation appears below content</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Tab order matches page order, which you can change on the Content tab.
        </p>
      </section>
    </div>
  );
}
