import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { auth } from "@/auth";
import { isEnvAdmin } from "@/lib/admin";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      group: { select: { id: true, name: true } },
    },
  });

  const enriched = users.map((u) => ({
    ...u,
    isEnvAdmin: isEnvAdmin(u.email),
  }));

  return NextResponse.json(enriched);
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  const body = await req.json();
  const { action } = body;

  switch (action) {
    case "toggleAdmin": {
      const { userId, isAdmin: newAdminStatus } = body;
      if (!userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
      }

      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (!target) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (target.email === session?.user?.email && !newAdminStatus) {
        return NextResponse.json({ error: "Cannot remove your own admin status" }, { status: 400 });
      }

      if (isEnvAdmin(target.email)) {
        return NextResponse.json({ error: "Cannot modify env-based admin status" }, { status: 400 });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { isAdmin: newAdminStatus },
      });

      return NextResponse.json(updated);
    }

    case "setGroup": {
      const { userId, groupId } = body;
      if (!userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
      }

      if (groupId) {
        const group = await prisma.group.findUnique({ where: { id: groupId } });
        if (!group) {
          return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { groupId: groupId || null },
      });

      return NextResponse.json(updated);
    }

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
