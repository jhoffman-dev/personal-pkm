import type { Person } from "@/data/entities";

export function toPlainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(value: string, maxLength = 600): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}…`;
}

export function personDisplayName(person: Person): string {
  return `${person.firstName} ${person.lastName}`.replace(/\s+/g, " ").trim();
}
