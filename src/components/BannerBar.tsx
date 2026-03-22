"use client";

import { useState, useEffect } from "react";
import {
  X,
  ChevronRight,
  ExternalLink,
  Info,
  AlertTriangle,
  AlertCircle,
  Bell,
  Megaphone,
  Calendar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ICON_MAP: Record<string, LucideIcon> = {
  INFO: Info,
  ALERT_TRIANGLE: AlertTriangle,
  ALERT_CIRCLE: AlertCircle,
  BELL: Bell,
  MEGAPHONE: Megaphone,
  CALENDAR: Calendar,
};

type Banner = {
  id: string;
  title: string;
  body: string | null;
  color: string;
  icon: string | null;
  link: string | null;
  dismissible: boolean;
};

export default function BannerBar() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);

  useEffect(() => {
    fetch("/api/banners")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setBanners(data))
      .catch(() => {});
  }, []);

  async function dismiss(bannerId: string) {
    setBanners((prev) => prev.filter((b) => b.id !== bannerId));
    await fetch("/api/banners/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bannerId }),
    });
  }

  function handleBannerClick(banner: Banner) {
    if (!banner.body && banner.link) {
      window.open(banner.link, "_blank", "noopener,noreferrer");
      return;
    }
    if (banner.body) {
      setSelectedBanner(banner);
    }
  }

  if (banners.length === 0) return null;

  return (
    <>
      <div className="space-y-2 mb-6">
        {banners.map((banner) => {
          const isYellow = banner.color !== "GRAY";
          const isClickable = banner.body || banner.link;
          const IconComp = banner.icon ? ICON_MAP[banner.icon] : null;

          return (
            <div
              key={banner.id}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 border ${
                isYellow
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-muted border-border"
              }`}
            >
              <div
                className={`flex-1 min-w-0 flex items-center gap-2 ${
                  isClickable ? "cursor-pointer" : ""
                }`}
                onClick={() => handleBannerClick(banner)}
              >
                {IconComp && (
                  <IconComp className={`h-4 w-4 shrink-0 ${isYellow ? "text-yellow-700" : "text-muted-foreground"}`} />
                )}
                <p className={`typo-label truncate ${isYellow ? "text-yellow-900" : "text-foreground"}`}>
                  {banner.title}
                </p>
                {isClickable && (
                  <ChevronRight className={`h-4 w-4 shrink-0 ${isYellow ? "text-yellow-400" : "text-muted-foreground/60"}`} />
                )}
              </div>
              {banner.dismissible && (
                <button
                  onClick={() => dismiss(banner.id)}
                  className={`shrink-0 h-10 w-10 md:h-7 md:w-7 inline-flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                    isYellow
                      ? "text-yellow-400 hover:text-yellow-600 hover:bg-yellow-100"
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
        open={!!selectedBanner}
        onOpenChange={(open) => !open && setSelectedBanner(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedBanner?.title}</DialogTitle>
          </DialogHeader>
          <DialogBody className="py-2 space-y-3">
            <p className="typo-body text-muted-foreground whitespace-pre-wrap">
              {selectedBanner?.body}
            </p>
            {selectedBanner?.link && (
              <a
                href={selectedBanner.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 typo-label text-blue-600 hover:text-blue-800 transition-colors"
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
