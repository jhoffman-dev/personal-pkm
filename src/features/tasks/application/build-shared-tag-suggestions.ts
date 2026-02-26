type TaggedEntity = {
  tags?: string[];
};

export function buildSharedTagSuggestions(
  collections: TaggedEntity[][],
): string[] {
  const values = new Set<string>();

  collections.forEach((items) => {
    items.forEach((item) => {
      (item.tags ?? []).forEach((tag) => {
        const trimmed = tag.trim();
        if (trimmed) {
          values.add(trimmed);
        }
      });
    });
  });

  return Array.from(values).sort((left, right) => left.localeCompare(right));
}
