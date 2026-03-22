import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { DisplayType } from "../src/generated/prisma/enums.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "hunter@ordoschools.com,sheila@ordoschools.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// ---------------------------------------------------------------------------
// Rich HTML content for Growth TEXT sections
// ---------------------------------------------------------------------------

const MENUS_HTML = `<h3>Public School Menus for SY26</h3><p><strong>Guidance ONLY \u2014 subject to approval by #deal-desk in Slack</strong></p><p><strong>School Sales ONLY \u2014 not suitable for chefs</strong></p><p><br>\ud83d\udc76 <a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://drive.google.com/drive/folders/1uERk08CWS80shOHxi1zVwvS8B4g9otU2?usp=share_link">Pre-K CACFP</a></p><ul><li><p><a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://hubs.ly/Q03ZYd9-0">Breakfast</a></p></li><li><p><a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://hubs.ly/Q03ZYnYQ0">Lunch</a></p></li><li><p><a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://hubs.ly/Q03ZYj0g0">Snack</a></p></li><li><p><a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://hubs.ly/Q03ZYn_z0">Supper</a></p></li></ul><p><br>\ud83e\uddd2 <a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://drive.google.com/drive/u/1/folders/1VW6eBdffX7aM0Wbo4lFCM88QcpX_I-Qe">K-8 CACFP</a></p><ul><li><p><a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://hubs.ly/Q03ZYn-l0">Breakfast</a></p></li><li><p><a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://hubs.ly/Q03ZYhXb0">Lunch</a></p></li><li><p><a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://hubs.ly/Q03ZYp1B0">Snack</a></p></li><li><p><a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://hubs.ly/Q03ZYpcS0">Supper</a></p></li></ul><p><br>\ud83e\uddd2 <a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://drive.google.com/drive/folders/1OnMo363csPMA3cdsGieTWMxqsJ6Uk_q2?usp=share_link">K-12 NSLP</a></p><ul><li><p><a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://hubs.ly/Q042zSTv0">Breakfast</a></p></li><li><p><a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://hubs.ly/Q042zST60">Lunch</a></p></li><li><p><a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://hubs.ly/Q042zSWb0">Snack</a></p></li></ul><p></p>`;

const PRICING_HTML = `<h3>Menu Pricing for SY26</h3><p><strong>Guidance ONLY \u2014 subject to approval by #deal-desk in Slack</strong></p><p><strong>School Sales ONLY \u2014 not suitable for chefs</strong></p><p></p><p>Pre-K CACFP</p><ul><li><p>Breakfast: $2.20</p></li><li><p>Lunch: $4.30</p></li><li><p>AM/PM Snack: $1.20</p></li><li><p>Supper: $4.20</p></li></ul><p><br>K-12 CACFP</p><ul><li><p>Breakfast: $2.20</p></li><li><p>Lunch: $4.40</p></li><li><p>Snack: $1.20</p></li><li><p>Supper: $4.40</p></li></ul><p><br>NSLP</p><ul><li><p>Breakfast: $2.20</p></li><li><p>Lunch: $4.40</p></li><li><p>Snack: $1.20</p></li></ul><p></p>`;

const STATES_HTML = `<ul><li><p>New Mexico</p></li><li><p>Arkansas</p></li><li><p>Michigan vended meals (with one exception: we can do metro Detroit area)</p></li><li><p>Maine</p></li><li><p>DC</p></li><li><p>Nebraska</p></li><li><p>North Dakota</p></li><li><p>South Dakota</p></li><li><p>West Virginia</p></li><li><p>Wyoming</p></li><li><p>Alaska</p></li><li><p>Hawaii</p></li></ul><p></p>`;

const STUDY_MATERIALS_HTML = `<p>\ud83d\udccb <a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://docs.google.com/spreadsheets/d/1UwmkFh3fFoy0h_lvJO7iFCNqjiZiMpbfrxPDWGrS7Gc/edit?usp=sharing">Sales Onboarding Checklist</a></p><p>\ud83d\udcdc <a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://docs.google.com/document/d/1hyQCbB9GtJ6cgDCx4Zp273y_AigjUWUKQSv1OINR-e8/edit?tab=t.0">Public Cold Calling Script</a></p><p>\ud83d\uddfa\ufe0f <a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://file.notion.so/f/f/24800a48-c035-4c1d-b92f-739a74e44fac/b56d2a03-3812-4e48-9630-614ada2feb8b/Sales-Director-Playbook_(1).pdf?table=block&amp;id=2e04ca6e-2c7f-80c9-8fda-cb4e522189c0&amp;spaceId=24800a48-c035-4c1d-b92f-739a74e44fac&amp;expirationTimestamp=1774173600000&amp;signature=bgCkbcRj1XMflO6RdmG_i-bux_KweC7jvK5pypb33xg&amp;downloadName=Sales-Director-Playbook+%281%29.pdf">Sales Director Playbook</a></p><p>\ud83c\udfeb <a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://docs.google.com/spreadsheets/d/1gkLl9_x8q0t1ThsjCGXpGS1S8NxnUEI2fxNvw5hI61g/edit?usp=sharing">Ordo Customers (January 2026)</a></p><hr><p>\ud83c\udfa5 Example Recorded Sales Calls with Public Schools</p><ul><li><p><a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://app.fireflies.ai/view/Ordo-Lunch-Overview::01K722M7WA6JFRMD0HFHNAM97X">Salem City School District</a></p></li><li><p><a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://app.fireflies.ai/view/Ordo-School-Lunch-Larkspur-Corte-Madera-SD::01K9AVZV8JMEGWGZA3V52N3KW0?channelSource=mine">Larkspur-Corte Madera School District</a></p></li><li><p><a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://app.fireflies.ai/view/Ordo-School-Lunch-YMCA-of-Central-Florida::01KBDX5E431Z3H8NKS8QH08WA9?channelSource=mine">YMCA of Central Florida</a></p></li><li><p><a target="_blank" rel="noopener noreferrer nofollow" class="rich-link" href="https://app.fireflies.ai/view/Ordo-Lunch-Overview::01JSFKYSEN6WF7YPMNM3YTQ6NM">San Joaquin County Office of Education</a></p></li></ul><p></p>`;

const EXTRAS_HTML = `<p><a target="_blank" rel="noopener noreferrer" class="rich-link notion-link-token notion-focusable-token notion-enable-hover" href="https://www.youtube.com/watch?v=xZi4kTJG-LE"><u>\u201cHow to Sell\u201d</u></a> by founders of Clever, $500M ed-tech and early investors in Ordo, is a great lesson on how to sell, salably and online, with a great template for email sales.</p>`;

// ---------------------------------------------------------------------------
// Reusable tool data (same across HQ, Growth, Ops, Product — varies by page)
// ---------------------------------------------------------------------------

type ToolDef = {
  name: string;
  href: string;
  description: string;
  image: string;
  disabled?: boolean;
};

const TOOLS: ToolDef[] = [
  { name: "RFP Gremlin", href: "https://rfp-gremlin.ordoschools.com", description: "Produce and submit RFP responses end to end.", image: "/images/rfp-gremlin.png" },
  { name: "Road Warrior", href: "https://schedule.ordo.com", description: "Schedule and assign on-site customer visit routings.", image: "/images/road-warrior.png" },
  { name: "Lead Hunter 64", href: "https://chefs-leads-generator.vercel.app/", description: "Generate a lead list of chefs for schools.", image: "/images/lead-hunter.png" },
  { name: "Frogger Blogger", href: "#", description: "Auto-generate and edit blog content.", image: "/images/frogger-blogger.png", disabled: true },
];

// ---------------------------------------------------------------------------
// Helper: create items for a section, return created items
// ---------------------------------------------------------------------------

type ItemDef = {
  name: string;
  href: string;
  description?: string;
  image?: string;
  disabled?: boolean;
};

async function createItems(sectionId: string, pageId: string, items: ItemDef[]) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    await prisma.item.create({
      data: {
        sectionId,
        name: it.name,
        href: it.href,
        description: it.description ?? null,
        image: it.image ?? null,
        disabled: it.disabled ?? false,
        order: i,
        pages: { create: { pageId } },
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Clearing content tables (preserving users)...");

  await prisma.alertDismissal.deleteMany();
  await prisma.itemPage.deleteMany();
  await prisma.pageSection.deleteMany();
  await prisma.item.deleteMany();
  await prisma.section.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.user.updateMany({ data: { groupId: null } });
  await prisma.group.deleteMany();
  await prisma.page.deleteMany();
  await prisma.setting.deleteMany();

  // =========================================================================
  // Pages
  // =========================================================================

  console.log("Creating pages...");

  const hq = await prisma.page.create({ data: { label: "HQ", slug: "team", order: 0, isHome: true } });
  const growth = await prisma.page.create({ data: { label: "Growth", slug: "growth", order: 1 } });
  const ops = await prisma.page.create({ data: { label: "Ops", slug: "ops", order: 2 } });
  const product = await prisma.page.create({ data: { label: "Product", slug: "product", order: 3 } });

  // =========================================================================
  // HQ Sections & Items
  // =========================================================================

  console.log("Seeding HQ...");

  const hqBookmarks = await prisma.section.create({ data: { title: "Bookmarks", displayType: DisplayType.BUTTON, hideTitle: true } });
  const hqTools = await prisma.section.create({ data: { title: "Tools", displayType: DisplayType.TILE } });
  const hqLinks = await prisma.section.create({ data: { title: "Links", displayType: DisplayType.LINK } });
  const hqGeneral = await prisma.section.create({ data: { title: "General", displayType: DisplayType.BUTTON } });

  await prisma.pageSection.createMany({
    data: [
      { pageId: hq.id, sectionId: hqBookmarks.id, order: 0 },
      { pageId: hq.id, sectionId: hqTools.id, order: 1 },
      { pageId: hq.id, sectionId: hqLinks.id, order: 2 },
      { pageId: hq.id, sectionId: hqGeneral.id, order: 3 },
    ],
  });

  await createItems(hqBookmarks.id, hq.id, [
    { name: "Company Goals", href: "https://app.asana.com/0/1200544764682426/overview" },
  ]);

  await createItems(hqTools.id, hq.id, TOOLS);

  await createItems(hqLinks.id, hq.id, [
    { name: "Backend", href: "https://backend.ordoschools.app" },
    { name: "Claude", href: "https://claude.ai/new" },
    { name: "Gemini", href: "https://gemini.google.com/go" },
    { name: "Drive", href: "https://drive.google.com" },
    { name: "Front", href: "https://app.frontapp.com" },
    { name: "Quo", href: "https://my.quo.com/" },
    { name: "Slack", href: "https://ordoschools.slack.com" },
    { name: "Zoom", href: "https://app.zoom.us/" },
    { name: "Elastic", href: "https://ordo-analytics.kb.us-east-2.aws.elastic-cloud.com:9243/app/home#/" },
    { name: "Github", href: "https://github.com/Ordo-Schools/" },
  ]);

  await createItems(hqGeneral.id, hq.id, [
    { name: "Benefits & Payroll", href: "https://justworks.com/login" },
    { name: "Request Reimbursement", href: "https://accounts.brex.com/login" },
    { name: "Expense Policy", href: "https://docs.google.com/document/d/1eY6StBlikLJEE63LBnCoEcisKGphAunNxBv64ZiV3B4/edit?usp=sharing" },
  ]);

  // =========================================================================
  // Growth Sections & Items
  // =========================================================================

  console.log("Seeding Growth...");

  const growthBookmarks = await prisma.section.create({ data: { title: "Bookmarks", displayType: DisplayType.BUTTON, hideTitle: true } });
  const growthTools = await prisma.section.create({ data: { title: "Tools", displayType: DisplayType.TILE } });
  const growthLinks = await prisma.section.create({ data: { title: "Links", displayType: DisplayType.LINK } });
  const growthMenus = await prisma.section.create({ data: { title: "Menus", displayType: DisplayType.TEXT, collapsible: true, content: MENUS_HTML } });
  const growthPricing = await prisma.section.create({ data: { title: "Pricing", displayType: DisplayType.TEXT, collapsible: true, content: PRICING_HTML } });
  const growthStates = await prisma.section.create({ data: { title: "U.S. States We DON'T Serve", displayType: DisplayType.TEXT, collapsible: true, content: STATES_HTML } });
  const growthStudy = await prisma.section.create({ data: { title: "Study Materials", displayType: DisplayType.TEXT, content: STUDY_MATERIALS_HTML } });
  const growthExtras = await prisma.section.create({ data: { title: "Extras", displayType: DisplayType.TEXT, content: EXTRAS_HTML } });

  await prisma.pageSection.createMany({
    data: [
      { pageId: growth.id, sectionId: growthBookmarks.id, order: 0 },
      { pageId: growth.id, sectionId: growthTools.id, order: 1 },
      { pageId: growth.id, sectionId: growthLinks.id, order: 2 },
      { pageId: growth.id, sectionId: growthMenus.id, order: 3 },
      { pageId: growth.id, sectionId: growthPricing.id, order: 4 },
      { pageId: growth.id, sectionId: growthStates.id, order: 5 },
      { pageId: growth.id, sectionId: growthStudy.id, order: 6 },
      { pageId: growth.id, sectionId: growthExtras.id, order: 7 },
    ],
  });

  await createItems(growthBookmarks.id, growth.id, [
    { name: "Company Goals", href: "https://app.asana.com/0/1200544764682426/overview" },
    { name: "HubSpot Dashboard", href: "https://app.hubspot.com/reports-dashboard/21895106/view/9422026" },
    { name: "Roadmap", href: "https://app.asana.com/1/1200544764677126/project/1212649560876345/list/1212651409901889" },
    { name: "Chef Contract", href: "https://docs.google.com/document/d/1KNaHDFEIoSePppPOMU30wFVcuZuNlTHL/edit#heading=h.m7idcke25h7a" },
  ]);

  await createItems(growthTools.id, growth.id, TOOLS);

  await createItems(growthLinks.id, growth.id, [
    { name: "Gemini", href: "https://gemini.google.com/app" },
    { name: "Hubspot", href: "https://app.hubspot.com" },
    { name: "Prismic", href: "https://ordo-playground.prismic.io/" },
    { name: "Slack", href: "https://ordoschools.slack.com" },
    { name: "Zoom", href: "https://app.zoom.us" },
    { name: "Fireflies.ai", href: "https://app.fireflies.ai" },
    { name: "Quo", href: "https://my.quo.com/inbox" },
  ]);

  // =========================================================================
  // Ops Sections & Items
  // =========================================================================

  console.log("Seeding Ops...");

  const opsBookmarks = await prisma.section.create({ data: { title: "Bookmarks", displayType: DisplayType.BUTTON, hideTitle: true } });
  const opsTools = await prisma.section.create({ data: { title: "Tools", displayType: DisplayType.TILE } });
  const opsLinks = await prisma.section.create({ data: { title: "Links", displayType: DisplayType.LINK } });

  await prisma.pageSection.createMany({
    data: [
      { pageId: ops.id, sectionId: opsBookmarks.id, order: 0 },
      { pageId: ops.id, sectionId: opsTools.id, order: 1 },
      { pageId: ops.id, sectionId: opsLinks.id, order: 2 },
    ],
  });

  await createItems(opsBookmarks.id, ops.id, [
    { name: "Company Goals", href: "https://app.asana.com/0/1200544764682426/overview" },
    { name: "Roadmap", href: "https://app.asana.com/1/1200544764677126/project/1210111733841363/list/1210112305945729" },
    { name: "Tickets", href: "https://app.asana.com/1/1200544764677126/project/1202835174780256/board/1204130844951222" },
  ]);

  await createItems(opsTools.id, ops.id, [
    TOOLS[0], // RFP Gremlin
    TOOLS[1], // Road Warrior
    TOOLS[2], // Lead Hunter 64
  ]);

  await createItems(opsLinks.id, ops.id, [
    { name: "Asana", href: "https://app.asana.com" },
    { name: "Backend", href: "https://backend.ordoschools.app" },
    { name: "Claude", href: "https://claude.ai/new" },
    { name: "Gemini", href: "https://gemini.google.com/app" },
    { name: "Customer.io", href: "https://fly.customer.io/" },
    { name: "Drive", href: "https://drive.google.com" },
    { name: "Front", href: "https://app.frontapp.com" },
    { name: "Hubspot", href: "https://app.hubspot.com/contacts/21895106/objects/0-3/views/58955227/board" },
    { name: "Quo", href: "https://my.quo.com/inbox" },
    { name: "Slack", href: "https://ordoschools.slack.com" },
    { name: "Zoom", href: "https://app.zoom.us/" },
    { name: "Elastic", href: "https://ordo-analytics.kb.us-east-2.aws.elastic-cloud.com:9243/app/home#/" },
    { name: "Checkr", href: "https://dashboard.checkr.com" },
    { name: "Fireflies.ai", href: "https://app.fireflies.ai" },
  ]);

  // =========================================================================
  // Product Sections & Items
  // =========================================================================

  console.log("Seeding Product...");

  const productBookmarks = await prisma.section.create({ data: { title: "Bookmarks", displayType: DisplayType.BUTTON, hideTitle: true } });
  const productTools = await prisma.section.create({ data: { title: "Tools", displayType: DisplayType.TILE } });
  const productLinks = await prisma.section.create({ data: { title: "Links", displayType: DisplayType.LINK } });

  await prisma.pageSection.createMany({
    data: [
      { pageId: product.id, sectionId: productBookmarks.id, order: 0 },
      { pageId: product.id, sectionId: productTools.id, order: 1 },
      { pageId: product.id, sectionId: productLinks.id, order: 2 },
    ],
  });

  await createItems(productBookmarks.id, product.id, [
    { name: "Company Goals", href: "https://app.asana.com/0/1200544764682426/overview" },
    { name: "Roadmap", href: "https://app.asana.com/1/1200544764677126/project/1212643938380139/list/1212647960860475" },
    { name: "Tickets", href: "https://app.asana.com/1/1200544764677126/project/1212949087935104/board/1212949120701696" },
  ]);

  await createItems(productTools.id, product.id, TOOLS);

  await createItems(productLinks.id, product.id, [
    { name: "Backend", href: "https://backend.ordoschools.app" },
    { name: "Customer.io", href: "https://fly.customer.io" },
    { name: "Figma", href: "https://www.figma.com/files" },
    { name: "GitHub", href: "https://github.com/Ordo-Schools/" },
    { name: "Prismic", href: "https://prismic.io/dashboard" },
    { name: "Sentry", href: "https://sentry.io" },
    { name: "Slack", href: "https://ordoschools.slack.com" },
    { name: "Twilio", href: "https://console.twilio.com" },
    { name: "Zoom", href: "https://app.zoom.us/" },
    { name: "AWS", href: "https://console.aws.amazon.com" },
    { name: "Cloudflare", href: "https://dash.cloudflare.com" },
    { name: "Elastic", href: "https://ordo-analytics.kb.us-east-2.aws.elastic-cloud.com:9243/app/home#/" },
  ]);

  // =========================================================================
  // Groups (with default pages)
  // =========================================================================

  console.log("Creating groups...");

  await prisma.group.create({ data: { name: "HQ" } });
  await prisma.group.create({ data: { name: "Growth", defaultPageId: growth.id } });
  await prisma.group.create({ data: { name: "Ops", defaultPageId: ops.id } });
  await prisma.group.create({ data: { name: "Product", defaultPageId: product.id } });

  // =========================================================================
  // Settings
  // =========================================================================

  await prisma.setting.create({ data: { key: "homepage_mode", value: "global" } });

  // =========================================================================
  // Admin users (upsert — preserves existing accounts)
  // =========================================================================

  console.log("Upserting admin users...");

  for (const email of ADMIN_EMAILS) {
    await prisma.user.upsert({
      where: { email },
      update: { isAdmin: true },
      create: { email, isAdmin: true },
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
