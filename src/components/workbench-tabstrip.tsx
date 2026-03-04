import type { ReactNode } from "react";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WorkbenchTabItem {
  id: string;
  label: string;
  isActive?: boolean;
  onSelect?: () => void;
  onClose?: () => void;
}

interface WorkbenchTabstripProps {
  tabs: WorkbenchTabItem[];
  rightSlot?: ReactNode;
  className?: string;
}

export function WorkbenchTabstrip({
  tabs,
  rightSlot,
  className,
}: WorkbenchTabstripProps) {
  return (
    <div
      className={cn(
        "bg-muted/20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b px-2 py-1",
        className,
      )}
    >
      <div className="min-w-0 overflow-x-auto">
        <div className="flex w-max min-w-full items-center gap-1 pr-1">
          {tabs.map((tab) => {
            const isActive = tab.isActive ?? false;

            return (
              <div
                key={tab.id}
                role="presentation"
                className={cn(
                  "bg-background inline-flex min-w-0 items-center gap-1 rounded-md border",
                  isActive ? "border-border" : "border-transparent",
                )}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    "max-w-64 truncate px-3 py-1.5 text-sm whitespace-nowrap",
                    isActive ? "text-foreground" : "text-muted-foreground",
                    tab.onSelect ? "cursor-pointer" : "cursor-default",
                  )}
                  onClick={tab.onSelect}
                  disabled={!tab.onSelect}
                >
                  {tab.label}
                </button>

                {tab.onClose ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="mr-1"
                    aria-label={`Close ${tab.label}`}
                    onClick={tab.onClose}
                  >
                    <X />
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {rightSlot ? (
        <div className="flex shrink-0 items-center gap-1">{rightSlot}</div>
      ) : null}
    </div>
  );
}
