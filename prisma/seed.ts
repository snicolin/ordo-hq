import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { DisplayType } from "../src/generated/prisma/enums.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Pages
  const hq = await prisma.page.create({
    data: { label: "HQ", slug: "team", order: 0, isHome: true },
  });
  const growth = await prisma.page.create({
    data: { label: "Growth", slug: "growth", order: 1 },
  });
  const ops = await prisma.page.create({
    data: { label: "Ops", slug: "ops", order: 2 },
  });
  const product = await prisma.page.create({
    data: { label: "Product", slug: "product", order: 3 },
  });

  const pageMap: Record<string, string> = {
    team: hq.id,
    growth: growth.id,
    ops: ops.id,
    product: product.id,
  };
  const allPageIds = [hq.id, growth.id, ops.id, product.id];

  // -- Sections --

  // Bookmarks section (BUTTON) — one per page that has bookmarks
  const bookmarksSection = await prisma.section.create({
    data: { title: "Bookmarks", hideTitle: true, displayType: DisplayType.BUTTON },
  });

  // Tools section (TILE)
  const toolsSection = await prisma.section.create({
    data: { title: "Tools", displayType: DisplayType.TILE },
  });

  // Links section (LINK)
  const linksSection = await prisma.section.create({
    data: { title: "Links", displayType: DisplayType.LINK },
  });

  // General / HR section (BUTTON)
  const generalSection = await prisma.section.create({
    data: { title: "General", displayType: DisplayType.BUTTON },
  });

  // -- PageSection assignments --

  // HQ: Bookmarks, Tools, Links, General
  await prisma.pageSection.createMany({
    data: [
      { pageId: hq.id, sectionId: bookmarksSection.id, order: 0 },
      { pageId: hq.id, sectionId: toolsSection.id, order: 1 },
      { pageId: hq.id, sectionId: linksSection.id, order: 2 },
      { pageId: hq.id, sectionId: generalSection.id, order: 3 },
    ],
  });

  // Growth: Bookmarks, Tools, Links
  await prisma.pageSection.createMany({
    data: [
      { pageId: growth.id, sectionId: bookmarksSection.id, order: 0 },
      { pageId: growth.id, sectionId: toolsSection.id, order: 1 },
      { pageId: growth.id, sectionId: linksSection.id, order: 2 },
    ],
  });

  // Ops: Bookmarks, Tools, Links
  await prisma.pageSection.createMany({
    data: [
      { pageId: ops.id, sectionId: bookmarksSection.id, order: 0 },
      { pageId: ops.id, sectionId: toolsSection.id, order: 1 },
      { pageId: ops.id, sectionId: linksSection.id, order: 2 },
    ],
  });

  // Product: Bookmarks, Tools, Links
  await prisma.pageSection.createMany({
    data: [
      { pageId: product.id, sectionId: bookmarksSection.id, order: 0 },
      { pageId: product.id, sectionId: toolsSection.id, order: 1 },
      { pageId: product.id, sectionId: linksSection.id, order: 2 },
    ],
  });

  // -- Bookmarks (BUTTON items in bookmarksSection) --

  const bookmarksData = [
    { name: "Company Goals", href: "https://app.asana.com/0/1200544764682426/overview", teams: ["team"], order: 0 },
    { name: "Sales Hub", href: "https://www.notion.so/ordo/Sales-Team-793a166ddf68418189821ce9da1706e7", teams: ["growth"], order: 0 },
    { name: "Roadmap", href: "https://app.asana.com/1/1200544764677126/project/1210111733841363/list/1210112305945729", teams: ["ops"], order: 0 },
    { name: "Tickets", href: "https://app.asana.com/1/1200544764677126/project/1202835174780256/board/1204130844951222", teams: ["ops"], order: 1 },
    { name: "Roadmap", href: "https://app.asana.com/1/1200544764677126/project/1212643938380139/list/1212647960860475", teams: ["product"], order: 0 },
    { name: "Tickets", href: "https://app.asana.com/1/1200544764677126/project/1204959106394542/board/1204959186470006", teams: ["product"], order: 1 },
  ];

  for (const b of bookmarksData) {
    const item = await prisma.item.create({
      data: {
        sectionId: bookmarksSection.id,
        name: b.name,
        href: b.href,
        order: b.order,
      },
    });
    await prisma.itemPage.createMany({
      data: b.teams.map((t) => ({ itemId: item.id, pageId: pageMap[t] })),
    });
  }

  // -- Tools (TILE items in toolsSection) --

  const toolsData = [
    {
      name: "RFP Gremlin",
      image: "/images/rfp-gremlin.png",
      description: "Produce and submit RFP responses end to end.",
      href: "https://rfp-gremlin.ordoschools.com",
      tags: ["growth"],
      order: 0,
    },
    {
      name: "Road Warrior",
      image: "/images/road-warrior.png",
      description: "Schedule and assign on-site customer visit routings.",
      href: "https://schedule.ordo.com",
      tags: ["growth", "ops"],
      order: 1,
    },
    {
      name: "Lead Hunter 64",
      image: "/images/lead-hunter.png",
      description: "Generate a lead list of chefs for schools.",
      href: "https://chefs-leads-generator.vercel.app/",
      tags: ["growth"],
      order: 2,
    },
    {
      name: "Frogger Blogger",
      image: "/images/frogger-blogger.png",
      description: "Auto-generate and edit blog content.",
      href: "#",
      tags: ["growth"],
      disabled: true,
      order: 3,
    },
  ];

  for (const t of toolsData) {
    const item = await prisma.item.create({
      data: {
        sectionId: toolsSection.id,
        name: t.name,
        href: t.href,
        description: t.description,
        image: t.image,
        disabled: t.disabled ?? false,
        order: t.order,
      },
    });
    // Tools visible on HQ (all tools) + their specific team pages
    const pageIds = [hq.id, ...t.tags.map((tag) => pageMap[tag])];
    const unique = [...new Set(pageIds)];
    await prisma.itemPage.createMany({
      data: unique.map((pid) => ({ itemId: item.id, pageId: pid })),
    });
  }

  // -- Quick Links (LINK items in linksSection) --

  const quickLinksData = [
    { name: "Asana", href: "https://app.asana.com", teams: ["growth", "ops", "product"] },
    { name: "Backend", href: "https://backend.ordoschools.app", teams: ["ops", "product"] },
    { name: "Claude", href: "https://claude.ai", teams: ["growth", "ops", "product"] },
    { name: "Cursor", href: "https://cursor.com", teams: ["product"] },
    { name: "Customer.io", href: "https://fly.customer.io", teams: ["ops"] },
    { name: "Drive", href: "https://drive.google.com", teams: ["growth", "ops", "product"] },
    { name: "Figma", href: "https://figma.com", teams: ["product"] },
    { name: "Front", href: "https://app.frontapp.com", teams: ["growth", "ops"] },
    { name: "Gemini", href: "https://gemini.google.com", teams: ["ops", "product"] },
    { name: "GitHub", href: "https://github.com", teams: ["product"] },
    { name: "Hubspot", href: "https://app.hubspot.com", teams: ["growth", "ops"] },
    { name: "Prismic", href: "https://prismic.io/dashboard", teams: ["growth", "product"] },
    { name: "Quo", href: "https://app.quohealth.com", teams: ["growth", "ops"] },
    { name: "Sentry", href: "https://sentry.io", teams: ["product"] },
    { name: "Slack", href: "https://slack.com/signin", teams: ["growth", "ops", "product"] },
    { name: "Squarespace", href: "https://www.squarespace.com", teams: ["product"] },
    { name: "Twilio", href: "https://console.twilio.com", teams: ["product"] },
    { name: "Zapier", href: "https://zapier.com", teams: ["ops", "growth"] },
    { name: "Zoom", href: "https://zoom.us", teams: ["growth", "ops", "product"] },
    { name: "AWS", href: "https://console.aws.amazon.com", teams: ["product"] },
    { name: "Checkr", href: "https://dashboard.checkr.com", teams: ["ops"] },
    { name: "Cloudflare", href: "https://dash.cloudflare.com", teams: ["product"] },
    { name: "Elastic", href: "https://ordo-analytics.kb.us-east-2.aws.elastic-cloud.com:9243/app/home#/", teams: ["ops", "product"] },
    { name: "Fireflies.ai", href: "https://app.fireflies.ai", teams: ["ops", "growth"] },
    { name: "Hashicorp", href: "https://portal.cloud.hashicorp.com", teams: ["product"] },
    { name: "Linode", href: "https://cloud.linode.com", teams: ["product"] },
  ];

  // HQ shows a global subset: Asana, Drive, Gemini, Slack, Zoom
  const globalLinks = ["Asana", "Drive", "Gemini", "Slack", "Zoom"];

  for (let i = 0; i < quickLinksData.length; i++) {
    const l = quickLinksData[i];
    const item = await prisma.item.create({
      data: {
        sectionId: linksSection.id,
        name: l.name,
        href: l.href,
        order: i,
      },
    });

    const pageIds = l.teams.map((t) => pageMap[t]);
    if (globalLinks.includes(l.name)) {
      pageIds.push(hq.id);
    }
    const unique = [...new Set(pageIds)];
    await prisma.itemPage.createMany({
      data: unique.map((pid) => ({ itemId: item.id, pageId: pid })),
    });
  }

  // -- HR / General Links (BUTTON items in generalSection, HQ only) --

  const hrLinksData = [
    { name: "Benefits & Payroll", href: "https://justworks.com/login" },
    { name: "Request Reimbursement", href: "https://accounts.brex.com/login" },
    { name: "Expense Policy", href: "https://docs.google.com/document/d/1eY6StBlikLJEE63LBnCoEcisKGphAunNxBv64ZiV3B4/edit?usp=sharing" },
  ];

  for (let i = 0; i < hrLinksData.length; i++) {
    const h = hrLinksData[i];
    const item = await prisma.item.create({
      data: {
        sectionId: generalSection.id,
        name: h.name,
        href: h.href,
        order: i,
      },
    });
    await prisma.itemPage.create({
      data: { itemId: item.id, pageId: hq.id },
    });
  }

  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
