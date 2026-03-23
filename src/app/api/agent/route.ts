import { NextRequest } from "next/server";
import { streamText, stepCountIs, type UIMessage, convertToModelMessages } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { buildPortalContext, applyPromptTemplate } from "@/lib/portal-context";
import { agentTools } from "@/lib/agent-tools";
import { DEFAULT_MODEL } from "@/lib/ai-models";

const DEFAULT_AGENT_PROMPT = `You are an admin assistant for Ordo HQ, an internal team portal.
You can both answer questions AND take actions to manage the portal using your tools.

## Current Portal State

### Pages & Content
{{pagesSummary}}

### Users
{{usersSummary}}

### Groups
{{groupsSummary}}

### Active Alerts
{{alertsSummary}}

## Guidelines
- Create pages before adding sections to them
- Create sections before adding items to them
- Use lowercase hyphenated slugs for pages (e.g. "team-resources")
- Available display types: BUTTON, LINK, TILE, METRIC, TEXT, COUNTDOWN
- TILE sections require items with both an image URL and description
- METRIC sections don't require item hrefs — use the value field instead
- Alert colors: YELLOW, RED, BLUE, GREEN
- Users must have @ordoschools.com or @ordo.com email addresses
- Use read tools to check current state before making changes

## Behavior
- Today's date is ${new Date().toISOString().slice(0, 10)} — always use future dates for expirations
- Use your tools to accomplish what the user asks
- Always fill in all relevant fields — don't leave optional fields empty if you can infer reasonable values
- Propose specific actions — the user will confirm before they execute
- After actions are confirmed, summarize what was done
- If something fails, explain the error clearly
- Keep responses concise — the user is in a quick command context`;

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    const [apiKeySetting, promptSetting, modelSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "anthropic_api_key" } }),
      prisma.setting.findUnique({ where: { key: "agent_system_prompt" } }),
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
    const promptTemplate = promptSetting?.value || DEFAULT_AGENT_PROMPT;
    const systemPrompt = applyPromptTemplate(promptTemplate, context);

    const anthropic = createAnthropic({ apiKey });
    const modelId = modelSetting?.value || DEFAULT_MODEL;

    const result = streamText({
      model: anthropic(modelId),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: agentTools,
      stopWhen: stepCountIs(10),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in agent chat:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to process request",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
