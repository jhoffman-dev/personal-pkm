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
        "bg-muted/20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b px-2.5",
        className,
      )}
    >
      <div className="min-w-0 overflow-x-auto">
        <div
          role="tablist"
          className="flex w-max min-w-full items-stretch pr-1"
        >
          {tabs.map((tab) => {
            const isActive = tab.isActive ?? false;

            return (
              <div
                key={tab.id}
                role="presentation"
                className={cn(
                  "group relative inline-flex min-w-0 items-center border-r",
                  isActive
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:bg-muted/40",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-0 left-0 h-0.5 w-full",
                    isActive ? "bg-primary" : "bg-transparent",
                  )}
                />
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    "max-w-72 truncate px-3 py-2 text-sm leading-5 whitespace-nowrap",
                    isActive ? "font-medium" : "font-normal",
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
                    className={cn(
                      "mr-1 h-6 w-6 shrink-0",
                      isActive
                        ? "opacity-80 hover:opacity-100"
                        : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                    )}
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
