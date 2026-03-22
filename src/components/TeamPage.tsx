import { auth } from "@/auth";
import Image from "next/image";
import AppHeader from "@/components/AppHeader";
import PillNav from "@/components/PillNav";
import BannerBar from "@/components/BannerBar";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function TeamPage({ pageSlug }: { pageSlug: string }) {
  const session = await auth();
  const isAdmin = (session?.user as Record<string, unknown>)?.isAdmin === true;

  const allPages = await prisma.page.findMany({ orderBy: { order: "asc" } });

  const currentPage = allPages.find((p) => p.slug === pageSlug);
  if (!currentPage) notFound();

  const pageSections = await prisma.pageSection.findMany({
    where: { pageId: currentPage.id },
    orderBy: { order: "asc" },
    include: {
      section: {
        include: {
          items: {
            where: { pages: { some: { pageId: currentPage.id } } },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  const navSettings = await prisma.setting.findMany({
    where: { key: { in: ["nav_visible", "nav_position"] } },
  });
  const settingsMap: Record<string, string> = {};
  for (const s of navSettings) settingsMap[s.key] = s.value;
  const navVisible = settingsMap.nav_visible !== "false";
  const navPosition = settingsMap.nav_position ?? "top";

  const navItems = allPages.map((page) => ({
    key: page.slug,
    label: page.label,
    href: page.isHome ? "/" : `/${page.slug}`,
  }));

  const pillNav = navVisible ? (
    <div className={navPosition === "top" ? "mb-8" : "mt-8"}>
      <PillNav items={navItems} activeKey={pageSlug} />
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <AppHeader
        userName={session?.user?.name?.split(" ")[0] ?? session?.user?.email?.split("@")[0]}
        isAdmin={isAdmin}
        badge="HQ"
      />

      <main className="max-w-6xl mx-auto px-8 py-6">
        <BannerBar />
        {navPosition === "top" && pillNav}

        {pageSections.map((ps) => {
          const section = ps.section;
          const visibleItems = section.items.filter((item) =>
            section.displayType === "TILE" ? true : true
          );

          if (visibleItems.length === 0) return null;

          const title = section.title;

          if (section.displayType === "BUTTON") {
            return (
              <section key={ps.sectionId} className="mb-10">
                {!section.hideTitle && <h2 className="typo-heading-lg mb-3">{title}</h2>}
                <div className="flex flex-wrap gap-3">
                  {visibleItems.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="typo-label text-foreground bg-white hover:bg-muted active:bg-accent px-5 py-3 rounded-lg border border-border transition-all duration-150"
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
              </section>
            );
          }

          if (section.displayType === "TILE") {
            const sortedItems = [...visibleItems].sort(
              (a, b) => Number(a.disabled) - Number(b.disabled)
            );
            return (
              <section key={ps.sectionId} className="mb-10">
                {!section.hideTitle && <h2 className="typo-heading-lg mb-4">{title}</h2>}
                <div className="grid grid-cols-1 min-[280px]:grid-cols-2 lg:grid-cols-4 gap-4">
                  {sortedItems.map((item) => {
                    const Wrapper = item.disabled ? "div" : "a";
                    return (
                      <Wrapper
                        key={item.id}
                        {...(item.disabled ? {} : { href: item.href })}
                        className={`rounded-xl p-4 border flex flex-col ${
                          item.disabled
                            ? "bg-muted border-border opacity-50 cursor-not-allowed"
                            : "bg-white border-border shadow-sm hover:shadow-md transition-shadow"
                        }`}
                      >
                        {item.image && (
                          <div className="bg-muted rounded-lg aspect-[5/4] w-full mb-4 overflow-hidden relative">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className={`object-cover ${item.disabled ? "grayscale" : ""}`}
                            />
                          </div>
                        )}
                        <h3 className="typo-heading mb-1">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="typo-body text-muted-foreground leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </Wrapper>
                    );
                  })}
                </div>
              </section>
            );
          }

          if (section.displayType === "LINK") {
            return (
              <section key={ps.sectionId} className="mb-10">
                {!section.hideTitle && <h2 className="typo-heading-lg mb-3">{title}</h2>}
                <div className="flex flex-wrap items-center gap-1 -ml-2">
                  {visibleItems.map((item, index) => (
                    <span key={item.id} className="flex items-center">
                      <a
                        href={item.href}
                        className="typo-body text-blue-600 hover:text-blue-800 hover:underline px-2 py-2 rounded transition-colors"
                      >
                        {item.name}
                      </a>
                      {index < visibleItems.length - 1 && (
                        <span className="text-muted-foreground/40 typo-body">&bull;</span>
                      )}
                    </span>
                  ))}
                </div>
              </section>
            );
          }

          return null;
        })}

        {navPosition === "bottom" && pillNav}
      </main>
    </div>
  );
}
