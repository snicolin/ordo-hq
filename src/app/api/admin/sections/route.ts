import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { DisplayType } from "@/generated/prisma/enums";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sections = await prisma.section.findMany({
    include: {
      items: { orderBy: { order: "asc" } },
      pages: { include: { page: true }, orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json(sections);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, hideTitle, displayType, pageAssignments } = body;

  if (!title || !displayType) {
    return NextResponse.json({ error: "title and displayType are required" }, { status: 400 });
  }

  if (!Object.values(DisplayType).includes(displayType)) {
    return NextResponse.json({ error: "Invalid displayType" }, { status: 400 });
  }

  const section = await prisma.section.create({
    data: {
      title,
      hideTitle: !!hideTitle,
      displayType,
      ...(pageAssignments && {
        pages: {
          create: pageAssignments.map((pa: { pageId: string; order: number }) => ({
            pageId: pa.pageId,
            order: pa.order ?? 0,
          })),
        },
      }),
    },
    include: { pages: true },
  });

  return NextResponse.json(section, { status: 201 });
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, title, hideTitle, displayType, pageAssignments } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const section = await prisma.section.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(hideTitle !== undefined && { hideTitle: !!hideTitle }),
      ...(displayType !== undefined && { displayType }),
    },
  });

  if (pageAssignments) {
    await prisma.pageSection.deleteMany({ where: { sectionId: id } });
    await prisma.pageSection.createMany({
      data: pageAssignments.map((pa: { pageId: string; order: number }) => ({
        sectionId: id,
        pageId: pa.pageId,
        order: pa.order ?? 0,
      })),
    });
  }

  const updated = await prisma.section.findUnique({
    where: { id },
    include: { pages: true, items: { orderBy: { order: "asc" } } },
  });

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

  await prisma.section.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
