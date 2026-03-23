"use client";

import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Search, Home, Shield, Bell, Users, Brain, FileText, Layers,
  Box, UserCircle, UsersRound, AlertTriangle, ArrowLeft,
  Sparkles, Send, Loader2, Square, Clock, X, Bot, Check,
  CheckCheck, SkipForward,
  type LucideIcon,
} from "lucide-react";
import Fuse from "fuse.js";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useSearch } from "@/hooks/use-search";
import { useIsMobile } from "@/hooks/use-is-mobile";

type SearchMode = "search" | "ask" | "agent";

type FlatItem =
  | { kind: "page"; href: string }
  | { kind: "entity"; type: string; id: string };

interface PageItem {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  keywords: string;
}

const STATIC_PAGES: PageItem[] = [
  { label: "Home", description: "Dashboard overview", href: "/", icon: Home, keywords: "home dashboard main" },
  { label: "Admin", description: "Content management", href: "/admin", icon: Shield, keywords: "admin content pages sections" },
  { label: "Admin / Alerts", description: "Alert management", href: "/admin/alerts", icon: Bell, keywords: "admin alerts banners notifications" },
  { label: "Admin / Users", description: "Users & groups", href: "/admin/users", icon: Users, keywords: "admin users groups members team" },
  { label: "Admin / AI", description: "AI settings & prompts", href: "/admin/ai", icon: Brain, keywords: "admin ai anthropic claude api key prompt" },
];

const pageFuse = new Fuse(STATIC_PAGES, {
  threshold: 0.3,
  includeScore: true,
  ignoreLocation: true,
  keys: [
    { name: "label", weight: 3 },
    { name: "description", weight: 1.5 },
    { name: "keywords", weight: 2 },
  ],
});

const SUGGESTED_QUESTIONS = [
  "What pages are in the portal?",
  "How many users are there?",
  "List all active alerts",
  "Summarize the portal structure",
];

const SUGGESTED_AGENT_ACTIONS = [
  "Create a Resources page",
  "Add an alert about maintenance",
  "Show me all pages and sections",
  "Set up a new user group",
];

const ENTITY_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  page: { icon: FileText, color: "text-muted-foreground" },
  section: { icon: Layers, color: "text-muted-foreground" },
  item: { icon: Box, color: "text-muted-foreground" },
  user: { icon: UserCircle, color: "text-muted-foreground" },
  group: { icon: UsersRound, color: "text-muted-foreground" },
  alert: { icon: AlertTriangle, color: "text-muted-foreground" },
};

interface ToolPart {
  type: string;
  toolName: string;
  toolCallId: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

function extractToolPart(part: Record<string, unknown>): ToolPart | null {
  const type = part.type as string;
  if (!type) return null;

  if (type === "dynamic-tool" && typeof part.toolName === "string") {
    return part as unknown as ToolPart;
  }

  if (type.startsWith("tool-") && typeof part.toolCallId === "string") {
    const toolName = type.slice(5);
    return { ...part, type, toolName } as unknown as ToolPart;
  }

  return null;
}

const TOOL_ACTION_LABELS: Record<string, string> = {
  create_page: "Create page",
  update_page: "Update page",
  delete_page: "Delete page",
  create_section: "Create section",
  update_section: "Update section",
  delete_section: "Delete section",
  create_item: "Create item",
  update_item: "Update item",
  delete_item: "Delete item",
  create_alert: "Create alert",
  update_alert: "Update alert",
  delete_alert: "Delete alert",
  create_group: "Create group",
  update_group: "Update group",
  delete_group: "Delete group",
  add_group_members: "Add group members",
  remove_group_member: "Remove group member",
  create_user: "Create user",
  update_user: "Update user",
  update_settings: "Update setting",
  reorder: "Reorder",
};

const PARAM_LABELS: Record<string, string> = {
  label: "Label", slug: "Slug", id: "ID", title: "Title", body: "Body",
  name: "Name", email: "Email", href: "URL", description: "Description",
  displayType: "Display type", content: "Content", image: "Image URL",
  value: "Value", color: "Color", expiresAt: "Expires", dismissible: "Dismissible",
  hideTitle: "Hide title", collapsible: "Collapsible", disabled: "Disabled",
  pageId: "Page ID", sectionId: "Section ID", key: "Setting", isHome: "Home page",
  userId: "User ID", groupId: "Group ID", userIds: "User IDs",
  isAdmin: "Admin", active: "Active", targetType: "Target",
  icon: "Icon", link: "Link", defaultPageId: "Default page",
  targetDate: "Target date", apiUrl: "API URL", apiField: "API field",
  pageIds: "Page IDs", type: "Type", items: "Items",
};

function formatParamValue(key: string, val: unknown): string {
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (val === null || val === undefined) return "";
  return String(val);
}

function describeToolParams(toolName: string, input: unknown): { action: string; params: { label: string; value: string }[] } {
  const action = TOOL_ACTION_LABELS[toolName] || toolName;
  const a = (input ?? {}) as Record<string, unknown>;
  const params: { label: string; value: string }[] = [];
  for (const [key, val] of Object.entries(a)) {
    if (val === undefined || val === null || val === "") continue;
    const label = PARAM_LABELS[key] || key;
    params.push({ label, value: formatParamValue(key, val) });
  }
  return { action, params };
}

function describeToolCall(toolName: string, input: unknown): string {
  const a = (input ?? {}) as Record<string, unknown>;
  switch (toolName) {
    case "create_page": return `Create page: ${a.label} (/${a.slug})`;
    case "update_page": return `Update page${a.label ? `: ${a.label}` : ""}`;
    case "delete_page": return `Delete page`;
    case "create_section": return `Create section: ${a.title} (${a.displayType})`;
    case "update_section": return `Update section${a.title ? `: ${a.title}` : ""}`;
    case "delete_section": return `Delete section`;
    case "create_item": return `Create item: ${a.name}${a.href ? ` → ${a.href}` : ""}`;
    case "update_item": return `Update item${a.name ? `: ${a.name}` : ""}`;
    case "delete_item": return `Delete item`;
    case "create_alert": return `Create alert: ${a.title}${a.expiresAt ? ` (expires ${a.expiresAt})` : ""}`;
    case "update_alert": return `Update alert${a.title ? `: ${a.title}` : ""}`;
    case "delete_alert": return `Delete alert`;
    case "create_group": return `Create group: ${a.name}`;
    case "update_group": return `Update group${a.name ? `: ${a.name}` : ""}`;
    case "delete_group": return `Delete group`;
    case "add_group_members": return `Add ${(a.userIds as string[])?.length ?? 0} member(s) to group`;
    case "remove_group_member": return `Remove member from group`;
    case "create_user": return `Create user: ${a.email}${a.name ? ` (${a.name})` : ""}`;
    case "update_user": return `Update user${a.isAdmin !== undefined ? ` (admin: ${a.isAdmin ? "yes" : "no"})` : ""}`;
    case "update_settings": return `Update ${a.key} → ${a.value}`;
    case "reorder": return `Reorder ${a.type}s`;
    default: return `${toolName}`;
  }
}

function formatToolResult(toolName: string, input: unknown): string {
  const a = (input ?? {}) as Record<string, unknown>;
  switch (toolName) {
    case "create_page": return `Created page: ${a.label} (/${a.slug})`;
    case "update_page": return `Updated page${a.label ? `: ${a.label}` : ""}`;
    case "delete_page": return `Deleted page`;
    case "create_section": return `Created section: ${a.title}`;
    case "update_section": return `Updated section${a.title ? `: ${a.title}` : ""}`;
    case "delete_section": return `Deleted section`;
    case "create_item": return `Created item: ${a.name}`;
    case "update_item": return `Updated item${a.name ? `: ${a.name}` : ""}`;
    case "delete_item": return `Deleted item`;
    case "create_alert": return `Created alert: ${a.title}`;
    case "update_alert": return `Updated alert${a.title ? `: ${a.title}` : ""}`;
    case "delete_alert": return `Deleted alert`;
    case "create_group": return `Created group: ${a.name}`;
    case "update_group": return `Updated group${a.name ? `: ${a.name}` : ""}`;
    case "delete_group": return `Deleted group`;
    case "add_group_members": return `Added members to group`;
    case "remove_group_member": return `Removed member from group`;
    case "create_user": return `Created user: ${a.email}`;
    case "update_user": return `Updated user`;
    case "update_settings": return `Updated ${a.key} to ${a.value}`;
    case "reorder": return `Reordered ${a.type}s`;
    default: return `Completed: ${toolName}`;
  }
}

const READ_TOOLS = new Set([
  "list_pages", "get_page", "list_users", "list_groups", "list_alerts", "get_settings",
]);

export function SearchDialog({ isAdmin }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SearchMode>("search");
  const router = useRouter();
  const { query, setQuery, results, totalResults, isLoading } = useSearch();
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const askInputRef = useRef<HTMLTextAreaElement>(null);
  const askScrollRef = useRef<HTMLDivElement>(null);
  const [askInput, setAskInput] = useState("");
  const [askQueuedMessage, setAskQueuedMessage] = useState<string | null>(null);

  // Ask AI chat
  const askTransport = useMemo(
    () => new DefaultChatTransport({ api: "/api/ask" }),
    [],
  );

  const { messages, sendMessage, status, error, clearError, setMessages, stop } = useChat({
    transport: askTransport,
    onError: (err) => {
      console.error("Ask AI error:", err);
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Agent chat
  const agentTransport = useMemo(
    () => new DefaultChatTransport({ api: "/api/agent" }),
    [],
  );

  const {
    messages: agentMessages,
    sendMessage: agentSendMessage,
    status: agentStatus,
    error: agentError,
    clearError: agentClearError,
    setMessages: setAgentMessages,
    stop: agentStop,
    addToolResult,
  } = useChat({
    transport: agentTransport,
    onError: (err) => {
      console.error("Agent error:", err);
    },
  });

  const isAgentStreaming = agentStatus === "streaming" || agentStatus === "submitted";
  const agentInputRef = useRef<HTMLTextAreaElement>(null);
  const agentScrollRef = useRef<HTMLDivElement>(null);
  const [agentInput, setAgentInput] = useState("");

  // Auto-scroll for both chat modes
  useEffect(() => {
    askScrollRef.current?.scrollTo({
      top: askScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    agentScrollRef.current?.scrollTo({
      top: agentScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [agentMessages]);

  const prevAskStreaming = useRef(isStreaming);
  useEffect(() => {
    const wasStreaming = prevAskStreaming.current;
    prevAskStreaming.current = isStreaming;
    if (wasStreaming && !isStreaming && askQueuedMessage) {
      const text = askQueuedMessage;
      const timeout = setTimeout(() => {
        setAskQueuedMessage(null);
        sendMessage({ text });
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [isStreaming, askQueuedMessage, sendMessage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open && mode === "search" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (open && mode === "ask" && askInputRef.current) {
      setTimeout(() => askInputRef.current?.focus(), 100);
    }
    if (open && mode === "agent" && agentInputRef.current) {
      setTimeout(() => agentInputRef.current?.focus(), 100);
    }
  }, [open, isMobile, mode]);

  const handleClose = () => {
    setOpen(false);
    setQuery("");
    setMode("search");
    setAskInput("");
    setAskQueuedMessage(null);
    setMessages([]);
    setAgentInput("");
    setAgentMessages([]);
    setSelectedIndex(-1);
  };

  const handleSelect = (type: string, id: string) => {
    handleClose();
    switch (type) {
      case "page":
        router.push(`/${id}`);
        break;
      case "section":
      case "item":
        router.push(`/admin`);
        break;
      case "user":
        router.push(`/admin/users`);
        break;
      case "group":
        router.push(`/admin/users`);
        break;
      case "alert":
        router.push(`/admin/alerts`);
        break;
    }
  };

  const matchedPages = useMemo(() => {
    if (query.length < 1) return [];
    return pageFuse.search(query).slice(0, 5).map((r) => r.item);
  }, [query]);

  const handlePageSelect = (href: string) => {
    handleClose();
    router.push(href);
  };

  const staticPageHrefs = useMemo(
    () => new Set(matchedPages.map((p) => p.href)),
    [matchedPages],
  );

  const filteredApiPages = useMemo(
    () => results.pages.filter((p) => !staticPageHrefs.has(`/${p.slug}`)),
    [results.pages, staticPageHrefs],
  );

  const allEmpty = totalResults === 0 && matchedPages.length === 0;

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  const flatItems = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = [];
    matchedPages.forEach((p) => items.push({ kind: "page", href: p.href }));
    filteredApiPages.forEach((p) => items.push({ kind: "entity", type: "page", id: p.slug || p.id }));
    results.sections.forEach((s) => items.push({ kind: "entity", type: "section", id: s.id }));
    results.items.forEach((i) => items.push({ kind: "entity", type: "item", id: i.id }));
    results.users.forEach((u) => items.push({ kind: "entity", type: "user", id: u.id }));
    results.groups.forEach((g) => items.push({ kind: "entity", type: "group", id: g.id }));
    results.alerts.forEach((a) => items.push({ kind: "entity", type: "alert", id: a.id }));
    return items;
  }, [matchedPages, filteredApiPages, results]);

  useEffect(() => {
    setSelectedIndex(flatItems.length === 1 ? 0 : -1);
  }, [query, flatItems.length]);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (flatItems.length === 0) return;

    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const item = flatItems[selectedIndex];
      if (item.kind === "page") {
        handlePageSelect(item.href);
      } else {
        handleSelect(item.type, item.id);
      }
    }
  };

  // Ask AI handlers
  const handleAskSubmit = useCallback((text?: string) => {
    const msg = (text || askInput).trim();
    if (!msg) return;

    if (isStreaming) {
      setAskQueuedMessage(msg);
      setAskInput("");
      return;
    }

    sendMessage({ text: msg });
    setAskInput("");
  }, [askInput, isStreaming, sendMessage]);

  const handleAskKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return;
    if (e.shiftKey) return;
    e.preventDefault();
    handleAskSubmit();
  };

  const handleAskButtonClick = useCallback(() => {
    if (isStreaming && !askInput.trim()) {
      stop();
      return;
    }
    handleAskSubmit();
  }, [isStreaming, askInput, stop, handleAskSubmit]);

  const showAskStopIcon = isStreaming && !askInput.trim();

  // Agent handlers
  const handleAgentSubmit = useCallback((text?: string) => {
    const msg = (text || agentInput).trim();
    if (!msg) return;
    agentSendMessage({ text: msg });
    setAgentInput("");
  }, [agentInput, agentSendMessage]);

  const handleAgentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return;
    if (e.shiftKey) return;
    e.preventDefault();
    handleAgentSubmit();
  };

  const handleAgentButtonClick = useCallback(() => {
    if (isAgentStreaming && !agentInput.trim()) {
      agentStop();
      return;
    }
    handleAgentSubmit();
  }, [isAgentStreaming, agentInput, agentStop, handleAgentSubmit]);

  const showAgentStopIcon = isAgentStreaming && !agentInput.trim();

  const handleApprove = useCallback(async (tp: ToolPart) => {
    const addOutput = addToolResult as (opts: { tool: string; toolCallId: string; output?: unknown; state?: string; errorText?: string }) => void;
    try {
      const res = await fetch("/api/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolName: tp.toolName, args: tp.input }),
      });
      const result = await res.json();
      addOutput({ tool: tp.toolName, toolCallId: tp.toolCallId, output: result });
    } catch (err) {
      addOutput({
        tool: tp.toolName,
        toolCallId: tp.toolCallId,
        state: "output-error",
        errorText: err instanceof Error ? err.message : "Execution failed",
      });
    }
  }, [addToolResult]);

  const handleSkip = useCallback((tp: ToolPart) => {
    const addOutput = addToolResult as (opts: { tool: string; toolCallId: string; output?: unknown }) => void;
    addOutput({
      tool: tp.toolName,
      toolCallId: tp.toolCallId,
      output: { skipped: true, reason: "User skipped this action" },
    });
  }, [addToolResult]);

  const handleApproveAll = useCallback(async () => {
    const pending = getPendingToolParts();
    for (const p of pending) {
      await handleApprove(p);
    }
  }, [handleApprove, agentMessages]);

  function getPendingToolParts(): ToolPart[] {
    const pending: ToolPart[] = [];
    for (const msg of agentMessages) {
      for (const part of msg.parts) {
        const tp = extractToolPart(part as unknown as Record<string, unknown>);
        if (tp && !READ_TOOLS.has(tp.toolName) && tp.state === "input-available") {
          pending.push(tp);
        }
      }
    }
    return pending;
  }

  // Mode toggle
  const modeToggle = (
    <div className="flex items-center gap-1 px-1">
      <button
        onClick={() => setMode("search")}
        className={cn(
          "px-3 py-2.5 md:py-1.5 text-sm md:text-xs font-medium rounded-full transition-colors flex items-center gap-1.5",
          mode === "search"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
        )}
      >
        <Search className="h-3 w-3" />
        Search
      </button>
      <button
        onClick={() => setMode("ask")}
        className={cn(
          "px-3 py-2.5 md:py-1.5 text-sm md:text-xs font-medium rounded-full transition-colors flex items-center gap-1.5",
          mode === "ask"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
        )}
      >
        <Sparkles className="h-3 w-3" />
        Ask AI
      </button>
      {isAdmin && (
        <button
          onClick={() => setMode("agent")}
          className={cn(
            "px-3 py-2.5 md:py-1.5 text-sm md:text-xs font-medium rounded-full transition-colors flex items-center gap-1.5",
            mode === "agent"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          <Bot className="h-3 w-3" />
          Agent
        </button>
      )}
    </div>
  );

  // Ask content
  const askContent = (
    <div className="flex flex-col min-h-0 h-full">
      <div ref={askScrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-3 space-y-3">
          {error && (
            <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3 flex items-center justify-between gap-2">
              <span>{error.message}</span>
              <Button variant="ghost" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </div>
          )}

          {messages.length === 0 && !error && (
            <div className="py-4">
              <div className="text-center mb-4">
                <Sparkles className="h-7 w-7 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">Ask about your portal data</p>
                <p className="text-xs text-muted-foreground mt-1">
                  I can answer questions about pages, users, groups, alerts, and more
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleAskSubmit(q)}
                    className="text-sm md:text-xs px-3 py-2.5 md:py-1.5 rounded-full border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded-lg p-3 text-sm",
                message.role === "user" ? "bg-primary/10 ml-8" : "bg-muted/50 mr-4",
              )}
            >
              <div className="font-medium text-sm md:text-xs text-muted-foreground mb-1">
                {message.role === "user" ? "You" : "AI"}
              </div>
              <div className="whitespace-pre-wrap break-words">
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return <span key={`${message.id}-${i}`}>{part.text}</span>;
                  }
                  return null;
                })}
              </div>
            </div>
          ))}

          {isStreaming && messages.length > 0 && !messages[messages.length - 1]?.parts.some(p => p.type === "text" && p.text) && (
            <div className="rounded-lg p-3 text-sm bg-muted/50 mr-4">
              <div className="font-medium text-sm md:text-xs text-muted-foreground mb-1">AI</div>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      <div className="border-t shrink-0">
        {askQueuedMessage && (
          <div className="px-3 pt-2">
            <div className="flex items-center gap-2 rounded-md bg-muted border px-2.5 py-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              <span className="truncate flex-1">{askQueuedMessage}</span>
              <button
                type="button"
                onClick={() => setAskQueuedMessage(null)}
                className="shrink-0 rounded-sm hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
        <div className="p-3">
          <div className="flex items-end gap-2">
            <Textarea
              ref={askInputRef}
              value={askInput}
              onChange={(e) => setAskInput(e.target.value)}
              onKeyDown={handleAskKeyDown}
              placeholder="Ask about your portal data..."
              rows={1}
              className="resize-none text-sm min-h-[36px] max-h-[120px] overflow-y-auto field-sizing-content"
            />
            <Button
              size="sm"
              className="shrink-0 self-stretch min-h-9 w-11 p-0 rounded-lg"
              disabled={!showAskStopIcon && !askInput.trim()}
              onClick={handleAskButtonClick}
            >
              {showAskStopIcon ? (
                <Square className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Agent content
  const pendingInvocations = getPendingToolParts();

  const agentContent = (
    <div className="flex flex-col min-h-0 h-full">
      <div ref={agentScrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-3 space-y-3">
          {agentError && (
            <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3 flex items-center justify-between gap-2">
              <span>{agentError.message}</span>
              <Button variant="ghost" size="sm" onClick={agentClearError}>
                Dismiss
              </Button>
            </div>
          )}

          {agentMessages.length === 0 && !agentError && (
            <div className="py-4">
              <div className="text-center mb-4">
                <Bot className="h-7 w-7 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">Tell me what to set up</p>
                <p className="text-xs text-muted-foreground mt-1">
                  I can create pages, sections, items, alerts, users, and more
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_AGENT_ACTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleAgentSubmit(q)}
                    className="text-sm md:text-xs px-3 py-2.5 md:py-1.5 rounded-full border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {agentMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded-lg p-3 text-sm",
                message.role === "user" ? "bg-primary/10 ml-8" : "bg-muted/50 mr-4",
              )}
            >
              <div className="font-medium text-sm md:text-xs text-muted-foreground mb-1">
                {message.role === "user" ? "You" : "Agent"}
              </div>
              <div className="whitespace-pre-wrap break-words space-y-2">
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return <span key={`${message.id}-${i}`}>{part.text}</span>;
                  }
                  const tp = extractToolPart(part as unknown as Record<string, unknown>);
                  if (tp) {
                    if (READ_TOOLS.has(tp.toolName)) return null;

                    if (tp.state === "output-available" || tp.state === "output-error") {
                      const output = tp.output as Record<string, unknown> | undefined;
                      const wasSkipped = output && "skipped" in output;
                      const wasError = tp.state === "output-error";
                      return (
                        <div key={`${message.id}-${i}`} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                          {wasSkipped ? (
                            <SkipForward className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : wasError ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-success-foreground shrink-0" />
                          )}
                          <span className={wasSkipped || wasError ? "text-muted-foreground" : ""}>
                            {wasSkipped
                              ? `Skipped: ${describeToolCall(tp.toolName, tp.input)}`
                              : wasError
                                ? `Error: ${tp.errorText || "Unknown error"}`
                                : formatToolResult(tp.toolName, tp.input)}
                          </span>
                        </div>
                      );
                    }

                    if (tp.state === "input-available") {
                      const { action, params } = describeToolParams(tp.toolName, tp.input);
                      return (
                        <div key={`${message.id}-${i}`} className="rounded-lg border p-3 space-y-2">
                          <div className="font-semibold text-xs">{action}</div>
                          {params.length > 0 && (
                            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                              {params.map((p) => (
                                <Fragment key={p.label}>
                                  <span className="text-muted-foreground">{p.label}</span>
                                  <span className="truncate">{p.value}</span>
                                </Fragment>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" className="h-10 text-sm md:h-7 md:text-xs" onClick={() => handleApprove(tp)}>
                              <Check className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button size="sm" variant="ghost" className="h-10 text-sm md:h-7 md:text-xs" onClick={() => handleSkip(tp)}>
                              Skip
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    return null;
                  }
                  return null;
                })}
              </div>
            </div>
          ))}

          {isAgentStreaming && agentMessages.length > 0 && !agentMessages[agentMessages.length - 1]?.parts.some(p => p.type === "text" && p.text) && !agentMessages[agentMessages.length - 1]?.parts.some(p => extractToolPart(p as unknown as Record<string, unknown>)) && (
            <div className="rounded-lg p-3 text-sm bg-muted/50 mr-4">
              <div className="font-medium text-sm md:text-xs text-muted-foreground mb-1">Agent</div>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      <div className="border-t shrink-0">
        {pendingInvocations.length >= 2 && (
          <div className="px-3 pt-2">
            <Button size="sm" className="w-full h-10 text-sm md:h-7 md:text-xs" onClick={handleApproveAll}>
              <CheckCheck className="h-3 w-3 mr-1" />
              Approve All ({pendingInvocations.length})
            </Button>
          </div>
        )}
        <div className="p-3">
          <div className="flex items-end gap-2">
            <Textarea
              ref={agentInputRef}
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
              onKeyDown={handleAgentKeyDown}
              placeholder="Tell me what to set up..."
              rows={1}
              className="resize-none text-sm min-h-[36px] max-h-[120px] overflow-y-auto field-sizing-content"
            />
            <Button
              size="sm"
              className="shrink-0 self-stretch min-h-9 w-11 p-0 rounded-lg"
              disabled={!showAgentStopIcon && !agentInput.trim()}
              onClick={handleAgentButtonClick}
            >
              {showAgentStopIcon ? (
                <Square className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  let itemIndex = 0;
  const resultBtnClass = (isActive: boolean) =>
    cn(
      "w-full flex items-center gap-3 px-3 py-3 md:px-2 md:py-2 rounded-md text-left transition-colors",
      isActive ? "bg-accent" : "hover:bg-muted active:bg-muted",
    );

  const renderEntityGroup = (
    label: string,
    entityType: string,
    items: Array<{ id: string; [key: string]: unknown }>,
    getTitle: (item: Record<string, unknown>) => string,
    getSubtitle?: (item: Record<string, unknown>) => string | null,
    getBadge?: (item: Record<string, unknown>) => string | null,
  ) => {
    if (items.length === 0) return null;
    const { icon: Icon, color } = ENTITY_ICONS[entityType] || { icon: FileText, color: "text-muted-foreground" };
    return (
      <div className="mb-4">
        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
          {label}
        </div>
        {items.map((item) => {
          const idx = itemIndex++;
          const isActive = idx === selectedIndex;
          const subtitle = getSubtitle?.(item);
          const badge = getBadge?.(item);
          return (
            <button
              key={item.id}
              ref={isActive ? activeItemRef : undefined}
              onClick={() => handleSelect(entityType, (item.slug as string) || item.id)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={resultBtnClass(isActive)}
            >
              <Icon className={`h-5 w-5 md:h-4 md:w-4 shrink-0 ${color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-base md:text-sm font-medium truncate">{getTitle(item)}</p>
                {subtitle && (
                  <p className="text-sm md:text-xs text-muted-foreground truncate">{subtitle}</p>
                )}
              </div>
              {badge && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {badge}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const searchResultsContent = (
    <>
      {isLoading && matchedPages.length === 0 && (
        <div className="p-4 text-center text-muted-foreground">
          Searching...
        </div>
      )}

      {!isLoading && query.length >= 2 && allEmpty && (
        <div className="p-4 text-center text-muted-foreground">
          No results found for &quot;{query}&quot;
        </div>
      )}

      {matchedPages.length > 0 && (
        <div className="p-2">
          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
            Pages
          </div>
          {matchedPages.map((page) => {
            const Icon = page.icon;
            const idx = itemIndex++;
            const isActive = idx === selectedIndex;
            return (
              <button
                key={page.href}
                ref={isActive ? activeItemRef : undefined}
                onClick={() => handlePageSelect(page.href)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={resultBtnClass(isActive)}
              >
                <Icon className="h-5 w-5 md:h-4 md:w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-base md:text-sm font-medium truncate">{page.label}</p>
                  <p className="text-sm md:text-xs text-muted-foreground truncate">
                    {page.description}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  Go to page
                </Badge>
              </button>
            );
          })}
        </div>
      )}

      {!isLoading && totalResults > 0 && (
        <div className="p-2">
          {renderEntityGroup("Portal Pages", "page", filteredApiPages,
            (p) => (p.label as string) || (p.slug as string) || "",
            (p) => p.slug ? `/${p.slug}` : null,
            (p) => p.isHome ? "Home" : null,
          )}
          {renderEntityGroup("Sections", "section", results.sections,
            (s) => (s.title as string) || "",
            (s) => s.displayType as string | null,
          )}
          {renderEntityGroup("Items", "item", results.items,
            (i) => (i.name as string) || "",
            (i) => (i.description as string) || (i.section as Record<string, unknown>)?.title as string || null,
          )}
          {renderEntityGroup("Users", "user", results.users,
            (u) => (u.name as string) || (u.email as string) || "",
            (u) => (u.email as string) || null,
            (u) => u.isAdmin ? "Admin" : null,
          )}
          {renderEntityGroup("Groups", "group", results.groups,
            (g) => (g.name as string) || "",
            (g) => {
              const count = (g._count as Record<string, number>)?.members;
              return count !== undefined ? `${count} member${count !== 1 ? "s" : ""}` : null;
            },
          )}
          {renderEntityGroup("Alerts", "alert", results.alerts,
            (a) => (a.title as string) || "",
            (a) => (a.body as string) || null,
            (a) => a.active ? "Active" : "Inactive",
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 md:hidden"
        onClick={() => setOpen(true)}
      >
        <Search className="h-5 w-5" />
        <span className="sr-only">Search</span>
      </Button>

      <Button
        variant="outline"
        className="hidden md:inline-flex w-56 justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        Search...
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">&#x2318;</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
        <DialogContent className={cn(
          "sm:max-w-[550px] p-0 gap-0 flex flex-col",
          (mode === "ask" || mode === "agent") ? "sm:h-[500px]" : "sm:max-h-[500px]",
        )}>
          <DialogTitle className="sr-only">Search</DialogTitle>

          <div className="flex items-center gap-2 p-3 md:px-4 md:pt-4 md:pb-3 border-b shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 md:hidden"
              onClick={handleClose}
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
            {mode === "search" ? (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Search pages, users, alerts..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-9 h-10"
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-2 h-10">
                {mode === "ask" ? (
                  <>
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-semibold">Ask AI</span>
                  </>
                ) : (
                  <>
                    <Bot className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-semibold">Agent</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-b shrink-0">
            {modeToggle}
          </div>

          {mode === "search" ? (
            <div className="overflow-y-auto flex-1 pb-2">
              {searchResultsContent}
            </div>
          ) : mode === "ask" ? (
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {askContent}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {agentContent}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
