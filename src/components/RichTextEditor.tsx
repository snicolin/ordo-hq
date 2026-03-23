"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Node as TiptapNode, mergeAttributes } from "@tiptap/core";
import { useState, useCallback, useEffect, useRef } from "react";
import { useClickOutside } from "@/lib/hooks";
import { sanitizeHtml } from "@/lib/sanitize-html";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  ChevronDown,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Unlink,
  AlertTriangle,
} from "lucide-react";

const WarningBlock = TiptapNode.create({
  name: "warning",
  group: "block",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: "h3.warning" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["h3", mergeAttributes(HTMLAttributes, { class: "warning" }), 0];
  },

  addCommands() {
    return {
      toggleWarning:
        () =>
        ({ commands }: { commands: Record<string, (...args: unknown[]) => boolean> }) => {
          return commands.toggleNode(this.name, "paragraph");
        },
    } as Record<string, (...args: unknown[]) => unknown>;
  },
});

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

type BlockType = "paragraph" | "heading1" | "heading2" | "heading3" | "warning";

const BLOCK_TYPES: { value: BlockType; label: string; icon: React.ReactNode }[] = [
  { value: "paragraph", label: "Normal", icon: <Type className="h-3.5 w-3.5" /> },
  { value: "heading1", label: "Heading 1", icon: <Heading1 className="h-3.5 w-3.5" /> },
  { value: "heading2", label: "Heading 2", icon: <Heading2 className="h-3.5 w-3.5" /> },
  { value: "heading3", label: "Heading 3", icon: <Heading3 className="h-3.5 w-3.5" /> },
  { value: "warning", label: "Warning", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
];

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2.5 md:p-1.5 rounded transition-colors cursor-pointer ${
        active
          ? "bg-foreground/10 text-foreground"
          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

function BlockTypeDropdown({
  currentType,
  onSelect,
}: {
  currentType: BlockType;
  onSelect: (type: BlockType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, useCallback(() => setOpen(false), []), open);

  const current = BLOCK_TYPES.find((b) => b.value === currentType) ?? BLOCK_TYPES[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-2 md:py-1 rounded text-sm md:text-xs font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors cursor-pointer"
      >
        {current.icon}
        <span>{current.label}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
          {BLOCK_TYPES.map((block) => (
            <button
              key={block.value}
              type="button"
              onClick={() => {
                onSelect(block.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 md:py-1.5 text-sm md:text-xs cursor-pointer transition-colors ${
                currentType === block.value
                  ? "bg-foreground/5 text-foreground font-medium"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              {block.icon}
              {block.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LinkDialog({
  initialUrl,
  onSubmit,
  onRemove,
  onClose,
}: {
  initialUrl: string;
  onSubmit: (url: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-2 z-50 flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="url"
        placeholder="https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (url.trim()) onSubmit(url.trim());
          }
          if (e.key === "Escape") onClose();
        }}
        className="h-9 md:h-7 px-2 text-base md:text-xs rounded border border-input bg-transparent outline-none focus:border-ring w-[200px]"
      />
      <button
        type="button"
        onClick={() => url.trim() && onSubmit(url.trim())}
        className="h-9 md:h-7 px-2 text-sm md:text-xs rounded bg-foreground text-background font-medium cursor-pointer hover:opacity-90 transition-opacity"
      >
        Save
      </button>
      {initialUrl && (
        <button
          type="button"
          onClick={onRemove}
          title="Remove link"
          className="h-9 md:h-7 px-1.5 text-sm md:text-xs rounded text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
        >
          <Unlink className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      WarningBlock,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "rich-link" },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "Start typing...",
      }),
    ],
    content: value || "",
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
      transformPastedHTML(html) {
        return sanitizeHtml(html);
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (value !== currentHtml && value !== (currentHtml === "<p></p>" ? "" : currentHtml)) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  const getCurrentBlockType = useCallback((): BlockType => {
    if (!editor) return "paragraph";
    if (editor.isActive("warning")) return "warning";
    if (editor.isActive("heading", { level: 1 })) return "heading1";
    if (editor.isActive("heading", { level: 2 })) return "heading2";
    if (editor.isActive("heading", { level: 3 })) return "heading3";
    return "paragraph";
  }, [editor]);

  const setBlockType = useCallback(
    (type: BlockType) => {
      if (!editor) return;
      switch (type) {
        case "heading1":
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case "heading2":
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case "heading3":
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case "warning":
          (editor.chain().focus() as unknown as { toggleWarning: () => { run: () => void } }).toggleWarning().run();
          break;
        default:
          editor.chain().focus().setParagraph().run();
      }
    },
    [editor]
  );

  const toggleLink = useCallback(() => {
    if (!editor) return;
    if (editor.isActive("link")) {
      setLinkDialogOpen(true);
    } else {
      const { from, to } = editor.state.selection;
      if (from === to) return;
      setLinkDialogOpen(true);
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rich-text-editor rounded-lg border border-input overflow-hidden focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 transition-colors">
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-input bg-muted/30 flex-wrap">
        <BlockTypeDropdown
          currentType={getCurrentBlockType()}
          onSelect={setBlockType}
        />

        <div className="w-px h-4 bg-border mx-0.5" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold (Cmd+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic (Cmd+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline (Cmd+U)"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-0.5" />

        <div className="relative">
          <ToolbarButton
            onClick={toggleLink}
            active={editor.isActive("link")}
            title="Link (Cmd+K)"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          {linkDialogOpen && (
            <LinkDialog
              initialUrl={editor.getAttributes("link").href ?? ""}
              onSubmit={(url) => {
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .setLink({ href: url })
                  .run();
                setLinkDialogOpen(false);
              }}
              onRemove={() => {
                editor.chain().focus().extendMarkRange("link").unsetLink().run();
                setLinkDialogOpen(false);
              }}
              onClose={() => setLinkDialogOpen(false)}
            />
          )}
        </div>

        <div className="w-px h-4 bg-border mx-0.5" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet list"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered list"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-0.5" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule"
        >
          <Minus className="h-3.5 w-3.5" />
        </ToolbarButton>

      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
