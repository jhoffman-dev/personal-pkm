import type { Meeting } from "@/data/entities";
import type { EntityId } from "@/data/types";
import {
  createInitialEntityRuntimeState,
  type EntityRuntimeState,
} from "@/features/shared/application/entity-runtime-state";
import { create } from "zustand";

export interface MeetingsStoreState {
  selectedMeetingId: EntityId | null;
  meetingsState: EntityRuntimeState<Meeting>;
  setSelectedMeetingId: (id: EntityId | null) => void;
}

export const useMeetingsStore = create<MeetingsStoreState>((set) => ({
  selectedMeetingId: null,
  meetingsState: createInitialEntityRuntimeState<Meeting>(),
  setSelectedMeetingId: (id) => {
    set({ selectedMeetingId: id });
  },
}));
