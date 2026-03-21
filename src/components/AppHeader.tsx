import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import { Badge } from "@/components/ui/badge";
import { signOutAction } from "@/app/actions";

export default function AppHeader({
  userName,
  isAdmin,
  badge,
}: {
  userName?: string;
  isAdmin?: boolean;
  badge?: string;
}) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
        <div className="flex items-end gap-3">
          <Link href="/">
            <img
              src="/images/ordo-logo.svg"
              alt="Ordo HQ"
              className="h-7 w-auto"
            />
          </Link>
          {badge && (
            <Badge className="text-xs font-medium bg-gradient-to-b from-gray-700 to-gray-900 text-gray-100 shadow-sm ring-1 ring-white/10">
              {badge}
            </Badge>
          )}
        </div>
        <div className="flex items-center">
          {userName && (
            <UserMenu
              firstName={userName}
              isAdmin={isAdmin}
              signOutAction={signOutAction}
            />
          )}
        </div>
      </div>
    </header>
  );
}
