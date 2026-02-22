export type TeamSlug = "team" | "growth" | "ops" | "product";

export const tabs: { label: string; slug: TeamSlug; href: string }[] = [
  { label: "Team", slug: "team", href: "/" },
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
    href: "#",
  },
  {
    name: "Road Warrior",
    image: "/images/road-warrior.png",
    tags: ["growth", "ops"] as TeamSlug[],
    description: "Schedule and assign on-site customer visit routings.",
    href: "#",
  },
  {
    name: "Frogger Blogger",
    image: "/images/frogger-blogger.png",
    tags: ["growth"] as TeamSlug[],
    description: "Auto-generate and edit blog content.",
    href: "#",
  },
  {
    name: "Lead Hunter 64",
    image: "/images/lead-hunter.png",
    tags: ["growth"] as TeamSlug[],
    description: "Generate list-for-basic chief needs.",
    href: "#",
  },
];

export const quickLinks: { name: string; href: string; teams: TeamSlug[] }[] = [
  { name: "Asana", href: "#", teams: ["growth", "ops", "product"] },
  { name: "Backend", href: "#", teams: ["ops", "product"] },
  { name: "Claude", href: "#", teams: ["growth", "ops", "product"] },
  { name: "Cursor", href: "#", teams: ["product"] },
  { name: "Customer.io", href: "#", teams: ["ops"] },
  { name: "Drive", href: "#", teams: ["growth", "ops", "product"] },
  { name: "Figma", href: "#", teams: ["product"] },
  { name: "Front", href: "#", teams: ["growth", "ops"] },
  { name: "Gemini", href: "#", teams: ["ops", "product"] },
  { name: "GitHub", href: "#", teams: ["product"] },
  { name: "Hubspot", href: "#", teams: ["growth", "ops"] },
  { name: "Prismic", href: "#", teams: ["growth", "product"] },
  { name: "Quo", href: "#", teams: ["growth", "ops"] },
  { name: "Slack", href: "#", teams: ["growth", "ops", "product"] },
];

export const hrLinks = [
  {
    name: "Benefits and Payroll",
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
    name: "Company Goals (2026)",
    href: "https://app.asana.com/0/1200544764682426/overview",
    teams: ["team"],
  },
  {
    name: "Home",
    href: "https://www.notion.so/ordo/Sales-Team-793a166ddf68418189821ce9da1706e7",
    teams: ["growth"],
  },
  {
    name: "Ops Roadmap (2026)",
    href: "https://app.asana.com/1/1200544764677126/project/1210111733841363/list/1210112305945729",
    teams: ["ops"],
  },
];

export function getBookmarksForTeam(team: TeamSlug) {
  return bookmarks.filter((b) => b.teams.includes(team));
}

export function getToolsForTeam(team: TeamSlug) {
  if (team === "team") return tools;
  return tools.filter((t) => t.tags.includes(team));
}

export function getQuickLinksForTeam(team: TeamSlug) {
  if (team === "team") return quickLinks;
  return quickLinks
    .filter((l) => l.teams.includes(team))
    .sort((a, b) => a.name.localeCompare(b.name));
}
