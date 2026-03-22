import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import AdminNav from "./AdminNav";

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
    <div className="min-h-screen bg-[#f5f5f7]">
      <AppHeader
        userName={session?.user?.name?.split(" ")[0] ?? session?.user?.email?.split("@")[0]}
        isAdmin={true}
        isOnAdmin={true}
        badge="Admin"
      />
        <div className="max-w-6xl mx-auto px-8 py-6 pb-24">
        <div className="mb-6">
          <AdminNav />
        </div>
        {children}
      </div>
    </div>
  );
}
