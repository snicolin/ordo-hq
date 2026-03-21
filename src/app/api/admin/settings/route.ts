import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }

  map.homepage_mode ??= "global";
  map.nav_visible ??= "true";
  map.nav_position ??= "top";

  return NextResponse.json(map);
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { key, value } = body;

  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }
  if (value === undefined || typeof value !== "string") {
    return NextResponse.json({ error: "value is required" }, { status: 400 });
  }

  const ALLOWED_KEYS = ["homepage_mode", "nav_visible", "nav_position"];
  if (!ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: "Invalid setting key" }, { status: 400 });
  }

  const VALIDATION: Record<string, string[]> = {
    homepage_mode: ["global", "groups"],
    nav_visible: ["true", "false"],
    nav_position: ["top", "bottom"],
  };
  if (VALIDATION[key] && !VALIDATION[key].includes(value)) {
    return NextResponse.json({ error: `${key} must be one of: ${VALIDATION[key].join(", ")}` }, { status: 400 });
  }

  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  return NextResponse.json({ success: true });
}
