import { useMemo } from "react";

type TaggableEntity = {
  tags?: string[];
};

type TaggableSliceState = {
  ids: string[];
  entities: Record<string, TaggableEntity | undefined>;
};

export function useSharedTagSuggestions({
  projectsState,
  tasksState,
  notesState,
  meetingsState,
  companiesState,
  peopleState,
}: {
  projectsState: TaggableSliceState;
  tasksState: TaggableSliceState;
  notesState: TaggableSliceState;
  meetingsState: TaggableSliceState;
  companiesState: TaggableSliceState;
  peopleState: TaggableSliceState;
}) {
  return useMemo(() => {
    const values = new Set<string>();

    const collectTags = (state: TaggableSliceState) => {
      state.ids
        .map((id) => state.entities[id])
        .filter(Boolean)
        .forEach((entity) => {
          (entity?.tags ?? []).forEach((tag) => {
            const normalized = tag.trim();
            if (normalized) {
              values.add(normalized);
            }
          });
        });
    };

    collectTags(projectsState);
    collectTags(tasksState);
    collectTags(notesState);
    collectTags(meetingsState);
    collectTags(companiesState);
    collectTags(peopleState);

    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [
    companiesState.entities,
    companiesState.ids,
    meetingsState.entities,
    meetingsState.ids,
    notesState.entities,
    notesState.ids,
    peopleState.entities,
    peopleState.ids,
    projectsState.entities,
    projectsState.ids,
    tasksState.entities,
    tasksState.ids,
  ]);
}
