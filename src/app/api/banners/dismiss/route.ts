import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { bannerId } = await req.json();
  if (!bannerId) {
    return NextResponse.json({ error: "bannerId is required" }, { status: 400 });
  }

  const banner = await prisma.banner.findUnique({ where: { id: bannerId } });
  if (!banner) {
    return NextResponse.json({ error: "Banner not found" }, { status: 404 });
  }
  if (!banner.dismissible) {
    return NextResponse.json({ error: "This banner cannot be dismissed" }, { status: 403 });
  }

  await prisma.bannerDismissal.upsert({
    where: {
      userId_bannerId: { userId: user.id, bannerId },
    },
    update: {},
    create: { userId: user.id, bannerId },
  });

  return NextResponse.json({ success: true });
}
