import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import { Badge } from "@/components/ui/badge";
import { signOutAction } from "@/app/actions";
import { containerClass } from "@/lib/styles";

export default function AppHeader({
  userName,
  isAdmin,
  isOnAdmin,
  badge,
}: {
  userName?: string;
  isAdmin?: boolean;
  isOnAdmin?: boolean;
  badge?: string;
}) {
  return (
    <header className="bg-card border-b border-border">
      <div className={`${containerClass} py-5 flex items-center justify-between`}>
        <div className="flex items-end gap-3">
          <Link href="/">
            <img
              src="/images/ordo-logo.svg"
              alt="Ordo HQ"
              className="h-7 w-auto"
            />
          </Link>
          {badge && (
            <Badge className={`text-xs font-medium ${badge === "Admin" ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary-foreground/10" : "bg-muted text-muted-foreground ring-1 ring-border"}`}>
              {badge}
            </Badge>
          )}
        </div>
        <div className="flex items-center">
          {userName && (
            <UserMenu
              firstName={userName}
              isAdmin={isAdmin}
              isOnAdmin={isOnAdmin}
              signOutAction={signOutAction}
            />
          )}
        </div>
      </div>
    </header>
  );
}
