import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      defaultPage: true,
      members: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  return NextResponse.json(groups);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, defaultPageId } = await req.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (defaultPageId) {
    const page = await prisma.page.findUnique({ where: { id: defaultPageId } });
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
  }

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      defaultPageId: defaultPageId || null,
    },
    include: { defaultPage: true, members: true },
  });

  return NextResponse.json(group, { status: 201 });
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, action } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  switch (action) {
    case "update": {
      const data: Record<string, unknown> = {};
      if (body.name !== undefined) data.name = body.name.trim();
      if (body.defaultPageId !== undefined) data.defaultPageId = body.defaultPageId || null;

      const updated = await prisma.group.update({
        where: { id },
        data,
        include: { defaultPage: true, members: true },
      });
      return NextResponse.json(updated);
    }

    case "addMembers": {
      const { userIds } = body;
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json({ error: "userIds[] is required" }, { status: 400 });
      }

      await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { groupId: id },
      });

      const updated = await prisma.group.findUnique({
        where: { id },
        include: {
          defaultPage: true,
          members: {
            orderBy: { name: "asc" },
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });
      return NextResponse.json(updated);
    }

    case "removeMember": {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { groupId: null },
      });

      const updated = await prisma.group.findUnique({
        where: { id },
        include: {
          defaultPage: true,
          members: {
            orderBy: { name: "asc" },
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });
      return NextResponse.json(updated);
    }

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
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

  await prisma.user.updateMany({
    where: { groupId: id },
    data: { groupId: null },
  });

  await prisma.group.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
