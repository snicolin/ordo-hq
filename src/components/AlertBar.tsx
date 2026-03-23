"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ALERT_ICON_MAP } from "@/lib/alert-icons";

type Alert = {
  id: string;
  title: string;
  body: string | null;
  color: string;
  icon: string | null;
  link: string | null;
  dismissible: boolean;
};

export default function AlertBar() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  useEffect(() => {
    fetch("/api/alerts")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAlerts(data))
      .catch(() => {});
  }, []);

  async function dismiss(alertId: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    await fetch("/api/alerts/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId }),
    });
  }

  function handleAlertClick(alert: Alert) {
    if (!alert.body && alert.link) {
      window.open(alert.link, "_blank", "noopener,noreferrer");
      return;
    }
    if (alert.body) {
      setSelectedAlert(alert);
    }
  }

  if (alerts.length === 0) return null;

  return (
    <>
      <div className="space-y-2 mb-6">
        {alerts.map((alert) => {
          const isYellow = alert.color !== "GRAY";
          const isClickable = alert.body || alert.link;
              const IconComp = alert.icon ? ALERT_ICON_MAP[alert.icon] : null;

          return (
            <div
              key={alert.id}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 border ${
                isYellow
                  ? "bg-warning border-warning-border"
                  : "bg-muted border-border"
              }`}
            >
              <div
                className={`flex-1 min-w-0 flex items-center gap-2 ${
                  isClickable ? "cursor-pointer" : ""
                }`}
                onClick={() => handleAlertClick(alert)}
              >
                {IconComp && (
                  <IconComp className={`h-4 w-4 shrink-0 ${isYellow ? "text-warning-foreground/80" : "text-muted-foreground"}`} />
                )}
                <p className={`typo-label truncate ${isYellow ? "text-warning-foreground" : "text-foreground"}`}>
                  {alert.title}
                </p>
                {isClickable && (
                  <ChevronRight className={`h-4 w-4 shrink-0 ${isYellow ? "text-warning-foreground/40" : "text-muted-foreground/60"}`} />
                )}
              </div>
              {alert.dismissible && (
                <button
                  onClick={() => dismiss(alert.id)}
                  className={`shrink-0 h-10 w-10 md:h-7 md:w-7 inline-flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                    isYellow
                      ? "text-warning-foreground/40 hover:text-warning-foreground/60 hover:bg-warning-border/50"
                      : "text-muted-foreground/60 hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <Dialog
        open={!!selectedAlert}
        onOpenChange={(open) => !open && setSelectedAlert(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedAlert?.title}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="typo-body text-muted-foreground whitespace-pre-wrap">
              {selectedAlert?.body}
            </p>
            {selectedAlert?.link && (
              <a
                href={selectedAlert.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 typo-label text-link hover:text-link-hover transition-colors"
              >
                Open link
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
