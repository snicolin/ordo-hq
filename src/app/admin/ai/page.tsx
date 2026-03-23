"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminLoading, AdminSectionHeader, AdminCard } from "../components";
import { Key, Save, RotateCcw, Eye, EyeOff, Check, CircleAlert, ChevronRight, ExternalLink } from "lucide-react";
import { AI_MODELS, DEFAULT_MODEL } from "@/lib/ai-models";

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
- Use your tools to accomplish what the user asks
- Propose specific actions — the user will confirm before they execute
- After actions are confirmed, summarize what was done
- If something fails, explain the error clearly
- Keep responses concise — the user is in a quick command context`;

interface AISettings {
  hasApiKey: boolean;
  maskedApiKey: string | null;
  envKeySet: boolean;
  maskedEnvKey: string | null;
  source: "database" | "environment" | null;
  systemPrompt: string | null;
  agentSystemPrompt: string | null;
  model: string | null;
}

export default function AdminAIPage() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [agentPrompt, setAgentPrompt] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savingAgentPrompt, setSavingAgentPrompt] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [savingModel, setSavingModel] = useState(false);
  const [modelSaved, setModelSaved] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const [agentPromptSaved, setAgentPromptSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai");
      if (!res.ok) throw new Error("Failed to load");
      const data: AISettings = await res.json();
      setSettings(data);
      setSystemPrompt(data.systemPrompt || DEFAULT_PROMPT);
      setAgentPrompt(data.agentSystemPrompt || DEFAULT_AGENT_PROMPT);
      setSelectedModel(data.model || DEFAULT_MODEL);
    } catch (err) {
      console.error("Failed to load AI settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveApiKey = async () => {
    setSavingKey(true);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setApiKey("");
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2000);
      await fetchSettings();
    } catch (err) {
      console.error("Failed to save API key:", err);
    } finally {
      setSavingKey(false);
    }
  };

  const saveModel = async (modelId: string) => {
    setSelectedModel(modelId);
    setSavingModel(true);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelId }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setModelSaved(true);
      setTimeout(() => setModelSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save model:", err);
    } finally {
      setSavingModel(false);
    }
  };

  const savePrompt = async () => {
    setSavingPrompt(true);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setPromptSaved(true);
      setTimeout(() => setPromptSaved(false), 2000);
      await fetchSettings();
    } catch (err) {
      console.error("Failed to save prompt:", err);
    } finally {
      setSavingPrompt(false);
    }
  };

  const resetPrompt = () => {
    setSystemPrompt(DEFAULT_PROMPT);
  };

  const saveAgentPrompt = async () => {
    setSavingAgentPrompt(true);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentSystemPrompt: agentPrompt }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setAgentPromptSaved(true);
      setTimeout(() => setAgentPromptSaved(false), 2000);
      await fetchSettings();
    } catch (err) {
      console.error("Failed to save agent prompt:", err);
    } finally {
      setSavingAgentPrompt(false);
    }
  };

  const resetAgentPrompt = () => {
    setAgentPrompt(DEFAULT_AGENT_PROMPT);
  };

  if (loading) return <AdminLoading />;

  return (
    <div className="space-y-8">
      {/* API Key */}
      <div>
        <AdminSectionHeader title="Anthropic API Key" />
        <AdminCard>
          <div className="p-4 space-y-4">
            {/* Status bar */}
            {settings?.hasApiKey ? (
              <div className="flex items-center gap-3 rounded-md bg-success px-3 py-2.5">
                <Check className="h-4 w-4 shrink-0 text-success-foreground" />
                <span className="text-sm text-success-foreground">
                  Active &middot; from {settings.source === "database" ? "database" : "environment"}
                </span>
                <Badge variant="secondary" className="ml-auto font-mono text-xs">
                  {settings.maskedApiKey || settings.maskedEnvKey}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-md bg-warning px-3 py-2.5">
                <CircleAlert className="h-4 w-4 shrink-0 text-warning-foreground" />
                <span className="text-sm text-warning-foreground">
                  Not configured
                </span>
              </div>
            )}

            {settings?.envKeySet && settings?.maskedApiKey && (
              <p className="text-xs text-muted-foreground">
                Environment variable also set — database key takes priority.
              </p>
            )}

            {/* Action area */}
            {settings?.envKeySet && !settings?.maskedApiKey ? (
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                  Override with database key
                </summary>
                <div className="mt-3 flex flex-col gap-3 md:flex-row md:gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKey ? "text" : "password"}
                      placeholder="sk-ant-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="h-11 pr-11 text-base md:h-9 md:pr-10 md:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground transition-colors md:h-9 md:w-9"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    onClick={saveApiKey}
                    disabled={!apiKey.trim() || savingKey}
                    className="h-11 w-full md:h-9 md:w-auto"
                  >
                    {keySaved ? (
                      <><Check className="h-4 w-4 mr-1" /> Saved</>
                    ) : (
                      <><Save className="h-4 w-4 mr-1" /> {savingKey ? "Saving..." : "Save Key"}</>
                    )}
                  </Button>
                </div>
              </details>
            ) : (
              <div className="flex flex-col gap-3 md:flex-row md:gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? "text" : "password"}
                    placeholder={settings?.maskedApiKey ? "Enter new key to replace..." : "sk-ant-..."}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="h-11 pr-11 text-base md:h-9 md:pr-10 md:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground transition-colors md:h-9 md:w-9"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  onClick={saveApiKey}
                  disabled={!apiKey.trim() || savingKey}
                  className="h-11 w-full md:h-9 md:w-auto"
                >
                  {keySaved ? (
                    <><Check className="h-4 w-4 mr-1" /> Saved</>
                  ) : (
                    <><Save className="h-4 w-4 mr-1" /> {savingKey ? "Saving..." : "Save Key"}</>
                  )}
                </Button>
              </div>
            )}

            {/* Help text */}
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
                >
                  Get a key from console.anthropic.com
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
              <p>
                Or set via <code className="bg-muted px-1 py-0.5 rounded text-[11px]">ANTHROPIC_API_KEY</code> environment variable.
              </p>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Model */}
      <div>
        <AdminSectionHeader title="Model" />
        <AdminCard>
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Select the Claude model used for both Ask and Agent modes.
            </p>
            <div className="flex items-center gap-3">
              <Select value={selectedModel} onValueChange={(v) => v && saveModel(v)}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue>
                    {AI_MODELS.find((m) => m.id === selectedModel)?.label || selectedModel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {savingModel && (
                <span className="text-xs text-muted-foreground">Saving...</span>
              )}
              {modelSaved && (
                <span className="flex items-center gap-1 text-xs text-success-foreground">
                  <Check className="h-3.5 w-3.5" /> Saved
                </span>
              )}
            </div>
          </div>
        </AdminCard>
      </div>

      {/* System Prompt */}
      <div>
        <AdminSectionHeader title="System Prompt" />
        <AdminCard>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Customize the AI system prompt. Portal data is injected via template variables at runtime.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <Label className="text-xs text-muted-foreground">Available variables:</Label>
                {["{{pagesSummary}}", "{{usersSummary}}", "{{groupsSummary}}", "{{alertsSummary}}"].map((v) => (
                  <Badge key={v} variant="outline" className="font-mono text-[10px]">
                    {v}
                  </Badge>
                ))}
              </div>
            </div>

            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={16}
              className="font-mono text-xs leading-relaxed"
            />

            <div className="flex justify-between">
              <Button variant="outline" onClick={resetPrompt} size="sm">
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset to Default
              </Button>
              <Button
                onClick={savePrompt}
                disabled={savingPrompt}
                size="sm"
              >
                {promptSaved ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    {savingPrompt ? "Saving..." : "Save Prompt"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Agent Prompt */}
      <div>
        <AdminSectionHeader title="Agent Prompt" />
        <AdminCard>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Customize the agent&apos;s behavior. The agent can take actions like creating pages, sections, items, and managing users.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <Label className="text-xs text-muted-foreground">Available variables:</Label>
                {["{{pagesSummary}}", "{{usersSummary}}", "{{groupsSummary}}", "{{alertsSummary}}"].map((v) => (
                  <Badge key={v} variant="outline" className="font-mono text-[10px]">
                    {v}
                  </Badge>
                ))}
              </div>
            </div>

            <Textarea
              value={agentPrompt}
              onChange={(e) => setAgentPrompt(e.target.value)}
              rows={16}
              className="font-mono text-xs leading-relaxed"
            />

            <div className="flex justify-between">
              <Button variant="outline" onClick={resetAgentPrompt} size="sm">
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset to Default
              </Button>
              <Button
                onClick={saveAgentPrompt}
                disabled={savingAgentPrompt}
                size="sm"
              >
                {agentPromptSaved ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    {savingAgentPrompt ? "Saving..." : "Save Prompt"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
