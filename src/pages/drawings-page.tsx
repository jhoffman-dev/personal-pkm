import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildDrawingPath } from "@/lib/drawing-links";
import {
  createDrawing,
  deleteDrawing,
  listDrawings,
  updateDrawing,
  type DrawingRecord,
} from "@/lib/drawings-store";
import { useNavigate, useParams } from "react-router-dom";

const AUTOSAVE_DEBOUNCE_MS = 700;

type SceneElements = readonly ExcalidrawElement[];

export function DrawingsPage() {
  const navigate = useNavigate();
  const { drawingId } = useParams<{ drawingId: string }>();
  const [drawings, setDrawings] = useState<DrawingRecord[]>(() => {
    const existing = listDrawings();
    if (existing.length > 0) {
      return existing;
    }

    return [createDrawing()];
  });
  const [status, setStatus] = useState<string>("");
  const saveTimeoutRef = useRef<number | null>(null);

  const refreshDrawings = useCallback(() => {
    setDrawings(listDrawings());
  }, []);

  useEffect(() => {
    if (!drawingId || !drawings.some((drawing) => drawing.id === drawingId)) {
      navigate(buildDrawingPath(drawings[0].id), { replace: true });
    }
  }, [drawingId, drawings, navigate]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const selectedDrawing = useMemo(
    () => drawings.find((drawing) => drawing.id === drawingId) ?? null,
    [drawingId, drawings],
  );

  const scheduleSceneSave = useCallback(
    (id: string, elements: SceneElements) => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = window.setTimeout(() => {
        const updated = updateDrawing(id, {
          scene: {
            elements: [...elements],
          },
        });

        if (!updated) {
          return;
        }

        setDrawings((previous) =>
          previous
            .map((drawing) => (drawing.id === updated.id ? updated : drawing))
            .sort((left, right) =>
              right.updatedAt.localeCompare(left.updatedAt),
            ),
        );
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [],
  );

  const handleCreateDrawing = () => {
    const created = createDrawing();
    refreshDrawings();
    navigate(buildDrawingPath(created.id));
    setStatus("Created drawing.");
  };

  const handleDeleteDrawing = () => {
    if (!selectedDrawing) {
      return;
    }

    if (!window.confirm("Delete this drawing?")) {
      return;
    }

    const removed = deleteDrawing(selectedDrawing.id);
    if (!removed) {
      return;
    }

    const remaining = listDrawings();
    setDrawings(remaining);

    if (remaining.length === 0) {
      const created = createDrawing();
      setDrawings([created]);
      navigate(buildDrawingPath(created.id), { replace: true });
    } else {
      navigate(buildDrawingPath(remaining[0].id), { replace: true });
    }

    setStatus("Deleted drawing.");
  };

  const handleCopyDrawingLink = async () => {
    if (!selectedDrawing) {
      return;
    }

    const absoluteLink = `${window.location.origin}${buildDrawingPath(selectedDrawing.id)}`;

    try {
      await navigator.clipboard.writeText(absoluteLink);
      setStatus("Copied drawing link.");
    } catch {
      setStatus("Unable to copy link.");
    }
  };

  return (
    <section className="h-[calc(100svh-41px)] p-6">
      <Card className="h-full overflow-hidden py-0">
        <CardContent className="grid h-full grid-cols-[18rem_minmax(0,1fr)] gap-0 p-0">
          <aside className="border-r p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Drawings</h2>
              <Button type="button" size="sm" onClick={handleCreateDrawing}>
                New
              </Button>
            </div>

            <div className="space-y-1 overflow-y-auto pb-2">
              {drawings.map((drawing) => {
                const isActive = selectedDrawing?.id === drawing.id;

                return (
                  <button
                    key={drawing.id}
                    type="button"
                    className={`w-full rounded-md border px-2 py-2 text-left text-sm ${
                      isActive ? "bg-muted" : "bg-background"
                    }`}
                    onClick={() => {
                      navigate(buildDrawingPath(drawing.id));
                    }}
                  >
                    <p className="truncate font-medium">{drawing.title}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Updated {new Date(drawing.updatedAt).toLocaleString()}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b p-3">
              <Input
                value={selectedDrawing?.title ?? ""}
                onChange={(event) => {
                  if (!selectedDrawing) {
                    return;
                  }

                  const updated = updateDrawing(selectedDrawing.id, {
                    title: event.target.value,
                  });

                  if (!updated) {
                    return;
                  }

                  setDrawings((previous) =>
                    previous.map((drawing) =>
                      drawing.id === updated.id ? updated : drawing,
                    ),
                  );
                }}
                placeholder="Drawing title"
                className="max-w-md"
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyDrawingLink}
                disabled={!selectedDrawing}
              >
                Copy link
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeleteDrawing}
                disabled={!selectedDrawing}
              >
                Delete
              </Button>

              {status ? (
                <p className="text-muted-foreground ml-auto text-xs">
                  {status}
                </p>
              ) : null}
            </div>

            <div className="min-h-0 flex-1">
              {selectedDrawing ? (
                <Excalidraw
                  key={selectedDrawing.id}
                  initialData={{
                    elements: selectedDrawing.scene.elements as SceneElements,
                  }}
                  onChange={(elements) => {
                    scheduleSceneSave(selectedDrawing.id, elements);
                  }}
                />
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
