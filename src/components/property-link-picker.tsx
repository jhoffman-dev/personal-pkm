import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

export type PropertyOption = {
  id: string;
  label: string;
};

function getTypeHue(title: string): number {
  const normalized = title.trim().toLowerCase();

  if (normalized.includes("task")) {
    return 214;
  }

  if (normalized.includes("project")) {
    return 150;
  }

  if (normalized.includes("meeting")) {
    return 36;
  }

  if (normalized.includes("people") || normalized.includes("person")) {
    return 286;
  }

  if (normalized.includes("compan")) {
    return 332;
  }

  if (normalized.includes("note")) {
    return 186;
  }

  return 260;
}

function getChipStyle(hue: number): CSSProperties {
  return {
    backgroundColor: `hsl(${hue} 80% 92%)`,
    borderColor: `hsl(${hue} 52% 72%)`,
    color: `hsl(${hue} 45% 25%)`,
  };
}

export function PropertyLinkPicker({
  title,
  options,
  selectedIds,
  onAdd,
  onRemove,
  onCreateOption,
  searchPlaceholder,
  emptyLabel,
}: {
  title: string;
  options: PropertyOption[];
  selectedIds: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onCreateOption?: (label: string) => Promise<string | null>;
  searchPlaceholder?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedItems = useMemo(() => {
    const byId = new Map(options.map((option) => [option.id, option]));

    return selectedIds.map((id) => {
      const option = byId.get(id);
      return {
        id,
        label: option?.label ?? "Unknown item",
      };
    });
  }, [options, selectedIds]);

  const availableOptions = useMemo(() => {
    return options
      .filter((option) => !selectedSet.has(option.id))
      .filter((option) =>
        normalizedQuery.length === 0
          ? true
          : option.label.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 100);
  }, [normalizedQuery, options, selectedSet]);

  const hasExactMatch = useMemo(() => {
    if (!normalizedQuery) {
      return false;
    }

    return options.some(
      (option) => option.label.trim().toLowerCase() === normalizedQuery,
    );
  }, [normalizedQuery, options]);

  const canQuickCreate = Boolean(onCreateOption) && normalizedQuery.length > 0;
  const showQuickCreate = canQuickCreate && !hasExactMatch;
  const selectedChipStyle = getChipStyle(getTypeHue(title));

  const handleQuickCreate = async () => {
    if (!onCreateOption) {
      return;
    }

    const label = query.trim();
    if (!label) {
      return;
    }

    setIsCreating(true);
    try {
      const createdId = await onCreateOption(label);
      if (createdId) {
        onAdd(createdId);
      }
      setQuery("");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <h4 className="text-sm font-semibold">{title}</h4>

      <Button
        type="button"
        variant="outline"
        className="w-full justify-between"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="truncate">
          {selectedIds.length === 0
            ? `Add ${title.toLowerCase()}`
            : `${selectedIds.length} selected`}
        </span>
        <ChevronDown className="size-4" />
      </Button>

      {open ? (
        <div className="bg-background space-y-2 rounded-md border p-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              searchPlaceholder ?? `Search ${title.toLowerCase()}...`
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" && showQuickCreate) {
                event.preventDefault();
                void handleQuickCreate();
              }
            }}
          />

          {showQuickCreate ? (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                void handleQuickCreate();
              }}
              disabled={isCreating}
            >
              <Plus className="size-4" />
              {isCreating ? "Creating..." : `Add "${query.trim()}"`}
            </Button>
          ) : null}

          <div className="max-h-56 space-y-1 overflow-y-auto">
            {availableOptions.length === 0 ? (
              <p className="text-muted-foreground px-2 py-1 text-xs">
                {emptyLabel ?? "No matching items."}
              </p>
            ) : (
              availableOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="hover:bg-muted/60 flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm"
                  onClick={() => {
                    onAdd(option.id);
                  }}
                >
                  <span className="truncate">{option.label}</span>
                  <Check className="text-primary size-4 opacity-0" />
                </button>
              ))
            )}
          </div>

          {options.length > 100 && normalizedQuery.length === 0 ? (
            <p className="text-muted-foreground px-1 text-xs">
              Showing first 100 results. Type to narrow results.
            </p>
          ) : null}
        </div>
      ) : null}

      <div>
        {selectedItems.length === 0 ? (
          <p className="text-muted-foreground text-xs">No linked items.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selectedItems.map((item) => (
              <span
                key={item.id}
                className="inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-xs"
                style={selectedChipStyle}
              >
                <span className="max-w-36 truncate">{item.label}</span>
                <button
                  type="button"
                  className="hover:text-foreground text-muted-foreground"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.label}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
