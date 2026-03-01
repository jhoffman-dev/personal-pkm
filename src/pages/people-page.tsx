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
import { uploadEntityImageForUser } from "@/lib/entity-images-storage";
import { firebaseAuth } from "@/lib/firebase";
import {
  dataActions,
  dataThunks,
  useAppDispatch,
  useAppSelector,
} from "@/store";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function formatPersonName(lastName?: string, firstName?: string): string {
  return `${lastName ?? ""}, ${firstName ?? ""}`
    .replace(/^\s*,\s*|\s*,\s*$/g, "")
    .trim();
}

export function PeoplePage() {
  const dispatch = useAppDispatch();
  const peopleState = useAppSelector((state) => state.people);
  const companiesState = useAppSelector((state) => state.companies);
  const projectsState = useAppSelector((state) => state.projects);
  const notesState = useAppSelector((state) => state.notes);
  const tasksState = useAppSelector((state) => state.tasks);
  const meetingsState = useAppSelector((state) => state.meetings);

  const [draftFirstName, setDraftFirstName] = useState("");
  const [draftLastName, setDraftLastName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [draftAddress, setDraftAddress] = useState("");
  const [draftPhotoUrl, setDraftPhotoUrl] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [draftCompanyIds, setDraftCompanyIds] = useState<string[]>([]);
  const [draftProjectIds, setDraftProjectIds] = useState<string[]>([]);
  const [draftNoteIds, setDraftNoteIds] = useState<string[]>([]);
  const [draftTaskIds, setDraftTaskIds] = useState<string[]>([]);
  const [draftMeetingIds, setDraftMeetingIds] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const hydratedPersonIdRef = useRef<string | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    createQuickCompany,
    createQuickMeeting,
    createQuickNote,
    createQuickPerson,
    createQuickProject,
    createQuickTask,
  } = useEntityQuickCreate();

  useEffect(() => {
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

  const sortedPeople = useMemo(
    () =>
      peopleState.ids
        .map((id) => peopleState.entities[id])
        .filter(Boolean)
        .sort((a, b) => {
          const byLastName = (a.lastName ?? "").localeCompare(
            b.lastName ?? "",
            undefined,
            {
              sensitivity: "base",
            },
          );

          if (byLastName !== 0) {
            return byLastName;
          }

          return (a.firstName ?? "").localeCompare(
            b.firstName ?? "",
            undefined,
            {
              sensitivity: "base",
            },
          );
        }),
    [peopleState.entities, peopleState.ids],
  );

  useEffect(() => {
    if (peopleState.status !== "succeeded") {
      return;
    }

    const selectedId = peopleState.selectedId;
    if (selectedId && peopleState.entities[selectedId]) {
      return;
    }

    dispatch(dataActions.people.setSelectedId(sortedPeople[0]?.id ?? null));
  }, [
    dispatch,
    peopleState.entities,
    peopleState.selectedId,
    peopleState.status,
    sortedPeople,
  ]);

  const selectedPerson = peopleState.selectedId
    ? peopleState.entities[peopleState.selectedId]
    : null;

  useEffect(() => {
    if (selectedPerson?.id === hydratedPersonIdRef.current) {
      return;
    }

    if (!selectedPerson) {
      hydratedPersonIdRef.current = null;
      setDraftFirstName("");
      setDraftLastName("");
      setDraftEmail("");
      setDraftPhone("");
      setDraftAddress("");
      setDraftPhotoUrl("");
      setDraftTags([]);
      setDraftCompanyIds([]);
      setDraftProjectIds([]);
      setDraftNoteIds([]);
      setDraftTaskIds([]);
      setDraftMeetingIds([]);
      return;
    }

    hydratedPersonIdRef.current = selectedPerson.id;

    setDraftFirstName(selectedPerson.firstName ?? "");
    setDraftLastName(selectedPerson.lastName ?? "");
    setDraftEmail(selectedPerson.email ?? "");
    setDraftPhone(selectedPerson.phone ?? "");
    setDraftAddress(selectedPerson.address ?? "");
    setDraftPhotoUrl(selectedPerson.photoUrl ?? "");
    setDraftTags(selectedPerson.tags ?? []);
    setDraftCompanyIds(selectedPerson.companyIds ?? []);
    setDraftProjectIds(selectedPerson.projectIds ?? []);
    setDraftNoteIds(selectedPerson.noteIds ?? []);
    setDraftTaskIds(selectedPerson.taskIds ?? []);
    setDraftMeetingIds(selectedPerson.meetingIds ?? []);
  }, [selectedPerson, selectedPerson?.id]);

  useEffect(() => {
    if (!selectedPerson) {
      return;
    }

    const nextFirstName = draftFirstName.trim() || "New";
    const nextLastName = draftLastName.trim() || "Person";
    const firstNameChanged = nextFirstName !== (selectedPerson.firstName ?? "");
    const lastNameChanged = nextLastName !== (selectedPerson.lastName ?? "");
    const emailChanged = draftEmail !== (selectedPerson.email ?? "");
    const phoneChanged = draftPhone !== (selectedPerson.phone ?? "");
    const addressChanged = draftAddress !== (selectedPerson.address ?? "");
    const photoUrlChanged = draftPhotoUrl !== (selectedPerson.photoUrl ?? "");
    const tagsChanged = !equalSet(draftTags, selectedPerson.tags ?? []);
    const companiesChanged = !equalSet(
      draftCompanyIds,
      selectedPerson.companyIds ?? [],
    );
    const projectsChanged = !equalSet(
      draftProjectIds,
      selectedPerson.projectIds ?? [],
    );
    const notesChanged = !equalSet(draftNoteIds, selectedPerson.noteIds ?? []);
    const tasksChanged = !equalSet(draftTaskIds, selectedPerson.taskIds ?? []);
    const meetingsChanged = !equalSet(
      draftMeetingIds,
      selectedPerson.meetingIds ?? [],
    );

    if (
      !firstNameChanged &&
      !lastNameChanged &&
      !emailChanged &&
      !phoneChanged &&
      !addressChanged &&
      !photoUrlChanged &&
      !tagsChanged &&
      !companiesChanged &&
      !projectsChanged &&
      !notesChanged &&
      !tasksChanged &&
      !meetingsChanged
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void dispatch(
        dataThunks.people.updateOne({
          id: selectedPerson.id,
          input: {
            firstName: nextFirstName,
            lastName: nextLastName,
            email: draftEmail,
            phone: draftPhone,
            address: draftAddress,
            photoUrl: draftPhotoUrl,
            tags: draftTags,
            companyIds: draftCompanyIds,
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
    draftCompanyIds,
    draftEmail,
    draftFirstName,
    draftLastName,
    draftMeetingIds,
    draftNoteIds,
    draftPhotoUrl,
    draftPhone,
    draftProjectIds,
    draftTags,
    draftTaskIds,
    selectedPerson,
  ]);

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

  const createPerson = async () => {
    const createdId = await createQuickPerson("New Person");
    dispatch(dataActions.people.setSelectedId(createdId));
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

  const selectedPersonName = selectedPerson
    ? formatPersonName(selectedPerson.lastName, selectedPerson.firstName) ||
      "Unnamed person"
    : null;

  const uploadPhotoFile = async (file: File) => {
    if (!selectedPerson) {
      return;
    }

    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) {
      window.alert("Sign in is required to upload photos.");
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const downloadUrl = await uploadEntityImageForUser({
        userId,
        entityCollection: "people",
        entityId: selectedPerson.id,
        file,
      });

      setDraftPhotoUrl(downloadUrl);
    } catch {
      window.alert("Unable to upload photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <section className="h-[calc(100svh-41px)] p-6">
      <Card className="h-full gap-0 py-0">
        <CardContent className="flex h-full min-h-0 p-0">
          <div className="h-full min-h-0 flex-1 overflow-y-auto p-4">
            {!selectedPerson ? (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <p className="text-muted-foreground text-sm">
                  No person selected.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void createPerson();
                  }}
                >
                  <Plus className="size-4" />
                  New Person
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {selectedPersonName}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {draftEmail || "No email yet."}
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void createPerson();
                    }}
                  >
                    <Plus className="size-4" />
                    New Person
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <h4 className="text-sm font-semibold">Photo</h4>
                    {draftPhotoUrl ? (
                      <img
                        src={draftPhotoUrl}
                        alt={selectedPersonName ?? "Person photo"}
                        className="h-24 w-24 rounded-md border object-cover"
                      />
                    ) : null}
                    <div
                      tabIndex={0}
                      onDragOver={(event) => {
                        event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const droppedFile = Array.from(
                          event.dataTransfer.files,
                        ).find((file) => file.type.startsWith("image/"));

                        if (!droppedFile || isUploadingPhoto) {
                          return;
                        }

                        void uploadPhotoFile(droppedFile);
                      }}
                      onPaste={(event) => {
                        const pastedFile = Array.from(event.clipboardData.items)
                          .map((item) => item.getAsFile())
                          .find(
                            (file): file is File =>
                              file instanceof File &&
                              file.type.startsWith("image/"),
                          );

                        if (!pastedFile || isUploadingPhoto) {
                          return;
                        }

                        event.preventDefault();
                        void uploadPhotoFile(pastedFile);
                      }}
                      className="border-input bg-background rounded-md border border-dashed p-3 text-sm"
                    >
                      <p className="text-muted-foreground text-xs">
                        Drag & drop or paste an image here.
                      </p>

                      <div className="mt-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isUploadingPhoto}
                          onClick={() => {
                            photoFileInputRef.current?.click();
                          }}
                        >
                          Pick image
                        </Button>
                      </div>

                      <input
                        ref={photoFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file || isUploadingPhoto) {
                            event.currentTarget.value = "";
                            return;
                          }

                          void uploadPhotoFile(file);
                          event.currentTarget.value = "";
                        }}
                      />
                    </div>

                    {isUploadingPhoto ? (
                      <p className="text-muted-foreground text-xs">
                        Uploading photo...
                      </p>
                    ) : null}
                    {draftPhotoUrl ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDraftPhotoUrl("")}
                      >
                        Clear photo
                      </Button>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">First Name</h4>
                    <Input
                      value={draftFirstName}
                      onChange={(event) =>
                        setDraftFirstName(event.target.value)
                      }
                      placeholder="First name"
                    />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Last Name</h4>
                    <Input
                      value={draftLastName}
                      onChange={(event) => setDraftLastName(event.target.value)}
                      placeholder="Last name"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <h4 className="text-sm font-semibold">Display</h4>
                    <p className="text-sm font-medium">
                      {selectedPersonName || "Unnamed person"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Email</h4>
                    <Input
                      type="email"
                      value={draftEmail}
                      onChange={(event) => setDraftEmail(event.target.value)}
                      placeholder="person@example.com"
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
                </div>
              </div>
            )}
          </div>

          <aside className="border-l bg-muted/10 h-full w-80 shrink-0 space-y-5 overflow-y-auto p-4">
            <div>
              <h3 className="text-base font-semibold">Properties</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Links, tags, and related records for this person.
              </p>
            </div>

            {!selectedPerson ? (
              <p className="text-muted-foreground text-sm">
                Select a person to edit its properties.
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
                      list="shared-tag-suggestions-people"
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      Add
                    </Button>
                  </div>
                  <datalist id="shared-tag-suggestions-people">
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
