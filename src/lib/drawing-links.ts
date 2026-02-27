const DRAWING_PATH_PATTERN = /^\/drawings\/([^/?#]+)(?:\/embed)?\/?$/;

export function buildDrawingPath(drawingId: string): string {
  return `/drawings/${drawingId}`;
}

export function buildDrawingEmbedPath(drawingId: string): string {
  return `/drawings/${drawingId}/embed`;
}

export function buildDrawingEmbedHtml(drawingId: string): string {
  return `<div data-type="drawing-embed" data-drawing-id="${drawingId}"></div>`;
}

export function extractDrawingIdsFromNoteHtml(noteHtml: string): string[] {
  if (typeof window === "undefined" || !noteHtml) {
    return [];
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(noteHtml, "text/html");
  const drawingEmbedElements = Array.from(
    document.querySelectorAll(
      'div[data-type="drawing-embed"][data-drawing-id]',
    ),
  );
  const anchorElements = Array.from(document.querySelectorAll("a[href]"));

  const ids: string[] = [];
  const seen = new Set<string>();

  drawingEmbedElements.forEach((element) => {
    const drawingId = element.getAttribute("data-drawing-id");
    if (!drawingId || seen.has(drawingId)) {
      return;
    }

    seen.add(drawingId);
    ids.push(drawingId);
  });

  anchorElements.forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (!href) {
      return;
    }

    let pathName = "";

    if (href.startsWith("/")) {
      pathName = href;
    } else {
      try {
        const resolved = new URL(href, window.location.origin);
        pathName = resolved.pathname;
      } catch {
        return;
      }
    }

    const match = pathName.match(DRAWING_PATH_PATTERN);
    const drawingId = match?.[1];
    if (!drawingId || seen.has(drawingId)) {
      return;
    }

    seen.add(drawingId);
    ids.push(drawingId);
  });

  return ids;
}

export function convertDrawingLinksToEmbedBlocks(noteHtml: string): string {
  if (typeof window === "undefined" || !noteHtml) {
    return noteHtml;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(noteHtml, "text/html");
  const anchorElements = Array.from(document.querySelectorAll("a[href]"));

  anchorElements.forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (!href) {
      return;
    }

    let pathName = "";

    if (href.startsWith("/")) {
      pathName = href;
    } else {
      try {
        const resolved = new URL(href, window.location.origin);
        pathName = resolved.pathname;
      } catch {
        return;
      }
    }

    const match = pathName.match(DRAWING_PATH_PATTERN);
    const drawingId = match?.[1];
    if (!drawingId) {
      return;
    }

    const embed = document.createElement("div");
    embed.setAttribute("data-type", "drawing-embed");
    embed.setAttribute("data-drawing-id", drawingId);

    const parent = anchor.parentElement;
    if (
      parent &&
      parent.tagName === "P" &&
      parent.textContent?.trim() === anchor.textContent?.trim()
    ) {
      parent.replaceWith(embed);
      return;
    }

    anchor.replaceWith(embed);
  });

  return document.body.innerHTML;
}

function removeDrawingAnchorsFromDocument(document: Document): void {
  const anchorElements = Array.from(document.querySelectorAll("a[href]"));

  anchorElements.forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (!href) {
      return;
    }

    let pathName = "";

    if (href.startsWith("/")) {
      pathName = href;
    } else {
      if (typeof window === "undefined") {
        return;
      }

      try {
        const resolved = new URL(href, window.location.origin);
        pathName = resolved.pathname;
      } catch {
        return;
      }
    }

    if (!DRAWING_PATH_PATTERN.test(pathName)) {
      return;
    }

    const parent = anchor.parentElement;
    if (
      parent &&
      parent.tagName === "P" &&
      parent.textContent?.trim() === anchor.textContent?.trim()
    ) {
      parent.remove();
      return;
    }

    anchor.remove();
  });
}

export function stripDrawingLinksFromNoteHtml(noteHtml: string): string {
  if (typeof window === "undefined" || !noteHtml) {
    return noteHtml;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(noteHtml, "text/html");
  removeDrawingAnchorsFromDocument(document);
  return document.body.innerHTML;
}

export function embedDrawingLinksInNoteHtml(
  noteHtml: string,
  drawingIds: string[],
): string {
  if (typeof window === "undefined") {
    return noteHtml;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(noteHtml || "<p></p>", "text/html");
  removeDrawingAnchorsFromDocument(document);

  const uniqueIds = Array.from(new Set(drawingIds.filter(Boolean)));
  uniqueIds.forEach((drawingId) => {
    const paragraph = document.createElement("p");
    const anchor = document.createElement("a");
    anchor.setAttribute("href", buildDrawingPath(drawingId));
    anchor.textContent = `drawing:${drawingId}`;
    paragraph.appendChild(anchor);
    document.body.appendChild(paragraph);
  });

  return document.body.innerHTML;
}
