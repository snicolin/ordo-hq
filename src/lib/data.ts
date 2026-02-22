export type TeamSlug = "team" | "growth" | "ops" | "product";

export const tabs: { label: string; slug: TeamSlug; href: string }[] = [
  { label: "HQ", slug: "team", href: "/" },
  { label: "Growth", slug: "growth", href: "/growth" },
  { label: "Ops", slug: "ops", href: "/ops" },
  { label: "Product", slug: "product", href: "/product" },
];

export const tools = [
  {
    name: "RFP Gremlin",
    image: "/images/rfp-gremlin.png",
    tags: ["growth"] as TeamSlug[],
    description: "Produce and submit RFP responses end to end.",
    href: "https://rfp-gremlin.ordoschools.com",
  },
  {
    name: "Road Warrior",
    image: "/images/road-warrior.png",
    tags: ["growth", "ops"] as TeamSlug[],
    description: "Schedule and assign on-site customer visit routings.",
    href: "https://schedule.ordo.com",
  },
  {
    name: "Frogger Blogger",
    image: "/images/frogger-blogger.png",
    tags: ["growth"] as TeamSlug[],
    description: "Auto-generate and edit blog content.",
    href: "#",
    disabled: true,
  },
  {
    name: "Lead Hunter 64",
    image: "/images/lead-hunter.png",
    tags: ["growth"] as TeamSlug[],
    description: "Generate list-for-basic chief needs.",
    href: "https://chefs-leads-generator.vercel.app/",
  },
];

export const quickLinks: { name: string; href: string; teams: TeamSlug[] }[] = [
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

export const hrLinks = [
  {
    name: "Benefits & Payroll",
    href: "https://justworks.com/login",
  },
  {
    name: "Request Reimbursement",
    href: "https://accounts.brex.com/login",
  },
  {
    name: "Expense Policy",
    href: "https://docs.google.com/document/d/1eY6StBlikLJEE63LBnCoEcisKGphAunNxBv64ZiV3B4/edit?usp=sharing",
  },
];

export const bookmarks: { name: string; href: string; teams: TeamSlug[] }[] = [
  {
    name: "Company Goals",
    href: "https://app.asana.com/0/1200544764682426/overview",
    teams: ["team"],
  },
  {
    name: "Sales Hub",
    href: "https://www.notion.so/ordo/Sales-Team-793a166ddf68418189821ce9da1706e7",
    teams: ["growth"],
  },
  {
    name: "Roadmap",
    href: "https://app.asana.com/1/1200544764677126/project/1210111733841363/list/1210112305945729",
    teams: ["ops"],
  },
  {
    name: "Tickets",
    href: "https://app.asana.com/1/1200544764677126/project/1202835174780256/board/1204130844951222",
    teams: ["ops"],
  },
  {
    name: "Roadmap",
    href: "https://app.asana.com/1/1200544764677126/project/1212643938380139/list/1212647960860475",
    teams: ["product"],
  },
  {
    name: "Tickets",
    href: "https://app.asana.com/1/1200544764677126/project/1204959106394542/board/1204959186470006",
    teams: ["product"],
  },
];

export function getBookmarksForTeam(team: TeamSlug) {
  return bookmarks.filter((b) => b.teams.includes(team));
}

export function getToolsForTeam(team: TeamSlug) {
  const filtered = team === "team" ? tools : tools.filter((t) => t.tags.includes(team));
  return [...filtered].sort((a, b) => Number(!!("disabled" in a && a.disabled)) - Number(!!("disabled" in b && b.disabled)));
}

const globalLinks = ["Asana", "Drive", "Gemini", "Slack", "Zoom"];

export function getQuickLinksForTeam(team: TeamSlug) {
  if (team === "team") return quickLinks.filter((l) => globalLinks.includes(l.name));
  return quickLinks
    .filter((l) => l.teams.includes(team))
    .sort((a, b) => a.name.localeCompare(b.name));
}
