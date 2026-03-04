import { usePeopleStore } from "@/features/people/state";
import { useMemo } from "react";

export function usePeopleStateFacade() {
  const runtimePeopleState = usePeopleStore((state) => state.peopleState);
  const selectedPersonId = usePeopleStore((state) => state.selectedPersonId);
  const setSelectedPersonIdInStore = usePeopleStore(
    (state) => state.setSelectedPersonId,
  );

  const peopleState = useMemo(
    () => ({
      ...runtimePeopleState,
      selectedId: selectedPersonId,
    }),
    [runtimePeopleState, selectedPersonId],
  );

  const setSelectedPersonId = (personId: string | null) => {
    setSelectedPersonIdInStore(personId);
  };

  return {
    peopleState,
    setSelectedPersonId,
  };
}

export const peopleStateFacade = {
  setSelectedPersonId(personId: string | null) {
    usePeopleStore.getState().setSelectedPersonId(personId);
  },
};
