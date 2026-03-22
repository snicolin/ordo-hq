import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, groupId: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const now = new Date();

  const banners = await prisma.banner.findMany({
    where: {
      active: true,
      expiresAt: { gt: now },
      OR: [
        { targetType: "ALL" },
        ...(user.groupId ? [{ targetType: "GROUP", groupId: user.groupId }] : []),
      ],
      dismissals: {
        none: { userId: user.id },
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      color: true,
      icon: true,
      link: true,
      dismissible: true,
      expiresAt: true,
    },
  });

  return NextResponse.json(banners);
}
