import type { Person } from "@/data/entities";
import type { EntityId } from "@/data/types";
import {
  createInitialEntityRuntimeState,
  type EntityRuntimeState,
} from "@/features/shared/application/entity-runtime-state";
import { create } from "zustand";

export interface PeopleStoreState {
  selectedPersonId: EntityId | null;
  peopleState: EntityRuntimeState<Person>;
  setSelectedPersonId: (id: EntityId | null) => void;
}

export const usePeopleStore = create<PeopleStoreState>((set) => ({
  selectedPersonId: null,
  peopleState: createInitialEntityRuntimeState<Person>(),
  setSelectedPersonId: (id) => {
    set({ selectedPersonId: id });
  },
}));
