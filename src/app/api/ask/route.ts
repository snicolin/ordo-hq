import { NextRequest } from "next/server";
import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { buildPortalContext, applyPromptTemplate } from "@/lib/portal-context";
import { DEFAULT_MODEL } from "@/lib/ai-models";

const DEFAULT_PROMPT = `You are a helpful assistant for Ordo HQ, an internal team portal.
You answer questions about the portal's pages, sections, items, users, groups, and alerts using the data provided below.

## Portal Pages & Content

{{pagesSummary}}

## Users

{{usersSummary}}

## Groups

{{groupsSummary}}

## Active Alerts

{{alertsSummary}}

When answering:
- Use exact data from the context provided — don't guess or make up information
- If data is missing or you can't answer from context, say so clearly
- Keep answers concise and direct — the user is in a quick-search context
- Format lists and data clearly`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const [apiKeySetting, promptSetting, modelSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "anthropic_api_key" } }),
      prisma.setting.findUnique({ where: { key: "ai_system_prompt" } }),
      prisma.setting.findUnique({ where: { key: "ai_model" } }),
    ]);

    const apiKey = apiKeySetting?.value || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Anthropic API key not configured. Set ANTHROPIC_API_KEY in environment or configure in Admin > AI." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = await request.json();
    const { messages }: { messages?: UIMessage[] } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const context = await buildPortalContext();
    const promptTemplate = promptSetting?.value || DEFAULT_PROMPT;
    const systemPrompt = applyPromptTemplate(promptTemplate, context);

    const anthropic = createAnthropic({ apiKey });
    const modelId = modelSetting?.value || DEFAULT_MODEL;

    const result = streamText({
      model: anthropic(modelId),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in ask chat:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to process question",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
