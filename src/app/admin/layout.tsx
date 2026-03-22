import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import AdminNav from "./AdminNav";
import { containerClass } from "@/lib/styles";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();
  if (!admin) {
    redirect("/");
  }

  const session = await auth();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        userName={session?.user?.name?.split(" ")[0] ?? session?.user?.email?.split("@")[0]}
        isAdmin={true}
        isOnAdmin={true}
        badge="Admin"
      />
        <div className={`${containerClass} py-6 pb-24`}>
        <div className="mb-6">
          <AdminNav />
        </div>
        {children}
      </div>
    </div>
  );
}
