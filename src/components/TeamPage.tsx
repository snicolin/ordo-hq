import { auth, signOut } from "@/auth";
import Image from "next/image";
import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import {
  type TeamSlug,
  tabs,
  hrLinks,
  getToolsForTeam,
  getQuickLinksForTeam,
  getBookmarksForTeam,
} from "@/lib/data";

const tagColors: Record<TeamSlug, string> = {
  team: "bg-gray-100 text-gray-600",
  growth: "bg-[#ECFDF5] text-[#009966]",
  ops: "bg-[#FFF1F2] text-[#EC003F]",
  product: "bg-[#FEFCE8] text-[#D08700]",
};

const tagLabels: Record<TeamSlug, string> = {
  team: "Team",
  growth: "Growth",
  ops: "Ops",
  product: "Product",
};

export default async function TeamPage({
  activeTeam,
}: {
  activeTeam: TeamSlug;
}) {
  const session = await auth();
  const filteredTools = getToolsForTeam(activeTeam);
  const filteredLinks = getQuickLinksForTeam(activeTeam);
  const filteredBookmarks = getBookmarksForTeam(activeTeam);

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/">
              <Image
                src="/images/ordo-icon.png"
                alt="Ordo"
                width={28}
                height={28}
              />
            </Link>
          </div>
          <div className="flex items-center">
            {session?.user && (
              <UserMenu
                firstName={session.user.name?.split(" ")[0] ?? session.user.email?.split("@")[0] ?? "User"}
                signOutAction={async () => {
                  "use server";
                  await signOut();
                }}
              />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-6">
        {/* Navigation Tabs */}
        <nav className="flex gap-1 mb-8">
          {tabs.map((tab) => (
            <Link
              key={tab.slug}
              href={tab.href}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                tab.slug === activeTeam
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {/* Bookmarks Section - only shown if links exist for team */}
        {filteredBookmarks.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Bookmarks
            </h2>
            <div className="flex flex-wrap gap-3">
              {filteredBookmarks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-800 font-medium bg-white hover:bg-gray-100 active:bg-gray-200 px-4 py-2.5 rounded-lg border border-gray-200 transition-all duration-150"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Tools Section */}
        {filteredTools.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredTools.map((tool) => (
                <a
                  key={tool.name}
                  href={tool.href}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col"
                >
                  <div className="bg-gray-50 rounded-lg aspect-[5/4] w-full mb-4 overflow-hidden relative">
                    <Image
                      src={tool.image}
                      alt={tool.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex gap-1.5 mb-2 flex-wrap">
                    {tool.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ${tagColors[tag]}`}
                      >
                        {tagLabels[tag]}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 mb-1">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {tool.description}
                  </p>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Quick Links */}
        {filteredLinks.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Quick Links
            </h2>
            <div className="flex flex-wrap items-center gap-1">
              {filteredLinks.map((link, index) => (
                <span key={link.name} className="flex items-center">
                  <a
                    href={link.href}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded transition-colors"
                  >
                    {link.name}
                  </a>
                  {index < filteredLinks.length - 1 && (
                    <span className="text-gray-300 text-sm">•</span>
                  )}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* HR Section - only on team homepage */}
        {activeTeam === "team" && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">HR</h2>
            <div className="flex flex-wrap gap-3">
              {hrLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-800 font-medium bg-white hover:bg-gray-100 active:bg-gray-200 px-4 py-2.5 rounded-lg border border-gray-200 transition-all duration-150"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
