import { tool } from "ai";
import { z } from "zod/v3";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isEnvAdmin } from "@/lib/admin";
import { DisplayType } from "@/generated/prisma/enums";

const RESERVED_SLUGS = ["admin", "signin", "api", "_next", "images"];
const ALLOWED_DOMAINS = ["ordoschools.com", "ordo.com"];
const DISPLAY_TYPES = Object.values(DisplayType) as string[];

function normalizeHref(href: string): string {
  if (/^(https?:\/\/|mailto:|tel:|\/)/.test(href)) return href;
  return `https://${href}`;
}

// ---------------------------------------------------------------------------
// Read tools — auto-execute on the server, no confirmation needed
// ---------------------------------------------------------------------------

const readTools = {
  list_pages: tool({
    description: "List all portal pages with their sections and item counts",
    inputSchema: z.object({}),
    execute: async () => {
      const pages = await prisma.page.findMany({
        orderBy: { order: "asc" },
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: { section: { include: { _count: { select: { items: true } } } } },
          },
        },
      });
      return pages.map((p) => ({
        id: p.id,
        label: p.label,
        slug: p.slug,
        order: p.order,
        isHome: p.isHome,
        sections: p.sections.map((ps) => ({
          id: ps.section.id,
          title: ps.section.title,
          displayType: ps.section.displayType,
          itemCount: ps.section._count.items,
        })),
      }));
    },
  }),

  get_page: tool({
    description: "Get a specific page by slug with full sections and items",
    inputSchema: z.object({
      slug: z.string().describe("The page URL slug"),
    }),
    execute: async ({ slug }) => {
      const page = await prisma.page.findUnique({
        where: { slug },
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: {
              section: {
                include: { items: { orderBy: { order: "asc" } } },
              },
            },
          },
        },
      });
      if (!page) return { error: "Page not found" };
      return {
        id: page.id,
        label: page.label,
        slug: page.slug,
        order: page.order,
        isHome: page.isHome,
        sections: page.sections.map((ps) => ({
          id: ps.section.id,
          title: ps.section.title,
          displayType: ps.section.displayType,
          content: ps.section.content,
          items: ps.section.items.map((i) => ({
            id: i.id, name: i.name, href: i.href,
            description: i.description, image: i.image,
            value: i.value, apiUrl: i.apiUrl, apiField: i.apiField,
            disabled: i.disabled,
          })),
        })),
      };
    },
  }),

  list_users: tool({
    description: "List all portal users with their group assignments",
    inputSchema: z.object({}),
    execute: async () => {
      const users = await prisma.user.findMany({
        orderBy: { name: "asc" },
        include: { group: { select: { id: true, name: true } } },
      });
      return users.map((u) => ({
        id: u.id, name: u.name, email: u.email,
        isAdmin: u.isAdmin, group: u.group,
      }));
    },
  }),

  list_groups: tool({
    description: "List all user groups with member counts",
    inputSchema: z.object({}),
    execute: async () => {
      const groups = await prisma.group.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          _count: { select: { members: true } },
          defaultPage: { select: { id: true, label: true } },
          members: { orderBy: { name: "asc" }, select: { id: true, name: true, email: true } },
        },
      });
      return groups.map((g) => ({
        id: g.id, name: g.name,
        memberCount: g._count.members,
        defaultPage: g.defaultPage,
        members: g.members,
      }));
    },
  }),

  list_alerts: tool({
    description: "List all alerts (banners), both active and inactive",
    inputSchema: z.object({}),
    execute: async () => {
      const alerts = await prisma.alert.findMany({
        orderBy: { createdAt: "desc" },
        include: { group: { select: { id: true, name: true } } },
      });
      return alerts.map((a) => ({
        id: a.id, title: a.title, body: a.body,
        color: a.color, active: a.active, dismissible: a.dismissible,
        targetType: a.targetType, group: a.group,
        expiresAt: a.expiresAt.toISOString().slice(0, 10),
      }));
    },
  }),

  get_settings: tool({
    description: "Get portal settings (homepage mode, nav visibility, nav position)",
    inputSchema: z.object({}),
    execute: async () => {
      const settings = await prisma.setting.findMany();
      const map: Record<string, string> = {};
      for (const s of settings) {
        if (["homepage_mode", "nav_visible", "nav_position"].includes(s.key)) {
          map[s.key] = s.value;
        }
      }
      map.homepage_mode ??= "global";
      map.nav_visible ??= "true";
      map.nav_position ??= "top";
      return map;
    },
  }),
};

// ---------------------------------------------------------------------------
// Write tools — NO execute, proposed to client for confirmation
// ---------------------------------------------------------------------------

const writeTools = {
  // -- Pages ----------------------------------------------------------------

  create_page: tool({
    description: "Create a new portal page",
    inputSchema: z.object({
      label: z.string().describe("Display name for the page"),
      slug: z.string().describe("URL slug (lowercase, hyphens, no spaces)"),
      isHome: z.boolean().optional().describe("Set as the home page (clears previous home)"),
    }),
  }),

  update_page: tool({
    description: "Update an existing page's label, slug, or home status",
    inputSchema: z.object({
      id: z.string().describe("Page ID"),
      label: z.string().optional().describe("New display name"),
      slug: z.string().optional().describe("New URL slug"),
      isHome: z.boolean().optional().describe("Set as the home page (clears previous home)"),
    }),
  }),

  delete_page: tool({
    description: "Delete a portal page (cannot delete the home page)",
    inputSchema: z.object({
      id: z.string().describe("Page ID to delete"),
    }),
  }),

  // -- Sections -------------------------------------------------------------

  create_section: tool({
    description: "Create a new section on a page. Display types: BUTTON, LINK, TILE, METRIC, TEXT, COUNTDOWN",
    inputSchema: z.object({
      pageId: z.string().describe("ID of the page to add the section to"),
      title: z.string().describe("Section title"),
      displayType: z.enum(["BUTTON", "LINK", "TILE", "METRIC", "TEXT", "COUNTDOWN"]).describe("How items in this section are displayed"),
      content: z.string().optional().describe("Rich text content (for TEXT sections)"),
      hideTitle: z.boolean().optional().describe("Hide the section title"),
      collapsible: z.boolean().optional().describe("Make the section collapsible"),
      targetDate: z.string().optional().describe("Target date for COUNTDOWN sections (ISO string)"),
    }),
  }),

  update_section: tool({
    description: "Update an existing section's properties",
    inputSchema: z.object({
      id: z.string().describe("Section ID"),
      title: z.string().optional().describe("New title"),
      displayType: z.enum(["BUTTON", "LINK", "TILE", "METRIC", "TEXT", "COUNTDOWN"]).optional(),
      content: z.string().optional().describe("New rich text content"),
      hideTitle: z.boolean().optional().describe("Hide or show the section title"),
      collapsible: z.boolean().optional().describe("Make section collapsible or not"),
      targetDate: z.string().optional().describe("Target date for COUNTDOWN sections (ISO string, or empty to clear)"),
    }),
  }),

  delete_section: tool({
    description: "Delete a section and all its items",
    inputSchema: z.object({
      id: z.string().describe("Section ID to delete"),
    }),
  }),

  // -- Items ----------------------------------------------------------------

  create_item: tool({
    description: "Create an item in a section. TILE items need image+description. METRIC items don't need href.",
    inputSchema: z.object({
      sectionId: z.string().describe("ID of the section to add the item to"),
      name: z.string().describe("Item display name"),
      href: z.string().optional().describe("Link URL (required unless METRIC section)"),
      description: z.string().optional().describe("Item description"),
      image: z.string().optional().describe("Image URL (required for TILE sections)"),
      value: z.string().optional().describe("Metric value (for METRIC sections)"),
      apiUrl: z.string().optional().describe("External API URL to fetch metric value from"),
      apiField: z.string().optional().describe("JSON field path to extract from API response"),
      disabled: z.boolean().optional().describe("Create in disabled state"),
      pageIds: z.array(z.string()).optional().describe("Page IDs to link this item to (for cross-page items)"),
    }),
  }),

  update_item: tool({
    description: "Update an existing item's properties",
    inputSchema: z.object({
      id: z.string().describe("Item ID"),
      name: z.string().optional().describe("New display name"),
      href: z.string().optional().describe("New link URL"),
      description: z.string().optional().describe("New description"),
      image: z.string().optional().describe("New image URL"),
      value: z.string().optional().describe("New metric value"),
      apiUrl: z.string().optional().describe("New API URL for metric fetching"),
      apiField: z.string().optional().describe("New JSON field path for API response"),
      disabled: z.boolean().optional().describe("Disable/enable the item"),
    }),
  }),

  delete_item: tool({
    description: "Delete an item from a section",
    inputSchema: z.object({
      id: z.string().describe("Item ID to delete"),
    }),
  }),

  // -- Alerts ---------------------------------------------------------------

  create_alert: tool({
    description: "Create a banner alert. Colors: YELLOW, RED, BLUE, GREEN. Target: ALL or GROUP (requires groupId)",
    inputSchema: z.object({
      title: z.string().describe("Alert title"),
      body: z.string().optional().describe("Alert body text"),
      color: z.enum(["YELLOW", "RED", "BLUE", "GREEN"]).optional().describe("Banner color"),
      expiresAt: z.string().describe("Expiration date (ISO string, e.g. 2025-12-31)"),
      dismissible: z.boolean().optional().describe("Whether users can dismiss the alert"),
      icon: z.string().optional().describe("Icon name for the alert"),
      link: z.string().optional().describe("URL link attached to the alert"),
      targetType: z.enum(["ALL", "GROUP"]).optional().describe("Target audience: ALL users or a specific GROUP"),
      groupId: z.string().optional().describe("Group ID (required when targetType is GROUP)"),
    }),
  }),

  update_alert: tool({
    description: "Update an existing alert's properties. Clears all dismissals when updated.",
    inputSchema: z.object({
      id: z.string().describe("Alert ID"),
      title: z.string().optional().describe("New title"),
      body: z.string().optional().describe("New body text"),
      color: z.enum(["YELLOW", "RED", "BLUE", "GREEN"]).optional().describe("New color"),
      expiresAt: z.string().optional().describe("New expiration date (ISO string)"),
      dismissible: z.boolean().optional().describe("Whether users can dismiss"),
      icon: z.string().optional().describe("New icon name"),
      link: z.string().optional().describe("New link URL"),
      targetType: z.enum(["ALL", "GROUP"]).optional().describe("New target audience"),
      groupId: z.string().optional().describe("New group ID (for GROUP targeting)"),
      active: z.boolean().optional().describe("Activate or deactivate the alert"),
    }),
  }),

  delete_alert: tool({
    description: "Delete an alert",
    inputSchema: z.object({
      id: z.string().describe("Alert ID to delete"),
    }),
  }),

  // -- Users ----------------------------------------------------------------

  create_user: tool({
    description: "Provision a new user. Email must be @ordoschools.com or @ordo.com",
    inputSchema: z.object({
      email: z.string().describe("User email address"),
      name: z.string().optional().describe("User's display name"),
    }),
  }),

  update_user: tool({
    description: "Update a user: toggle admin status or assign/unassign group. Cannot demote env-based admins.",
    inputSchema: z.object({
      userId: z.string().describe("User ID"),
      isAdmin: z.boolean().optional().describe("Set admin status (cannot change env-based admins)"),
      groupId: z.string().optional().describe("Group ID to assign (omit or null to unassign)"),
    }),
  }),

  // -- Groups ---------------------------------------------------------------

  create_group: tool({
    description: "Create a new user group",
    inputSchema: z.object({
      name: z.string().describe("Group name"),
      defaultPageId: z.string().optional().describe("Default landing page ID for this group"),
    }),
  }),

  update_group: tool({
    description: "Update a group's name or default page",
    inputSchema: z.object({
      id: z.string().describe("Group ID"),
      name: z.string().optional().describe("New group name"),
      defaultPageId: z.string().optional().describe("New default page ID (empty string to clear)"),
    }),
  }),

  delete_group: tool({
    description: "Delete a group (unassigns all members first)",
    inputSchema: z.object({
      id: z.string().describe("Group ID to delete"),
    }),
  }),

  add_group_members: tool({
    description: "Add users to a group",
    inputSchema: z.object({
      groupId: z.string().describe("Group ID"),
      userIds: z.array(z.string()).describe("Array of user IDs to add"),
    }),
  }),

  remove_group_member: tool({
    description: "Remove a user from a group",
    inputSchema: z.object({
      groupId: z.string().describe("Group ID"),
      userId: z.string().describe("User ID to remove"),
    }),
  }),

  // -- Reorder --------------------------------------------------------------

  reorder: tool({
    description: "Reorder pages, sections on a page, or items in a section",
    inputSchema: z.object({
      type: z.enum(["page", "pageSection", "item"]).describe("What to reorder"),
      items: z.array(z.record(z.unknown())).describe(
        "Array of objects: {id, order} for page/item, or {pageId, sectionId, order} for pageSection"
      ),
    }),
  }),

  // -- Settings -------------------------------------------------------------

  update_settings: tool({
    description: "Update a portal setting. Keys: homepage_mode (global|groups), nav_visible (true|false), nav_position (top|bottom)",
    inputSchema: z.object({
      key: z.enum(["homepage_mode", "nav_visible", "nav_position"]).describe("Setting key"),
      value: z.string().describe("New value"),
    }),
  }),
};

// ---------------------------------------------------------------------------
// Write tool executors — called from /api/agent/execute
// ---------------------------------------------------------------------------

export const writeToolExecutors: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  // -- Pages ----------------------------------------------------------------

  create_page: async (args) => {
    const { label, slug, isHome } = args as { label: string; slug: string; isHome?: boolean };
    const normalizedSlug = slug.toLowerCase();
    if (RESERVED_SLUGS.includes(normalizedSlug)) {
      return { error: `Slug "${slug}" is reserved` };
    }
    const maxOrder = await prisma.page.aggregate({ _max: { order: true } });
    if (isHome) {
      await prisma.page.updateMany({ where: { isHome: true }, data: { isHome: false } });
    }
    const page = await prisma.page.create({
      data: { label, slug: normalizedSlug, order: (maxOrder._max.order ?? -1) + 1, isHome: isHome ?? false },
    });
    return { success: true, page: { id: page.id, label: page.label, slug: page.slug, isHome: page.isHome } };
  },

  update_page: async (args) => {
    const { id, label, slug, isHome } = args as { id: string; label?: string; slug?: string; isHome?: boolean };
    if (slug && RESERVED_SLUGS.includes(slug.toLowerCase())) {
      return { error: `Slug "${slug}" is reserved` };
    }
    if (isHome) {
      await prisma.page.updateMany({ where: { isHome: true }, data: { isHome: false } });
    }
    const page = await prisma.page.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(slug !== undefined && { slug: slug.toLowerCase() }),
        ...(isHome !== undefined && { isHome }),
      },
    });
    return { success: true, page: { id: page.id, label: page.label, slug: page.slug, isHome: page.isHome } };
  },

  delete_page: async (args) => {
    const { id } = args as { id: string };
    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) return { error: "Page not found" };
    if (page.isHome) return { error: "Cannot delete the home page" };
    await prisma.page.delete({ where: { id } });
    return { success: true, deleted: { id: page.id, label: page.label } };
  },

  // -- Sections -------------------------------------------------------------

  create_section: async (args) => {
    const { pageId, title, displayType, content, hideTitle, collapsible, targetDate } = args as {
      pageId: string; title: string; displayType: string;
      content?: string; hideTitle?: boolean; collapsible?: boolean; targetDate?: string;
    };
    if (!DISPLAY_TYPES.includes(displayType)) {
      return { error: `Invalid displayType. Must be one of: ${DISPLAY_TYPES.join(", ")}` };
    }
    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) return { error: "Page not found" };
    const maxOrder = await prisma.pageSection.aggregate({ where: { pageId }, _max: { order: true } });
    const section = await prisma.section.create({
      data: {
        title,
        displayType: displayType as DisplayType,
        hideTitle: !!hideTitle,
        collapsible: !!collapsible,
        content: content ?? null,
        targetDate: targetDate ? new Date(targetDate) : null,
        pages: { create: { pageId, order: (maxOrder._max.order ?? -1) + 1 } },
      },
    });
    return { success: true, section: { id: section.id, title: section.title, displayType: section.displayType }, page: { label: page.label } };
  },

  update_section: async (args) => {
    const { id, title, displayType, content, hideTitle, collapsible, targetDate } = args as {
      id: string; title?: string; displayType?: string; content?: string;
      hideTitle?: boolean; collapsible?: boolean; targetDate?: string;
    };
    if (displayType && !DISPLAY_TYPES.includes(displayType)) {
      return { error: `Invalid displayType. Must be one of: ${DISPLAY_TYPES.join(", ")}` };
    }
    const section = await prisma.section.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(displayType !== undefined && { displayType: displayType as DisplayType }),
        ...(content !== undefined && { content: content || null }),
        ...(hideTitle !== undefined && { hideTitle }),
        ...(collapsible !== undefined && { collapsible }),
        ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
      },
    });
    return { success: true, section: { id: section.id, title: section.title } };
  },

  delete_section: async (args) => {
    const { id } = args as { id: string };
    const section = await prisma.section.findUnique({ where: { id } });
    if (!section) return { error: "Section not found" };
    await prisma.section.delete({ where: { id } });
    return { success: true, deleted: { id: section.id, title: section.title } };
  },

  // -- Items ----------------------------------------------------------------

  create_item: async (args) => {
    const { sectionId, name, href, description, image, value, apiUrl, apiField, disabled, pageIds } = args as {
      sectionId: string; name: string; href?: string;
      description?: string; image?: string; value?: string;
      apiUrl?: string; apiField?: string; disabled?: boolean; pageIds?: string[];
    };
    const section = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) return { error: "Section not found" };
    if (section.displayType !== "METRIC" && !href) {
      return { error: "href is required for non-METRIC sections" };
    }
    if (section.displayType === "TILE" && (!image || !description)) {
      return { error: "TILE items require both image and description" };
    }
    let resolvedPageIds = pageIds;
    if (!resolvedPageIds?.length) {
      const pageSections = await prisma.pageSection.findMany({
        where: { sectionId },
        select: { pageId: true },
      });
      resolvedPageIds = pageSections.map((ps) => ps.pageId);
    }
    const maxOrder = await prisma.item.aggregate({ where: { sectionId }, _max: { order: true } });
    const item = await prisma.item.create({
      data: {
        sectionId, name,
        href: href ? normalizeHref(href) : "",
        description: description ?? null,
        image: image ?? null,
        value: value ?? null,
        apiUrl: apiUrl ?? null,
        apiField: apiField ?? null,
        disabled: disabled ?? false,
        order: (maxOrder._max.order ?? -1) + 1,
        ...(resolvedPageIds.length && {
          pages: { create: resolvedPageIds.map((pageId) => ({ pageId })) },
        }),
      },
    });
    return { success: true, item: { id: item.id, name: item.name, href: item.href } };
  },

  update_item: async (args) => {
    const { id, name, href, description, image, value, apiUrl, apiField, disabled } = args as {
      id: string; name?: string; href?: string; description?: string;
      image?: string; value?: string; apiUrl?: string; apiField?: string; disabled?: boolean;
    };
    const existing = await prisma.item.findUnique({ where: { id }, include: { section: true } });
    if (!existing) return { error: "Item not found" };
    if (existing.section.displayType === "TILE") {
      const finalImage = image !== undefined ? image : existing.image;
      const finalDesc = description !== undefined ? description : existing.description;
      if (!finalImage || !finalDesc) {
        return { error: "TILE items require both image and description" };
      }
    }
    const item = await prisma.item.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(href !== undefined && { href: href ? normalizeHref(href) : "" }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image: image || null }),
        ...(value !== undefined && { value: value || null }),
        ...(apiUrl !== undefined && { apiUrl: apiUrl || null }),
        ...(apiField !== undefined && { apiField: apiField || null }),
        ...(disabled !== undefined && { disabled }),
      },
    });
    return { success: true, item: { id: item.id, name: item.name } };
  },

  delete_item: async (args) => {
    const { id } = args as { id: string };
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) return { error: "Item not found" };
    await prisma.item.delete({ where: { id } });
    return { success: true, deleted: { id: item.id, name: item.name } };
  },

  // -- Alerts ---------------------------------------------------------------

  create_alert: async (args) => {
    const { title, body, color, expiresAt, dismissible, icon, link, targetType, groupId } = args as {
      title: string; body?: string; color?: string; expiresAt: string;
      dismissible?: boolean; icon?: string; link?: string;
      targetType?: string; groupId?: string;
    };
    if (targetType === "GROUP" && !groupId) {
      return { error: "groupId is required when targetType is GROUP" };
    }
    if (targetType === "GROUP" && groupId) {
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) return { error: "Group not found" };
    }
    const alert = await prisma.alert.create({
      data: {
        title: title.trim(),
        body: body?.trim() || null,
        color: color || "YELLOW",
        icon: icon || null,
        link: link?.trim() || null,
        dismissible: dismissible ?? true,
        expiresAt: new Date(expiresAt),
        targetType: targetType || "ALL",
        groupId: targetType === "GROUP" ? groupId! : null,
        active: true,
      },
    });
    return { success: true, alert: { id: alert.id, title: alert.title, color: alert.color } };
  },

  update_alert: async (args) => {
    const { id, title, body, color, expiresAt, dismissible, icon, link, targetType, groupId, active } = args as {
      id: string; title?: string; body?: string; color?: string; expiresAt?: string;
      dismissible?: boolean; icon?: string; link?: string;
      targetType?: string; groupId?: string; active?: boolean;
    };
    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) return { error: "Alert not found" };

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (body !== undefined) data.body = body?.trim() || null;
    if (color !== undefined) data.color = color;
    if (icon !== undefined) data.icon = icon || null;
    if (link !== undefined) data.link = link?.trim() || null;
    if (dismissible !== undefined) data.dismissible = dismissible;
    if (expiresAt !== undefined) data.expiresAt = new Date(expiresAt);
    if (targetType !== undefined) {
      data.targetType = targetType;
      if (targetType === "GROUP" && groupId) data.groupId = groupId;
      else if (targetType === "ALL") data.groupId = null;
    }
    if (groupId !== undefined && targetType === undefined) data.groupId = groupId;
    if (active !== undefined) data.active = active;

    const [, updated] = await prisma.$transaction([
      prisma.alertDismissal.deleteMany({ where: { alertId: id } }),
      prisma.alert.update({ where: { id }, data }),
    ]);
    return { success: true, alert: { id: updated.id, title: updated.title, active: updated.active } };
  },

  delete_alert: async (args) => {
    const { id } = args as { id: string };
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) return { error: "Alert not found" };
    await prisma.alert.delete({ where: { id } });
    return { success: true, deleted: { id: alert.id, title: alert.title } };
  },

  // -- Users ----------------------------------------------------------------

  create_user: async (args) => {
    const { email, name } = args as { email: string; name?: string };
    const normalized = email.trim().toLowerCase();
    const domain = normalized.split("@")[1];
    if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
      return { error: "Email must be @ordoschools.com or @ordo.com" };
    }
    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (existing) return { error: "User already exists" };
    const user = await prisma.user.create({
      data: { email: normalized, name: name?.trim() || null },
    });
    return { success: true, user: { id: user.id, email: user.email, name: user.name } };
  },

  update_user: async (args) => {
    const { userId, isAdmin: newAdminStatus, groupId } = args as {
      userId: string; isAdmin?: boolean; groupId?: string;
    };
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { error: "User not found" };

    if (newAdminStatus !== undefined) {
      if (isEnvAdmin(user.email)) {
        return { error: "Cannot modify env-based admin status" };
      }
      const session = await auth();
      if (user.email === session?.user?.email && !newAdminStatus) {
        return { error: "Cannot remove your own admin status" };
      }
    }

    const data: Record<string, unknown> = {};
    if (newAdminStatus !== undefined) data.isAdmin = newAdminStatus;
    if (groupId !== undefined) {
      if (groupId) {
        const group = await prisma.group.findUnique({ where: { id: groupId } });
        if (!group) return { error: "Group not found" };
      }
      data.groupId = groupId || null;
    }

    const updated = await prisma.user.update({ where: { id: userId }, data });
    return { success: true, user: { id: updated.id, email: updated.email, isAdmin: updated.isAdmin, groupId: updated.groupId } };
  },

  // -- Groups ---------------------------------------------------------------

  create_group: async (args) => {
    const { name, defaultPageId } = args as { name: string; defaultPageId?: string };
    if (defaultPageId) {
      const page = await prisma.page.findUnique({ where: { id: defaultPageId } });
      if (!page) return { error: "Page not found" };
    }
    const group = await prisma.group.create({
      data: { name: name.trim(), defaultPageId: defaultPageId || null },
    });
    return { success: true, group: { id: group.id, name: group.name, defaultPageId: group.defaultPageId } };
  },

  update_group: async (args) => {
    const { id, name, defaultPageId } = args as { id: string; name?: string; defaultPageId?: string };
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) return { error: "Group not found" };

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (defaultPageId !== undefined) data.defaultPageId = defaultPageId || null;

    const updated = await prisma.group.update({ where: { id }, data });
    return { success: true, group: { id: updated.id, name: updated.name, defaultPageId: updated.defaultPageId } };
  },

  delete_group: async (args) => {
    const { id } = args as { id: string };
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) return { error: "Group not found" };
    await prisma.user.updateMany({ where: { groupId: id }, data: { groupId: null } });
    await prisma.group.delete({ where: { id } });
    return { success: true, deleted: { id: group.id, name: group.name } };
  },

  add_group_members: async (args) => {
    const { groupId, userIds } = args as { groupId: string; userIds: string[] };
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return { error: "Group not found" };
    if (!userIds?.length) return { error: "userIds[] is required" };
    await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { groupId } });
    const updated = await prisma.group.findUnique({
      where: { id: groupId },
      include: { _count: { select: { members: true } } },
    });
    return { success: true, group: { id: group.name, memberCount: updated?._count.members } };
  },

  remove_group_member: async (args) => {
    const { groupId, userId } = args as { groupId: string; userId: string };
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return { error: "Group not found" };
    await prisma.user.update({ where: { id: userId }, data: { groupId: null } });
    return { success: true, removed: { userId, groupId } };
  },

  // -- Reorder --------------------------------------------------------------

  reorder: async (args) => {
    const { type, items } = args as { type: string; items: Record<string, unknown>[] };
    if (!items?.length) return { error: "items[] is required" };

    switch (type) {
      case "page": {
        await prisma.$transaction(
          items.map((item) =>
            prisma.page.update({ where: { id: item.id as string }, data: { order: item.order as number } })
          )
        );
        return { success: true, reordered: "pages", count: items.length };
      }
      case "pageSection": {
        await prisma.$transaction(
          items.map((item) =>
            prisma.pageSection.update({
              where: { pageId_sectionId: { pageId: item.pageId as string, sectionId: item.sectionId as string } },
              data: { order: item.order as number },
            })
          )
        );
        return { success: true, reordered: "pageSections", count: items.length };
      }
      case "item": {
        await prisma.$transaction(
          items.map((item) =>
            prisma.item.update({ where: { id: item.id as string }, data: { order: item.order as number } })
          )
        );
        return { success: true, reordered: "items", count: items.length };
      }
      default:
        return { error: "Invalid type. Use page, pageSection, or item" };
    }
  },

  // -- Settings -------------------------------------------------------------

  update_settings: async (args) => {
    const { key, value } = args as { key: string; value: string };
    const VALIDATION: Record<string, string[]> = {
      homepage_mode: ["global", "groups"],
      nav_visible: ["true", "false"],
      nav_position: ["top", "bottom"],
    };
    if (VALIDATION[key] && !VALIDATION[key].includes(value)) {
      return { error: `${key} must be one of: ${VALIDATION[key].join(", ")}` };
    }
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return { success: true, setting: { key, value } };
  },
};

// Combined tools map for streamText
export const agentTools = { ...readTools, ...writeTools };
