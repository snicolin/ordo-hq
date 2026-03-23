import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return "••••••••" + key.slice(-4);
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [apiKeySetting, promptSetting, agentPromptSetting, modelSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "anthropic_api_key" } }),
    prisma.setting.findUnique({ where: { key: "ai_system_prompt" } }),
    prisma.setting.findUnique({ where: { key: "agent_system_prompt" } }),
    prisma.setting.findUnique({ where: { key: "ai_model" } }),
  ]);

  const envKey = process.env.ANTHROPIC_API_KEY;

  return NextResponse.json({
    hasApiKey: !!apiKeySetting?.value || !!envKey,
    maskedApiKey: apiKeySetting?.value ? maskKey(apiKeySetting.value) : null,
    envKeySet: !!envKey,
    maskedEnvKey: envKey ? maskKey(envKey) : null,
    source: apiKeySetting?.value ? "database" : envKey ? "environment" : null,
    systemPrompt: promptSetting?.value || null,
    agentSystemPrompt: agentPromptSetting?.value || null,
    model: modelSetting?.value || null,
  });
}

export async function PUT(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { apiKey, systemPrompt, agentSystemPrompt, model } = body as {
    apiKey?: string;
    systemPrompt?: string | null;
    agentSystemPrompt?: string | null;
    model?: string;
  };

  const updates: Promise<unknown>[] = [];

  if (apiKey !== undefined) {
    updates.push(
      prisma.setting.upsert({
        where: { key: "anthropic_api_key" },
        update: { value: apiKey },
        create: { key: "anthropic_api_key", value: apiKey },
      }),
    );
  }

  if (systemPrompt !== undefined) {
    if (systemPrompt === null || systemPrompt === "") {
      updates.push(
        prisma.setting.deleteMany({ where: { key: "ai_system_prompt" } }),
      );
    } else {
      updates.push(
        prisma.setting.upsert({
          where: { key: "ai_system_prompt" },
          update: { value: systemPrompt },
          create: { key: "ai_system_prompt", value: systemPrompt },
        }),
      );
    }
  }

  if (agentSystemPrompt !== undefined) {
    if (agentSystemPrompt === null || agentSystemPrompt === "") {
      updates.push(
        prisma.setting.deleteMany({ where: { key: "agent_system_prompt" } }),
      );
    } else {
      updates.push(
        prisma.setting.upsert({
          where: { key: "agent_system_prompt" },
          update: { value: agentSystemPrompt },
          create: { key: "agent_system_prompt", value: agentSystemPrompt },
        }),
      );
    }
  }

  if (model !== undefined) {
    updates.push(
      prisma.setting.upsert({
        where: { key: "ai_model" },
        update: { value: model },
        create: { key: "ai_model", value: model },
      }),
    );
  }

  await Promise.all(updates);

  return NextResponse.json({ ok: true });
}
