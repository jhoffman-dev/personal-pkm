export type RagDocument = {
  id: string;
  sourceType: string;
  title: string;
  updatedAt?: string;
  content: string;
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
  "this",
  "you",
  "your",
  "i",
  "we",
  "they",
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function buildTokenCounts(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();

  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  });

  return counts;
}

function uniqueTokens(tokens: string[]): string[] {
  return Array.from(new Set(tokens));
}

function hasSoftPrefixMatch(token: string, candidates: string[]): boolean {
  if (token.length < 4) {
    return false;
  }

  return candidates.some(
    (candidate) =>
      candidate.startsWith(token) ||
      token.startsWith(candidate.slice(0, Math.min(4, candidate.length))),
  );
}

function recencyScore(updatedAt?: string): number {
  if (!updatedAt) {
    return 0;
  }

  const timestamp = new Date(updatedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return 0;
  }

  const ageDays = Math.max((Date.now() - timestamp) / (1000 * 60 * 60 * 24), 0);
  return Math.max(0, 0.75 - ageDays / 120);
}

function scoreDocument(queryTokens: string[], document: RagDocument): number {
  if (queryTokens.length === 0) {
    return 0;
  }

  const titleLower = document.title.toLowerCase();
  const contentLower = document.content.toLowerCase();
  const haystack = `${titleLower} ${contentLower}`;

  const titleTokens = tokenize(document.title);
  const bodyTokens = tokenize(document.content);
  const allDocTokens = [...titleTokens, ...bodyTokens];

  const titleCounts = buildTokenCounts(titleTokens);
  const bodyCounts = buildTokenCounts(bodyTokens);
  const docUniqueTokens = uniqueTokens(allDocTokens);
  const queryUniqueTokens = uniqueTokens(queryTokens);

  let score = 0;
  let matchedUniqueTokens = 0;

  queryUniqueTokens.forEach((token) => {
    const titleMatches = Math.min(titleCounts.get(token) ?? 0, 4);
    const bodyMatches = Math.min(bodyCounts.get(token) ?? 0, 6);

    const exactScore = titleMatches * 4 + bodyMatches * 1.4;
    if (exactScore > 0) {
      matchedUniqueTokens += 1;
      score += exactScore;
      return;
    }

    if (hasSoftPrefixMatch(token, docUniqueTokens)) {
      matchedUniqueTokens += 1;
      score += 0.8;
    }
  });

  const coverage = matchedUniqueTokens / Math.max(queryUniqueTokens.length, 1);
  score += coverage * 3.5;

  const normalizedQuery = queryTokens.join(" ").trim();
  if (normalizedQuery.length >= 8 && haystack.includes(normalizedQuery)) {
    score += 6;
  }

  for (let index = 0; index < queryTokens.length - 1; index += 1) {
    const phrase = `${queryTokens[index]} ${queryTokens[index + 1]}`;
    if (phrase.length >= 5 && haystack.includes(phrase)) {
      score += 1.25;
    }
  }

  score += recencyScore(document.updatedAt);
  return score;
}

export function retrieveRelevantDocuments(params: {
  query: string;
  documents: RagDocument[];
  maxDocuments?: number;
  maxChars?: number;
}): RagDocument[] {
  const { query, documents, maxDocuments = 12, maxChars = 7000 } = params;

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return [];
  }

  const ranked = documents
    .map((document) => ({
      document,
      score: scoreDocument(queryTokens, document),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, maxDocuments * 2)
    .map((item) => item.document);

  const selected: RagDocument[] = [];
  let totalChars = 0;

  ranked.forEach((document) => {
    if (selected.length >= maxDocuments) {
      return;
    }

    const nextSize = document.title.length + document.content.length;
    if (totalChars + nextSize > maxChars) {
      return;
    }

    totalChars += nextSize;
    selected.push(document);
  });

  return selected;
}

export function buildRagContextBlock(documents: RagDocument[]): string {
  if (documents.length === 0) {
    return "";
  }

  const lines: string[] = [];

  documents.forEach((document, index) => {
    lines.push(
      `[${index + 1}] ${document.sourceType}: ${document.title}${
        document.updatedAt ? ` (updated ${document.updatedAt})` : ""
      }`,
    );
    lines.push(document.content);
    lines.push("");
  });

  return lines.join("\n").trim();
}
