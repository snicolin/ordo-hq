import TeamPage from "@/components/TeamPage";

export const dynamic = "force-dynamic";

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <TeamPage pageSlug={slug} />;
}
