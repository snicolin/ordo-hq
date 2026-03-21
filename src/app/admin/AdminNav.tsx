"use client";

import { usePathname } from "next/navigation";
import PillNav from "@/components/PillNav";

export default function AdminNav() {
  const pathname = usePathname();
  const activeKey = pathname.startsWith("/admin/settings")
    ? "settings"
    : pathname.startsWith("/admin/users")
      ? "users"
      : "content";

  return (
    <PillNav
      items={[
        { key: "content", label: "Content", href: "/admin" },
        { key: "users", label: "Users", href: "/admin/users" },
        { key: "settings", label: "Settings", href: "/admin/settings" },
      ]}
      activeKey={activeKey}
    />
  );
}
