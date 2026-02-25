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

export function CompaniesPage() {
  const dispatch = useAppDispatch();
  const companiesState = useAppSelector((state) => state.companies);
  const peopleState = useAppSelector((state) => state.people);
  const projectsState = useAppSelector((state) => state.projects);
  const notesState = useAppSelector((state) => state.notes);
  const tasksState = useAppSelector((state) => state.tasks);
  const meetingsState = useAppSelector((state) => state.meetings);

  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [draftAddress, setDraftAddress] = useState("");
  const [draftWebsite, setDraftWebsite] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [draftPersonIds, setDraftPersonIds] = useState<string[]>([]);
  const [draftProjectIds, setDraftProjectIds] = useState<string[]>([]);
  const [draftNoteIds, setDraftNoteIds] = useState<string[]>([]);
  const [draftTaskIds, setDraftTaskIds] = useState<string[]>([]);
  const [draftMeetingIds, setDraftMeetingIds] = useState<string[]>([]);
  const {
    createQuickCompany,
    createQuickMeeting,
    createQuickNote,
    createQuickPerson,
    createQuickProject,
    createQuickTask,
  } = useEntityQuickCreate();

  useEffect(() => {
    if (companiesState.status === "idle") {
      void dispatch(dataThunks.companies.fetchAll());
    }
    if (peopleState.status === "idle") {
      void dispatch(dataThunks.people.fetchAll());
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
    if (meetingsState.status === "idle") {
      void dispatch(dataThunks.meetings.fetchAll());
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

  const sortedCompanies = useMemo(
    () =>
      companiesState.ids
        .map((id) => companiesState.entities[id])
        .filter(Boolean)
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, {
            sensitivity: "base",
          }),
        ),
    [companiesState.entities, companiesState.ids],
  );

  useEffect(() => {
    if (companiesState.status !== "succeeded") {
      return;
    }

    const selectedId = companiesState.selectedId;
    if (selectedId && companiesState.entities[selectedId]) {
      return;
    }

    dispatch(
      dataActions.companies.setSelectedId(sortedCompanies[0]?.id ?? null),
    );
  }, [
    companiesState.entities,
    companiesState.selectedId,
    companiesState.status,
    dispatch,
    sortedCompanies,
  ]);

  const selectedCompany = companiesState.selectedId
    ? companiesState.entities[companiesState.selectedId]
    : null;

  useEffect(() => {
    if (!selectedCompany) {
      setDraftName("");
      setDraftEmail("");
      setDraftPhone("");
      setDraftAddress("");
      setDraftWebsite("");
      setDraftTags([]);
      setDraftPersonIds([]);
      setDraftProjectIds([]);
      setDraftNoteIds([]);
      setDraftTaskIds([]);
      setDraftMeetingIds([]);
      return;
    }

    setDraftName(selectedCompany.name);
    setDraftEmail(selectedCompany.email ?? "");
    setDraftPhone(selectedCompany.phone ?? "");
    setDraftAddress(selectedCompany.address ?? "");
    setDraftWebsite(selectedCompany.website ?? "");
    setDraftTags(selectedCompany.tags ?? []);
    setDraftPersonIds(selectedCompany.personIds ?? []);
    setDraftProjectIds(selectedCompany.projectIds ?? []);
    setDraftNoteIds(selectedCompany.noteIds ?? []);
    setDraftTaskIds(selectedCompany.taskIds ?? []);
    setDraftMeetingIds(selectedCompany.meetingIds ?? []);
  }, [selectedCompany?.id]);

  useEffect(() => {
    if (!selectedCompany) {
      return;
    }

    const nextName = draftName.trim() || "Untitled company";
    const nameChanged = nextName !== selectedCompany.name;
    const emailChanged = draftEmail !== (selectedCompany.email ?? "");
    const phoneChanged = draftPhone !== (selectedCompany.phone ?? "");
    const addressChanged = draftAddress !== (selectedCompany.address ?? "");
    const websiteChanged = draftWebsite !== (selectedCompany.website ?? "");
    const tagsChanged = !equalSet(draftTags, selectedCompany.tags ?? []);
    const peopleChanged = !equalSet(
      draftPersonIds,
      selectedCompany.personIds ?? [],
    );
    const projectsChanged = !equalSet(
      draftProjectIds,
      selectedCompany.projectIds ?? [],
    );
    const notesChanged = !equalSet(draftNoteIds, selectedCompany.noteIds ?? []);
    const tasksChanged = !equalSet(draftTaskIds, selectedCompany.taskIds ?? []);
    const meetingsChanged = !equalSet(
      draftMeetingIds,
      selectedCompany.meetingIds ?? [],
    );

    if (
      !nameChanged &&
      !emailChanged &&
      !phoneChanged &&
      !addressChanged &&
      !websiteChanged &&
      !tagsChanged &&
      !peopleChanged &&
      !projectsChanged &&
      !notesChanged &&
      !tasksChanged &&
      !meetingsChanged
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void dispatch(
        dataThunks.companies.updateOne({
          id: selectedCompany.id,
          input: {
            name: nextName,
            email: draftEmail,
            phone: draftPhone,
            address: draftAddress,
            website: draftWebsite,
            tags: draftTags,
            personIds: draftPersonIds,
            projectIds: draftProjectIds,
            noteIds: draftNoteIds,
            taskIds: draftTaskIds,
            meetingIds: draftMeetingIds,
          },
        }),
      );
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [
    dispatch,
    draftAddress,
    draftEmail,
    draftMeetingIds,
    draftName,
    draftNoteIds,
    draftPersonIds,
    draftPhone,
    draftProjectIds,
    draftTags,
    draftTaskIds,
    draftWebsite,
    selectedCompany,
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

  const meetingOptions = useMemo<PropertyOption[]>(
    () =>
      meetingsState.ids
        .map((id) => meetingsState.entities[id])
        .filter(Boolean)
        .map((meeting) => ({ id: meeting.id, label: meeting.title })),
    [meetingsState.entities, meetingsState.ids],
  );

  const sharedTagSuggestions = useSharedTagSuggestions({
    projectsState,
    tasksState,
    notesState,
    meetingsState,
    companiesState,
    peopleState,
  });

  const createCompany = async () => {
    const createdId = await createQuickCompany("New Company");
    dispatch(dataActions.companies.setSelectedId(createdId));
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

  return (
    <section className="h-[calc(100svh-41px)] p-6">
      <Card className="h-full gap-0 py-0">
        <CardContent className="flex h-full min-h-0 p-0">
          <div className="h-full min-h-0 flex-1 overflow-y-auto p-4">
            {!selectedCompany ? (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <p className="text-muted-foreground text-sm">
                  No company selected.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void createCompany();
                  }}
                >
                  <Plus className="size-4" />
                  New Company
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {draftName || "Untitled company"}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {draftWebsite || "No company website yet."}
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void createCompany();
                    }}
                  >
                    <Plus className="size-4" />
                    New Company
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <h4 className="text-sm font-semibold">Name</h4>
                    <Input
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      placeholder="Company name"
                    />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Email</h4>
                    <Input
                      type="email"
                      value={draftEmail}
                      onChange={(event) => setDraftEmail(event.target.value)}
                      placeholder="contact@company.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Phone</h4>
                    <Input
                      value={draftPhone}
                      onChange={(event) => setDraftPhone(event.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <h4 className="text-sm font-semibold">Address</h4>
                    <Input
                      value={draftAddress}
                      onChange={(event) => setDraftAddress(event.target.value)}
                      placeholder="123 Main St, City, State"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <h4 className="text-sm font-semibold">Website</h4>
                    <Input
                      value={draftWebsite}
                      onChange={(event) => setDraftWebsite(event.target.value)}
                      placeholder="https://example.com"
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
                Links, tags, and related records for this company.
              </p>
            </div>

            {!selectedCompany ? (
              <p className="text-muted-foreground text-sm">
                Select a company to edit its properties.
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
                      list="shared-tag-suggestions-companies"
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      Add
                    </Button>
                  </div>
                  <datalist id="shared-tag-suggestions-companies">
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

                <PropertyLinkPicker
                  title="Meetings"
                  options={meetingOptions}
                  selectedIds={draftMeetingIds}
                  onAdd={(id) => {
                    setDraftMeetingIds((prev) => addUnique(prev, id));
                  }}
                  onRemove={(id) => {
                    setDraftMeetingIds((prev) =>
                      prev.filter((value) => value !== id),
                    );
                  }}
                  onCreateOption={createQuickMeeting}
                />
              </>
            )}
          </aside>
        </CardContent>
      </Card>
    </section>
  );
}
