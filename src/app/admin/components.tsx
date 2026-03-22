import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal } from "lucide-react";

export function AdminLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <p className="typo-body text-muted-foreground">Loading...</p>
    </div>
  );
}

export function AdminEmpty({ message }: { message: string }) {
  return (
    <div className="px-4 py-8 text-center typo-body text-muted-foreground">
      {message}
    </div>
  );
}

export function AdminSectionHeader({
  title,
  addLabel,
  onAdd,
}: {
  title: string;
  addLabel?: string;
  onAdd?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="typo-heading">{title}</h2>
      {addLabel && onAdd && (
        <Button variant="ghost" size="sm" className="cursor-pointer" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" /> {addLabel}
        </Button>
      )}
    </div>
  );
}

export function AdminCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-border divide-y divide-border">
      {children}
    </div>
  );
}

export type AdminAction = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
} | "separator";

export function AdminRowActions({
  actions,
  size = "default",
}: {
  actions: AdminAction[];
  size?: "default" | "sm";
}) {
  const triggerClass = size === "sm"
    ? "inline-flex items-center justify-center h-8 w-8 shrink-0 cursor-pointer rounded-lg hover:bg-muted transition-colors"
    : "inline-flex items-center justify-center h-9 w-9 shrink-0 cursor-pointer rounded-lg hover:bg-muted transition-colors";
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={triggerClass}
        onClick={(e) => e.stopPropagation()}
      >
        <MoreHorizontal className={iconClass} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action, i) => {
          if (action === "separator") return <DropdownMenuSeparator key={i} />;
          return (
            <DropdownMenuItem
              key={i}
              className={`cursor-pointer ${action.destructive ? "text-destructive" : ""}`}
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
