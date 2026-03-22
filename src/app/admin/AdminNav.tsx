"use client";

import { usePathname } from "next/navigation";
import PillNav from "@/components/PillNav";

export default function AdminNav() {
  const pathname = usePathname();
  const activeKey = pathname.startsWith("/admin/users")
    ? "users"
    : pathname.startsWith("/admin/banners")
      ? "banners"
      : "content";

  return (
    <PillNav
      items={[
        { key: "content", label: "Content", href: "/admin" },
        { key: "banners", label: "Banners", href: "/admin/banners" },
        { key: "users", label: "Users", href: "/admin/users" },
      ]}
      activeKey={activeKey}
    />
  );
}
