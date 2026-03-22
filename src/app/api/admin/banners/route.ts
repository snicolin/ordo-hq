import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const banners = await prisma.banner.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      group: { select: { id: true, name: true } },
      _count: { select: { dismissals: true } },
    },
  });

  return NextResponse.json(banners);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, body: bannerBody, color, icon, link, dismissible, expiresAt, targetType, groupId, active } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!expiresAt) {
    return NextResponse.json({ error: "expiresAt is required" }, { status: 400 });
  }
  if (targetType === "GROUP" && !groupId) {
    return NextResponse.json({ error: "groupId is required when targetType is GROUP" }, { status: 400 });
  }

  if (targetType === "GROUP" && groupId) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
  }

  const banner = await prisma.banner.create({
    data: {
      title: title.trim(),
      body: bannerBody?.trim() || null,
      color: color || "YELLOW",
      icon: icon || null,
      link: link?.trim() || null,
      dismissible: dismissible ?? true,
      expiresAt: new Date(expiresAt),
      targetType: targetType || "ALL",
      groupId: targetType === "GROUP" ? groupId : null,
      active: active ?? true,
    },
    include: {
      group: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(banner, { status: 201 });
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, title, body: bannerBody, color, icon, link, dismissible, expiresAt, targetType, groupId, active } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Banner not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title.trim();
  if (bannerBody !== undefined) data.body = bannerBody?.trim() || null;
  if (color !== undefined) data.color = color;
  if (icon !== undefined) data.icon = icon || null;
  if (link !== undefined) data.link = link?.trim() || null;
  if (dismissible !== undefined) data.dismissible = dismissible;
  if (expiresAt !== undefined) data.expiresAt = new Date(expiresAt);
  if (targetType !== undefined) {
    data.targetType = targetType;
    if (targetType === "GROUP" && groupId) {
      data.groupId = groupId;
    } else if (targetType === "ALL") {
      data.groupId = null;
    }
  }
  if (groupId !== undefined && targetType === undefined) {
    data.groupId = groupId;
  }
  if (active !== undefined) data.active = active;

  const [, updated] = await prisma.$transaction([
    prisma.bannerDismissal.deleteMany({ where: { bannerId: id } }),
    prisma.banner.update({
      where: { id },
      data,
      include: {
        group: { select: { id: true, name: true } },
        _count: { select: { dismissals: true } },
      },
    }),
  ]);

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.banner.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
