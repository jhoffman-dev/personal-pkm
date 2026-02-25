import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  PropertyLinkPicker,
  type PropertyOption,
} from "@/components/property-link-picker";
import { useEntityQuickCreate } from "@/hooks/use-entity-quick-create";
import { useSharedTagSuggestions } from "@/hooks/use-shared-tag-suggestions";
import { addUnique, equalSet } from "@/lib/entity-link-utils";
import {
  dataActions,
  dataThunks,
  useAppDispatch,
  useAppSelector,
} from "@/store";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function toDateTimeLocalValue(isoDateString: string): string {
  const date = new Date(isoDateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (value: number) => value.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fromDateTimeLocalValue(value: string): string {
  if (!value.trim()) {
    return new Date().toISOString();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

export function MeetingsPage() {
  const dispatch = useAppDispatch();
  const meetingsState = useAppSelector((state) => state.meetings);
  const peopleState = useAppSelector((state) => state.people);
  const companiesState = useAppSelector((state) => state.companies);
  const projectsState = useAppSelector((state) => state.projects);
  const notesState = useAppSelector((state) => state.notes);
  const tasksState = useAppSelector((state) => state.tasks);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftScheduledFor, setDraftScheduledFor] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [draftPersonIds, setDraftPersonIds] = useState<string[]>([]);
  const [draftCompanyIds, setDraftCompanyIds] = useState<string[]>([]);
  const [draftProjectIds, setDraftProjectIds] = useState<string[]>([]);
  const [draftNoteIds, setDraftNoteIds] = useState<string[]>([]);
  const [draftTaskIds, setDraftTaskIds] = useState<string[]>([]);
  const {
    createQuickCompany,
    createQuickMeeting,
    createQuickNote,
    createQuickPerson,
    createQuickProject,
    createQuickTask,
  } = useEntityQuickCreate();

  useEffect(() => {
    if (meetingsState.status === "idle") {
      void dispatch(dataThunks.meetings.fetchAll());
    }
    if (peopleState.status === "idle") {
      void dispatch(dataThunks.people.fetchAll());
    }
    if (companiesState.status === "idle") {
      void dispatch(dataThunks.companies.fetchAll());
    }
    if (projectsState.status === "idle") {
      void dispatch(dataThunks.projects.fetchAll());
    }
    if (notesState.status === "idle") {
      void dispatch(dataThunks.notes.fetchAll());
    }
    if (tasksState.status === "idle") {
      void dispatch(dataThunks.tasks.fetchAll());
    }
  }, [
    companiesState.status,
    dispatch,
    meetingsState.status,
    notesState.status,
    peopleState.status,
    projectsState.status,
    tasksState.status,
  ]);

  const sortedMeetings = useMemo(
    () =>
      meetingsState.ids
        .map((id) => meetingsState.entities[id])
        .filter(Boolean)
        .sort((a, b) => {
          const byTitle = a.title.localeCompare(b.title, undefined, {
            sensitivity: "base",
          });

          if (byTitle !== 0) {
            return byTitle;
          }

          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        }),
    [meetingsState.entities, meetingsState.ids],
  );

  useEffect(() => {
    if (meetingsState.status !== "succeeded") {
      return;
    }

    const selectedId = meetingsState.selectedId;
    if (selectedId && meetingsState.entities[selectedId]) {
      return;
    }

    dispatch(dataActions.meetings.setSelectedId(sortedMeetings[0]?.id ?? null));
  }, [
    dispatch,
    meetingsState.entities,
    meetingsState.selectedId,
    meetingsState.status,
    sortedMeetings,
  ]);

  const selectedMeeting = meetingsState.selectedId
    ? meetingsState.entities[meetingsState.selectedId]
    : null;

  useEffect(() => {
    if (!selectedMeeting) {
      setDraftTitle("");
      setDraftScheduledFor("");
      setDraftLocation("");
      setDraftTags([]);
      setDraftPersonIds([]);
      setDraftCompanyIds([]);
      setDraftProjectIds([]);
      setDraftNoteIds([]);
      setDraftTaskIds([]);
      return;
    }

    setDraftTitle(selectedMeeting.title);
    setDraftScheduledFor(toDateTimeLocalValue(selectedMeeting.scheduledFor));
    setDraftLocation(selectedMeeting.location ?? "");
    setDraftTags(selectedMeeting.tags ?? []);
    setDraftPersonIds(selectedMeeting.personIds ?? []);
    setDraftCompanyIds(selectedMeeting.companyIds ?? []);
    setDraftProjectIds(selectedMeeting.projectIds ?? []);
    setDraftNoteIds(selectedMeeting.noteIds ?? []);
    setDraftTaskIds(selectedMeeting.taskIds ?? []);
  }, [selectedMeeting?.id]);

  useEffect(() => {
    if (!selectedMeeting) {
      return;
    }

    const nextTitle = draftTitle.trim() || "Untitled meeting";
    const nextScheduledFor = fromDateTimeLocalValue(draftScheduledFor);
    const titleChanged = nextTitle !== selectedMeeting.title;
    const scheduledForChanged =
      nextScheduledFor !== selectedMeeting.scheduledFor;
    const locationChanged = draftLocation !== (selectedMeeting.location ?? "");
    const tagsChanged = !equalSet(draftTags, selectedMeeting.tags ?? []);
    const peopleChanged = !equalSet(
      draftPersonIds,
      selectedMeeting.personIds ?? [],
    );
    const companiesChanged = !equalSet(
      draftCompanyIds,
      selectedMeeting.companyIds ?? [],
    );
    const projectsChanged = !equalSet(
      draftProjectIds,
      selectedMeeting.projectIds ?? [],
    );
    const notesChanged = !equalSet(draftNoteIds, selectedMeeting.noteIds ?? []);
    const tasksChanged = !equalSet(draftTaskIds, selectedMeeting.taskIds ?? []);

    if (
      !titleChanged &&
      !scheduledForChanged &&
      !locationChanged &&
      !tagsChanged &&
      !peopleChanged &&
      !companiesChanged &&
      !projectsChanged &&
      !notesChanged &&
      !tasksChanged
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void dispatch(
        dataThunks.meetings.updateOne({
          id: selectedMeeting.id,
          input: {
            title: nextTitle,
            scheduledFor: nextScheduledFor,
            location: draftLocation,
            tags: draftTags,
            personIds: draftPersonIds,
            companyIds: draftCompanyIds,
            projectIds: draftProjectIds,
            noteIds: draftNoteIds,
            taskIds: draftTaskIds,
          },
        }),
      );
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [
    dispatch,
    draftCompanyIds,
    draftLocation,
    draftNoteIds,
    draftPersonIds,
    draftProjectIds,
    draftScheduledFor,
    draftTags,
    draftTaskIds,
    draftTitle,
    selectedMeeting,
  ]);

  const peopleOptions = useMemo<PropertyOption[]>(
    () =>
      peopleState.ids
        .map((id) => peopleState.entities[id])
        .filter(Boolean)
        .map((person) => ({
          id: person.id,
          label:
            `${person.lastName ?? ""}, ${person.firstName ?? ""}`
              .replace(/^\s*,\s*|\s*,\s*$/g, "")
              .trim() || "Unnamed person",
        })),
    [peopleState.entities, peopleState.ids],
  );

  const companyOptions = useMemo<PropertyOption[]>(
    () =>
      companiesState.ids
        .map((id) => companiesState.entities[id])
        .filter(Boolean)
        .map((company) => ({ id: company.id, label: company.name })),
    [companiesState.entities, companiesState.ids],
  );

  const projectOptions = useMemo<PropertyOption[]>(
    () =>
      projectsState.ids
        .map((id) => projectsState.entities[id])
        .filter(Boolean)
        .map((project) => ({ id: project.id, label: project.name })),
    [projectsState.entities, projectsState.ids],
  );

  const noteOptions = useMemo<PropertyOption[]>(
    () =>
      notesState.ids
        .map((id) => notesState.entities[id])
        .filter(Boolean)
        .map((note) => ({ id: note.id, label: note.title })),
    [notesState.entities, notesState.ids],
  );

  const taskOptions = useMemo<PropertyOption[]>(
    () =>
      tasksState.ids
        .map((id) => tasksState.entities[id])
        .filter(Boolean)
        .map((task) => ({ id: task.id, label: task.title })),
    [tasksState.entities, tasksState.ids],
  );

  const sharedTagSuggestions = useSharedTagSuggestions({
    projectsState,
    tasksState,
    notesState,
    meetingsState,
    companiesState,
    peopleState,
  });

  const createMeeting = async () => {
    const createdId = await createQuickMeeting("New meeting");
    dispatch(dataActions.meetings.setSelectedId(createdId));
  };

  const addTag = () => {
    const value = tagInput.trim();
    if (!value) {
      return;
    }

    const exists = draftTags.some(
      (tag) => tag.toLowerCase() === value.toLowerCase(),
    );

    if (!exists) {
      setDraftTags((previous) => [...previous, value]);
    }

    setTagInput("");
  };

  const meetingSummary = selectedMeeting
    ? toDateTimeLocalValue(selectedMeeting.scheduledFor)
    : "";

  return (
    <section className="h-[calc(100svh-41px)] p-6">
      <Card className="h-full gap-0 py-0">
        <CardContent className="flex h-full min-h-0 p-0">
          <div className="h-full min-h-0 flex-1 overflow-y-auto p-4">
            {!selectedMeeting ? (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <p className="text-muted-foreground text-sm">
                  No meeting selected.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void createMeeting();
                  }}
                >
                  <Plus className="size-4" />
                  New Meeting
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {draftTitle || "Untitled meeting"}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {meetingSummary || "No schedule yet."}
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void createMeeting();
                    }}
                  >
                    <Plus className="size-4" />
                    New Meeting
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <h4 className="text-sm font-semibold">Title</h4>
                    <Input
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      placeholder="Meeting title"
                    />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Scheduled For</h4>
                    <Input
                      type="datetime-local"
                      value={draftScheduledFor}
                      onChange={(event) =>
                        setDraftScheduledFor(event.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Location</h4>
                    <Input
                      value={draftLocation}
                      onChange={(event) => setDraftLocation(event.target.value)}
                      placeholder="Office / Video link"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="border-l bg-muted/10 h-full w-80 shrink-0 space-y-5 overflow-y-auto p-4">
            <div>
              <h3 className="text-base font-semibold">Properties</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Links, tags, and related records for this meeting.
              </p>
            </div>

            {!selectedMeeting ? (
              <p className="text-muted-foreground text-sm">
                Select a meeting to edit its properties.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Tags</h4>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="Add tag"
                      list="shared-tag-suggestions-meetings"
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      Add
                    </Button>
                  </div>
                  <datalist id="shared-tag-suggestions-meetings">
                    {sharedTagSuggestions.map((tag) => (
                      <option key={tag} value={tag} />
                    ))}
                  </datalist>
                  <div className="flex flex-wrap gap-2">
                    {draftTags.length === 0 ? (
                      <p className="text-muted-foreground text-xs">No tags.</p>
                    ) : (
                      draftTags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
                        >
                          {tag}
                          <button
                            type="button"
                            className="hover:text-foreground text-muted-foreground"
                            onClick={() => {
                              setDraftTags((previous) =>
                                previous.filter((value) => value !== tag),
                              );
                            }}
                            aria-label={`Remove ${tag} tag`}
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <PropertyLinkPicker
                  title="People"
                  options={peopleOptions}
                  selectedIds={draftPersonIds}
                  onAdd={(id) => {
                    setDraftPersonIds((prev) => addUnique(prev, id));
                  }}
                  onRemove={(id) => {
                    setDraftPersonIds((prev) =>
                      prev.filter((value) => value !== id),
                    );
                  }}
                  onCreateOption={createQuickPerson}
                />

                <PropertyLinkPicker
                  title="Companies"
                  options={companyOptions}
                  selectedIds={draftCompanyIds}
                  onAdd={(id) => {
                    setDraftCompanyIds((prev) => addUnique(prev, id));
                  }}
                  onRemove={(id) => {
                    setDraftCompanyIds((prev) =>
                      prev.filter((value) => value !== id),
                    );
                  }}
                  onCreateOption={createQuickCompany}
                />

                <PropertyLinkPicker
                  title="Projects"
                  options={projectOptions}
                  selectedIds={draftProjectIds}
                  onAdd={(id) => {
                    setDraftProjectIds((prev) => addUnique(prev, id));
                  }}
                  onRemove={(id) => {
                    setDraftProjectIds((prev) =>
                      prev.filter((value) => value !== id),
                    );
                  }}
                  onCreateOption={createQuickProject}
                />

                <PropertyLinkPicker
                  title="Notes"
                  options={noteOptions}
                  selectedIds={draftNoteIds}
                  onAdd={(id) => {
                    setDraftNoteIds((prev) => addUnique(prev, id));
                  }}
                  onRemove={(id) => {
                    setDraftNoteIds((prev) =>
                      prev.filter((value) => value !== id),
                    );
                  }}
                  onCreateOption={createQuickNote}
                />

                <PropertyLinkPicker
                  title="Tasks"
                  options={taskOptions}
                  selectedIds={draftTaskIds}
                  onAdd={(id) => {
                    setDraftTaskIds((prev) => addUnique(prev, id));
                  }}
                  onRemove={(id) => {
                    setDraftTaskIds((prev) =>
                      prev.filter((value) => value !== id),
                    );
                  }}
                  onCreateOption={createQuickTask}
                />
              </>
            )}
          </aside>
        </CardContent>
      </Card>
    </section>
  );
}
