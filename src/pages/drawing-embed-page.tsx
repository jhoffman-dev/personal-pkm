import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";

import { getDrawingById, updateDrawing } from "@/lib/drawings-store";
import { useMemo, useRef } from "react";
import { useParams } from "react-router-dom";

type SceneElements = readonly ExcalidrawElement[];
const AUTOSAVE_DEBOUNCE_MS = 500;

export function DrawingEmbedPage() {
  const { drawingId } = useParams<{ drawingId: string }>();
  const saveTimeoutRef = useRef<number | null>(null);

  const drawing = useMemo(() => {
    if (!drawingId) {
      return null;
    }

    return getDrawingById(drawingId);
  }, [drawingId]);

  if (!drawing) {
    return (
      <section className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Drawing not found.</p>
      </section>
    );
  }

  return (
    <section className="h-screen w-screen">
      <Excalidraw
        initialData={{
          elements: drawing.scene.elements as SceneElements,
          scrollToContent: true,
        }}
        onChange={(elements) => {
          if (!drawingId) {
            return;
          }

          if (saveTimeoutRef.current !== null) {
            window.clearTimeout(saveTimeoutRef.current);
          }

          saveTimeoutRef.current = window.setTimeout(() => {
            updateDrawing(drawingId, {
              scene: {
                elements: [...elements],
              },
            });
          }, AUTOSAVE_DEBOUNCE_MS);
        }}
      />
    </section>
  );
}
