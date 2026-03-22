import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
