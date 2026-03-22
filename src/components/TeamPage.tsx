import { auth } from "@/auth";
import Image from "next/image";
import AppHeader from "@/components/AppHeader";
import PillNav from "@/components/PillNav";
import AlertBar from "@/components/AlertBar";
import CountdownTimer from "@/components/CountdownTimer";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { containerClass } from "@/lib/styles";

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

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

  for (const ps of pageSections) {
    if (ps.section.displayType !== "METRIC") continue;
    await Promise.all(
      ps.section.items.map(async (item) => {
        if (!item.apiUrl) return;
        try {
          const res = await fetch(item.apiUrl, { next: { revalidate: 300 } });
          if (!res.ok) return;
          const json = await res.json();
          const resolved = item.apiField ? getNestedValue(json, item.apiField) : json;
          if (resolved !== undefined) {
            (item as Record<string, unknown>).value = String(resolved);
          }
        } catch {
          // fall back to manual value
        }
      })
    );
  }

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
    <div className="min-h-screen bg-background">
      <AppHeader
        userName={session?.user?.name?.split(" ")[0] ?? session?.user?.email?.split("@")[0]}
        isAdmin={isAdmin}
        badge="HQ"
      />

      <main className={`${containerClass} py-6`}>
        <AlertBar />
        {navPosition === "top" && pillNav}

        {pageSections.map((ps) => {
          const section = ps.section;
          const visibleItems = section.items.filter(() => true);
          const title = section.title;
          const noItemTypes = ["TEXT", "COUNTDOWN"];

          if (!noItemTypes.includes(section.displayType) && visibleItems.length === 0) return null;

          if (section.displayType === "TEXT") {
            if (!section.content) return null;
            const isHtml = /<[a-z][\s\S]*>/i.test(section.content);
            return (
              <section key={ps.sectionId} className="mb-10">
                {!section.hideTitle && <h2 className="typo-heading-lg mb-3">{title}</h2>}
                <div className="bg-card rounded-xl border border-border p-6 rich-content text-sm max-w-none">
                  {isHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: section.content }} />
                  ) : (
                    <p className="whitespace-pre-wrap">{section.content}</p>
                  )}
                </div>
              </section>
            );
          }

          if (section.displayType === "COUNTDOWN") {
            if (!section.targetDate) return null;
            return (
              <section key={ps.sectionId} className="mb-10">
                {!section.hideTitle && <h2 className="typo-heading-lg mb-3">{title}</h2>}
                <CountdownTimer
                  targetDate={section.targetDate.toISOString()}
                  label={section.content ?? undefined}
                />
              </section>
            );
          }

          if (section.displayType === "METRIC") {
            return (
              <section key={ps.sectionId} className="mb-10">
                {!section.hideTitle && <h2 className="typo-heading-lg mb-3">{title}</h2>}
                <div className="flex gap-4 overflow-x-auto pb-2 -mb-2">
                  {visibleItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-card rounded-xl border border-border p-5 min-w-[180px] flex-shrink-0"
                    >
                      <p className="typo-body text-muted-foreground mb-1">{item.name}</p>
                      <p className="text-2xl font-bold text-foreground">{item.value ?? "—"}</p>
                      {item.description && (
                        <p className="typo-meta mt-1">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          }

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
                      className="typo-label text-foreground bg-card hover:bg-muted active:bg-accent px-5 py-3 rounded-lg border border-border transition-all duration-150"
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
                            : "bg-card border-border shadow-sm hover:shadow-md transition-shadow"
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
