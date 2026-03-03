import type { Person } from "@/data/entities";

/**
 * Converts rich text/HTML-like content into plain text.
 *
 * Invariant:
 * - Output has normalized whitespace and no markup tags.
 */
export function toPlainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Truncates text to a maximum length and appends an ellipsis when needed.
 */
export function truncateText(value: string, maxLength = 600): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}…`;
}

/**
 * Formats a person display name using first and last name fields.
 */
export function personDisplayName(person: Person): string {
  return `${person.firstName} ${person.lastName}`.replace(/\s+/g, " ").trim();
}
