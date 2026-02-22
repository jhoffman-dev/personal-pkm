export type EntityId = string;

export type IsoDateString = string;

export interface BaseEntity {
  id: EntityId;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export type EntityCollectionName =
  | "projects"
  | "notes"
  | "tasks"
  | "meetings"
  | "companies"
  | "people";

export type RelationField<T> = Extract<keyof T, `${string}Ids`>;

export function nowIsoDate(): IsoDateString {
  return new Date().toISOString();
}

export function createEntityId(prefix: string): EntityId {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
