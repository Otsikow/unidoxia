import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";

export function DragHandle({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
      {...props}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

export function MoveUpButton({ disabled, onClick, className }: { disabled?: boolean; onClick: () => void; className?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={onClick}
      disabled={disabled}
      aria-label="Move up"
    >
      <ChevronUp className="h-4 w-4" />
    </Button>
  );
}

export function MoveDownButton({ disabled, onClick, className }: { disabled?: boolean; onClick: () => void; className?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={onClick}
      disabled={disabled}
      aria-label="Move down"
    >
      <ChevronDown className="h-4 w-4" />
    </Button>
  );
}
