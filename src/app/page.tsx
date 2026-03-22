import TeamPage from "@/components/TeamPage";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const homePage = await prisma.page.findFirst({ where: { isHome: true } });
  if (!homePage) notFound();

  return <TeamPage pageSlug={homePage.slug} />;
}
