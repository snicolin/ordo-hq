import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const sections = await prisma.section.findMany({
    include: {
      pages: { orderBy: { order: "asc" } },
      items: {
        include: { pages: true },
        orderBy: { order: "asc" },
      },
    },
  });

  let clonedSections = 0;
  let clonedItems = 0;

  for (const section of sections) {
    if (section.pages.length <= 1) continue;

    const [owner, ...extras] = section.pages;
    console.log(
      `Section "${section.title}" (${section.id}) is on ${section.pages.length} pages. ` +
      `Keeping original on page ${owner.pageId}, cloning for ${extras.length} other(s).`
    );

    for (const extra of extras) {
      const clone = await prisma.section.create({
        data: {
          title: section.title,
          hideTitle: section.hideTitle,
          displayType: section.displayType,
          content: section.content,
          targetDate: section.targetDate,
          pages: {
            create: { pageId: extra.pageId, order: extra.order },
          },
        },
      });
      clonedSections++;

      for (const item of section.items) {
        const newItem = await prisma.item.create({
          data: {
            sectionId: clone.id,
            name: item.name,
            href: item.href,
            description: item.description,
            image: item.image,
            value: item.value,
            apiUrl: item.apiUrl,
            apiField: item.apiField,
            disabled: item.disabled,
            order: item.order,
            pages: {
              create: { pageId: extra.pageId },
            },
          },
        });
        clonedItems++;
        console.log(`  Cloned item "${item.name}" -> ${newItem.id}`);
      }

      await prisma.pageSection.delete({
        where: {
          pageId_sectionId: { pageId: extra.pageId, sectionId: section.id },
        },
      });
    }

    // Clean up ItemPage records for original items that reference non-owner pages
    for (const item of section.items) {
      const orphanedPages = item.pages.filter((ip) => ip.pageId !== owner.pageId);
      if (orphanedPages.length > 0) {
        await prisma.itemPage.deleteMany({
          where: {
            itemId: item.id,
            pageId: { in: orphanedPages.map((ip) => ip.pageId) },
          },
        });
        console.log(
          `  Cleaned ${orphanedPages.length} orphaned ItemPage record(s) for item "${item.name}"`
        );
      }

      // Ensure the original item has an ItemPage for the owner page
      const hasOwnerPage = item.pages.some((ip) => ip.pageId === owner.pageId);
      if (!hasOwnerPage) {
        await prisma.itemPage.create({
          data: { itemId: item.id, pageId: owner.pageId },
        });
        console.log(`  Added missing ItemPage for item "${item.name}" on owner page`);
      }
    }
  }

  // Also ensure all items have at least one ItemPage record
  const orphanItems = await prisma.item.findMany({
    where: { pages: { none: {} } },
    include: { section: { include: { pages: true } } },
  });
  for (const item of orphanItems) {
    const sectionPage = item.section.pages[0];
    if (sectionPage) {
      await prisma.itemPage.create({
        data: { itemId: item.id, pageId: sectionPage.pageId },
      });
      console.log(`Fixed orphan item "${item.name}" -> assigned to page ${sectionPage.pageId}`);
    }
  }

  console.log(`\nDone. Cloned ${clonedSections} section(s) and ${clonedItems} item(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
