/**
 * Removes HTML-like markup from task text and normalizes whitespace.
 */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
