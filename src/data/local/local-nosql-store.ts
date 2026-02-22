import type {
  Company,
  Meeting,
  Note,
  Person,
  Project,
  Task,
} from "@/data/entities";
import type { EntityCollectionName, EntityId } from "@/data/types";

type CollectionMap<T> = Record<EntityId, T>;

export type CollectionEntityMap = {
  projects: Project;
  notes: Note;
  tasks: Task;
  meetings: Meeting;
  companies: Company;
  people: Person;
};

type LocalNoSqlState = {
  projects: CollectionMap<Project>;
  notes: CollectionMap<Note>;
  tasks: CollectionMap<Task>;
  meetings: CollectionMap<Meeting>;
  companies: CollectionMap<Company>;
  people: CollectionMap<Person>;
};

const LOCAL_STORAGE_KEY = "pkm.local.nosql.v1";

function createEmptyState(): LocalNoSqlState {
  return {
    projects: {},
    notes: {},
    tasks: {},
    meetings: {},
    companies: {},
    people: {},
  };
}

export class LocalNoSqlStore {
  private state: LocalNoSqlState;

  constructor() {
    this.state = this.load();
  }

  private load(): LocalNoSqlState {
    if (typeof window === "undefined") {
      return createEmptyState();
    }

    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return createEmptyState();
    }

    try {
      const parsed = JSON.parse(raw) as Partial<LocalNoSqlState>;
      return {
        projects: parsed.projects ?? {},
        notes: parsed.notes ?? {},
        tasks: parsed.tasks ?? {},
        meetings: parsed.meetings ?? {},
        companies: parsed.companies ?? {},
        people: parsed.people ?? {},
      };
    } catch {
      return createEmptyState();
    }
  }

  private persist(): void {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.state));
  }

  getAll<TCollection extends EntityCollectionName>(
    collection: TCollection,
  ): CollectionEntityMap[TCollection][] {
    return Object.values(
      this.state[collection],
    ) as CollectionEntityMap[TCollection][];
  }

  getById<TCollection extends EntityCollectionName>(
    collection: TCollection,
    id: EntityId,
  ): CollectionEntityMap[TCollection] | null {
    return (
      (this.state[collection][id] as
        | CollectionEntityMap[TCollection]
        | undefined) ?? null
    );
  }

  set<TCollection extends EntityCollectionName>(
    collection: TCollection,
    item: CollectionEntityMap[TCollection],
  ): CollectionEntityMap[TCollection] {
    this.state[collection][item.id] = item;
    this.persist();
    return item;
  }

  delete(collection: EntityCollectionName, id: EntityId): boolean {
    const exists = id in this.state[collection];
    if (!exists) {
      return false;
    }

    delete this.state[collection][id];
    this.persist();
    return true;
  }
}
