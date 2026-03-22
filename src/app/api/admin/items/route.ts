import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

function normalizeHref(href: string): string {
  if (/^(https?:\/\/|mailto:|tel:|\/)/.test(href)) return href;
  return `https://${href}`;
}

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get("sectionId");
  const pageId = searchParams.get("pageId");

  const where: Record<string, unknown> = {};
  if (sectionId) where.sectionId = sectionId;
  if (pageId) where.pages = { some: { pageId } };

  const items = await prisma.item.findMany({
    where,
    include: { pages: true, section: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { sectionId, name, href, description, image, value, apiUrl, apiField, disabled, pageIds } = body;

  if (!sectionId || !name) {
    return NextResponse.json({ error: "sectionId and name are required" }, { status: 400 });
  }

  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  const isMetric = section.displayType === "METRIC";

  if (!isMetric && !href) {
    return NextResponse.json({ error: "href is required" }, { status: 400 });
  }

  if (section.displayType === "TILE" && (!image || !description)) {
    return NextResponse.json({ error: "TILE items require image and description" }, { status: 400 });
  }

  const maxOrder = await prisma.item.aggregate({
    where: { sectionId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const item = await prisma.item.create({
    data: {
      sectionId,
      name,
      href: href ? normalizeHref(href) : "",
      description: description ?? null,
      image: image ?? null,
      value: value ?? null,
      apiUrl: apiUrl ?? null,
      apiField: apiField ?? null,
      disabled: disabled ?? false,
      order: nextOrder,
      ...(pageIds && {
        pages: {
          create: (pageIds as string[]).map((pid) => ({ pageId: pid })),
        },
      }),
    },
    include: { pages: true },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, name, href, description, image, value, apiUrl, apiField, disabled } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const existing = await prisma.item.findUnique({
    where: { id },
    include: { section: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (existing.section.displayType === "TILE") {
    const finalImage = image !== undefined ? image : existing.image;
    const finalDesc = description !== undefined ? description : existing.description;
    if (!finalImage || !finalDesc) {
      return NextResponse.json({ error: "TILE items require image and description" }, { status: 400 });
    }
  }

  const updated = await prisma.item.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(href !== undefined && { href: href ? normalizeHref(href) : "" }),
      ...(description !== undefined && { description }),
      ...(image !== undefined && { image }),
      ...(value !== undefined && { value: value || null }),
      ...(apiUrl !== undefined && { apiUrl: apiUrl || null }),
      ...(apiField !== undefined && { apiField: apiField || null }),
      ...(disabled !== undefined && { disabled }),
    },
    include: { pages: true, section: true },
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

  await prisma.item.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
