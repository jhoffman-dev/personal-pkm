/**
 * Splits model output into optional thinking content and visible reply content.
 *
 * Edge cases:
 * - Missing opening tag returns entire content as reply.
 * - Missing closing tag returns remaining content as thinking with empty reply.
 */
export function parseThinkingAndReply(content: string): {
  thinking: string;
  reply: string;
} {
  const openTag = "<think>";
  const closeTag = "</think>";
  const openIndex = content.indexOf(openTag);

  if (openIndex === -1) {
    return {
      thinking: "",
      reply: content,
    };
  }

  const thinkingStart = openIndex + openTag.length;
  const closeIndex = content.indexOf(closeTag, thinkingStart);

  if (closeIndex === -1) {
    return {
      thinking: content.slice(thinkingStart).trim(),
      reply: "",
    };
  }

  return {
    thinking: content.slice(thinkingStart, closeIndex).trim(),
    reply: content.slice(closeIndex + closeTag.length).trimStart(),
  };
}

/**
 * Extracts unique citation indexes in first-appearance order.
 *
 * Constraint:
 * - Only positive integer indexes from bracketed citations are returned.
 */
export function extractCitedSourceIndexes(content: string): number[] {
  const orderedIndexes: number[] = [];
  const seenIndexes = new Set<number>();
  const citationRegex = /\[(\d+)\]/g;

  let match = citationRegex.exec(content);
  while (match) {
    const value = Number(match[1]);
    if (Number.isInteger(value) && value > 0 && !seenIndexes.has(value)) {
      seenIndexes.add(value);
      orderedIndexes.push(value);
    }

    match = citationRegex.exec(content);
  }

  return orderedIndexes;
}

export type ResolvedCitation<TSource> = {
  citationIndex: number;
  originalCitationIndex: number;
  source: TSource;
};

/**
 * Resolves cited sources from message content and compacts citation numbering.
 *
 * Invariants:
 * - `citationIndex` is reassigned to contiguous values starting at 1.
 * - Duplicate source ids are removed from the resolved result.
 */
export function resolveCitedSources<TSource extends { id: string }>(
  content: string,
  sources: TSource[],
): ResolvedCitation<TSource>[] {
  const citedIndexes = extractCitedSourceIndexes(content);
  const resolved = citedIndexes
    .map((originalCitationIndex, index) => {
      const source = sources[originalCitationIndex - 1];
      if (!source) {
        return null;
      }

      return {
        citationIndex: index + 1,
        originalCitationIndex,
        source,
      };
    })
    .filter(Boolean) as ResolvedCitation<TSource>[];

  const seenSourceIds = new Set<string>();
  return resolved.filter((entry) => {
    if (seenSourceIds.has(entry.source.id)) {
      return false;
    }

    seenSourceIds.add(entry.source.id);
    return true;
  });
}

/**
 * Rewrites citation indexes in content to match remapped citation numbering.
 */
export function remapCitationIndexes(
  content: string,
  citedSources: { citationIndex: number; originalCitationIndex: number }[],
): string {
  if (citedSources.length === 0) {
    return content;
  }

  const indexMap = new Map<number, number>();
  citedSources.forEach((entry) => {
    indexMap.set(entry.originalCitationIndex, entry.citationIndex);
  });

  return content.replace(/\[(\d+)\]/g, (_value, indexText: string) => {
    const original = Number(indexText);
    const remapped = indexMap.get(original);

    return remapped ? `[${remapped}]` : `[${indexText}]`;
  });
}
