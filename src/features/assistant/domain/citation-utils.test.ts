import {
  extractCitedSourceIndexes,
  parseThinkingAndReply,
  remapCitationIndexes,
  resolveCitedSources,
} from "@/features/assistant/domain/citation-utils";
import { describe, expect, it } from "vitest";

describe("assistant citation utilities", () => {
  it("parses think tags into thinking and reply segments", () => {
    const parsed = parseThinkingAndReply(
      "<think>step by step</think>Final answer",
    );

    expect(parsed.thinking).toBe("step by step");
    expect(parsed.reply).toBe("Final answer");
  });

  it("extracts unique cited indexes in appearance order", () => {
    const indexes = extractCitedSourceIndexes("Use [2], [1], then [2] again.");
    expect(indexes).toEqual([2, 1]);
  });

  it("resolves, deduplicates, and remaps citation indexes", () => {
    const sources = [
      { id: "a", sourceType: "Note", title: "Alpha", content: "..." },
      { id: "b", sourceType: "Task", title: "Beta", content: "..." },
    ];

    const content = "Refs [2] [2] [1]";
    const cited = resolveCitedSources(content, sources);
    const remapped = remapCitationIndexes(content, cited);

    expect(cited.map((item) => item.source.id)).toEqual(["b", "a"]);
    expect(remapped).toBe("Refs [1] [1] [2]");
  });
});
