import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import {
  PropertyLinkPicker,
  type PropertyOption,
} from "@/components/property-link-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createEmptyNoteInput,
  DEFAULT_NOTE_BODY,
  DEFAULT_NOTE_TITLE,
} from "@/lib/note-defaults";
import { normalizeParaType } from "@/lib/project-defaults";
import { createEmptyProjectInput } from "@/lib/project-defaults";
import { createEmptyTaskInput } from "@/lib/task-defaults";
import {
  dataActions,
  dataThunks,
  notesTabsActions,
  useAppDispatch,
  useAppSelector,
} from "@/store";
import { Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

type LinkOption = {
  id: string;
  label: string;
};

function addUnique(values: string[], id: string): string[] {
  return values.includes(id) ? values : [...values, id];
}

function equalSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const setA = new Set(a);
  if (setA.size !== new Set(b).size) {
    return false;
  }

  for (const value of b) {
    if (!setA.has(value)) {
      return false;
    }
  }

  return true;
}

function getTagColorStyle(tag: string): CSSProperties {
  let hash = 0;
  for (let index = 0; index < tag.length; index += 1) {
    hash = (hash * 31 + tag.charCodeAt(index)) >>> 0;
  }

  const hue = hash % 360;

  return {
    backgroundColor: `hsl(${hue} 82% 90%)`,
    borderColor: `hsl(${hue} 52% 72%)`,
    color: `hsl(${hue} 42% 24%)`,
  };
}

export function NotesPage() {
  const dispatch = useAppDispatch();
  const notesState = useAppSelector((state) => state.notes);
  const notesTabsState = useAppSelector((state) => state.notesTabs);
  const projectsState = useAppSelector((state) => state.projects);
  const tasksState = useAppSelector((state) => state.tasks);
  const meetingsState = useAppSelector((state) => state.meetings);
  const companiesState = useAppSelector((state) => state.companies);
  const peopleState = useAppSelector((state) => state.people);

  const sortedNotes = useMemo(
    () =>
      notesState.ids
        .map((id) => notesState.entities[id])
        .filter(Boolean)
        .sort((a, b) => {
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        }),
    [notesState.entities, notesState.ids],
  );

  const selectedNote = notesTabsState.activeTabId
    ? notesState.entities[notesTabsState.activeTabId]
    : null;

  const openTabs = useMemo(
    () =>
      notesTabsState.openTabIds
        .map((id) => notesState.entities[id])
        .filter(Boolean),
    [notesState.entities, notesTabsState.openTabIds],
  );

  const [draftBody, setDraftBody] = useState(DEFAULT_NOTE_BODY);
  const [draftTitle, setDraftTitle] = useState(DEFAULT_NOTE_TITLE);
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [draftRelatedNoteIds, setDraftRelatedNoteIds] = useState<string[]>([]);
  const [draftPersonIds, setDraftPersonIds] = useState<string[]>([]);
  const [draftCompanyIds, setDraftCompanyIds] = useState<string[]>([]);
  const [draftProjectIds, setDraftProjectIds] = useState<string[]>([]);
  const [draftTaskIds, setDraftTaskIds] = useState<string[]>([]);
  const [draftMeetingIds, setDraftMeetingIds] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isDeletingNotes, setIsDeletingNotes] = useState(false);

  const notesWithSameTitleCount = useMemo(() => {
    if (!selectedNote) {
      return 0;
    }

    return sortedNotes.filter((note) => note.title === selectedNote.title)
      .length;
  }, [selectedNote, sortedNotes]);

  const peopleOptions = useMemo<PropertyOption[]>(
    () =>
      peopleState.ids
        .map((id) => peopleState.entities[id])
        .filter(Boolean)
        .map((person) => ({
          id: person.id,
          label: `${person.firstName} ${person.lastName}`.trim(),
        })),
    [peopleState.entities, peopleState.ids],
  );

  const companyOptions = useMemo<PropertyOption[]>(
    () =>
      companiesState.ids
        .map((id) => companiesState.entities[id])
        .filter(Boolean)
        .map((company) => ({
          id: company.id,
          label: company.name,
        })),
    [companiesState.entities, companiesState.ids],
  );

  const projectOptions = useMemo<PropertyOption[]>(
    () =>
      projectsState.ids
        .map((id) => projectsState.entities[id])
        .filter(Boolean)
        .filter((project) => normalizeParaType(project.paraType) !== "archive")
        .map((project) => ({
          id: project.id,
          label: project.name,
        })),
    [projectsState.entities, projectsState.ids],
  );

  const taskOptions = useMemo<PropertyOption[]>(
    () =>
      tasksState.ids
        .map((id) => tasksState.entities[id])
        .filter(Boolean)
        .map((task) => ({
          id: task.id,
          label: task.title,
        })),
    [tasksState.entities, tasksState.ids],
  );

  const meetingOptions = useMemo<PropertyOption[]>(
    () =>
      meetingsState.ids
        .map((id) => meetingsState.entities[id])
        .filter(Boolean)
        .map((meeting) => ({
          id: meeting.id,
          label: meeting.title,
        })),
    [meetingsState.entities, meetingsState.ids],
  );

  const relatedNoteOptions = useMemo<PropertyOption[]>(
    () =>
      sortedNotes
        .filter((note) => note.id !== selectedNote?.id)
        .map((note) => ({
          id: note.id,
          label: note.title || DEFAULT_NOTE_TITLE,
        })),
    [selectedNote?.id, sortedNotes],
  );

  const sharedTagSuggestions = useMemo(() => {
    const values = new Set<string>();

    sortedNotes.forEach((note) => {
      (note.tags ?? []).forEach((tag) => {
        if (tag.trim()) {
          values.add(tag.trim());
        }
      });
    });

    projectsState.ids
      .map((id) => projectsState.entities[id])
      .filter(Boolean)
      .forEach((project) => {
        (project.tags ?? []).forEach((tag) => {
          if (tag.trim()) {
            values.add(tag.trim());
          }
        });
      });

    tasksState.ids
      .map((id) => tasksState.entities[id])
      .filter(Boolean)
      .forEach((task) => {
        (task.tags ?? []).forEach((tag) => {
          if (tag.trim()) {
            values.add(tag.trim());
          }
        });
      });

    meetingsState.ids
      .map((id) => meetingsState.entities[id])
      .filter(Boolean)
      .forEach((meeting) => {
        (meeting.tags ?? []).forEach((tag) => {
          if (tag.trim()) {
            values.add(tag.trim());
          }
        });
      });

    companiesState.ids
      .map((id) => companiesState.entities[id])
      .filter(Boolean)
      .forEach((company) => {
        (company.tags ?? []).forEach((tag) => {
          if (tag.trim()) {
            values.add(tag.trim());
          }
        });
      });

    peopleState.ids
      .map((id) => peopleState.entities[id])
      .filter(Boolean)
      .forEach((person) => {
        (person.tags ?? []).forEach((tag) => {
          if (tag.trim()) {
            values.add(tag.trim());
          }
        });
      });

    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [
    companiesState.entities,
    companiesState.ids,
    meetingsState.entities,
    meetingsState.ids,
    peopleState.entities,
    peopleState.ids,
    projectsState.entities,
    projectsState.ids,
    sortedNotes,
    tasksState.entities,
    tasksState.ids,
  ]);

  const backlinks = useMemo(() => {
    if (!selectedNote) {
      return {
        notes: [] as LinkOption[],
        projects: [] as LinkOption[],
        tasks: [] as LinkOption[],
        meetings: [] as LinkOption[],
        companies: [] as LinkOption[],
        people: [] as LinkOption[],
      };
    }

    const selectedId = selectedNote.id;
    const noteBacklinks = sortedNotes
      .filter(
        (note) =>
          note.id !== selectedId &&
          (note.relatedNoteIds ?? []).includes(selectedId),
      )
      .map((note) => ({
        id: note.id,
        label: note.title || DEFAULT_NOTE_TITLE,
      }));

    const projectBacklinks = projectsState.ids
      .map((id) => projectsState.entities[id])
      .filter(Boolean)
      .filter((project) => project.noteIds.includes(selectedId))
      .map((project) => ({ id: project.id, label: project.name }));

    const taskBacklinks = tasksState.ids
      .map((id) => tasksState.entities[id])
      .filter(Boolean)
      .filter((task) => task.noteIds.includes(selectedId))
      .map((task) => ({ id: task.id, label: task.title }));

    const meetingBacklinks = meetingsState.ids
      .map((id) => meetingsState.entities[id])
      .filter(Boolean)
      .filter((meeting) => meeting.noteIds.includes(selectedId))
      .map((meeting) => ({ id: meeting.id, label: meeting.title }));

    const companyBacklinks = companiesState.ids
      .map((id) => companiesState.entities[id])
      .filter(Boolean)
      .filter((company) => company.noteIds.includes(selectedId))
      .map((company) => ({ id: company.id, label: company.name }));

    const peopleBacklinks = peopleState.ids
      .map((id) => peopleState.entities[id])
      .filter(Boolean)
      .filter((person) => person.noteIds.includes(selectedId))
      .map((person) => ({
        id: person.id,
        label: `${person.firstName} ${person.lastName}`.trim(),
      }));

    return {
      notes: noteBacklinks,
      projects: projectBacklinks,
      tasks: taskBacklinks,
      meetings: meetingBacklinks,
      companies: companyBacklinks,
      people: peopleBacklinks,
    };
  }, [
    selectedNote,
    sortedNotes,
    projectsState.entities,
    projectsState.ids,
    tasksState.entities,
    tasksState.ids,
    meetingsState.entities,
    meetingsState.ids,
    companiesState.entities,
    companiesState.ids,
    peopleState.entities,
    peopleState.ids,
  ]);

  useEffect(() => {
    if (notesState.status === "idle") {
      void dispatch(dataThunks.notes.fetchAll());
    }
  }, [dispatch, notesState.status]);

  useEffect(() => {
    if (projectsState.status === "idle") {
      void dispatch(dataThunks.projects.fetchAll());
    }
    if (tasksState.status === "idle") {
      void dispatch(dataThunks.tasks.fetchAll());
    }
    if (meetingsState.status === "idle") {
      void dispatch(dataThunks.meetings.fetchAll());
    }
    if (companiesState.status === "idle") {
      void dispatch(dataThunks.companies.fetchAll());
    }
    if (peopleState.status === "idle") {
      void dispatch(dataThunks.people.fetchAll());
    }
  }, [
    companiesState.status,
    dispatch,
    meetingsState.status,
    peopleState.status,
    projectsState.status,
    tasksState.status,
  ]);

  useEffect(() => {
    if (notesState.status !== "succeeded") {
      return;
    }

    const validIdSet = new Set(notesState.ids);
    const nextOpenTabs = notesTabsState.openTabIds.filter((id) =>
      validIdSet.has(id),
    );

    if (nextOpenTabs.length !== notesTabsState.openTabIds.length) {
      dispatch(notesTabsActions.setOpenTabs(nextOpenTabs));
      return;
    }

    if (
      notesTabsState.activeTabId &&
      !validIdSet.has(notesTabsState.activeTabId)
    ) {
      dispatch(notesTabsActions.setActiveTab(nextOpenTabs[0] ?? null));
      return;
    }

    if (!notesTabsState.activeTabId && sortedNotes.length > 0) {
      const fallbackId = nextOpenTabs[0] ?? sortedNotes[0].id;
      dispatch(
        notesTabsActions.openNoteTab({ id: fallbackId, activate: true }),
      );
    }
  }, [
    dispatch,
    notesState.ids,
    notesState.status,
    notesTabsState.activeTabId,
    notesTabsState.openTabIds,
    sortedNotes,
  ]);

  useEffect(() => {
    if (notesTabsState.activeTabId !== notesState.selectedId) {
      dispatch(dataActions.notes.setSelectedId(notesTabsState.activeTabId));
    }
  }, [dispatch, notesState.selectedId, notesTabsState.activeTabId]);

  useEffect(() => {
    if (!selectedNote) {
      setDraftBody(DEFAULT_NOTE_BODY);
      setDraftTitle(DEFAULT_NOTE_TITLE);
      setDraftTags([]);
      setDraftRelatedNoteIds([]);
      setDraftPersonIds([]);
      setDraftCompanyIds([]);
      setDraftProjectIds([]);
      setDraftTaskIds([]);
      setDraftMeetingIds([]);
      return;
    }

    setDraftBody(selectedNote.body);
    setDraftTitle(selectedNote.title || DEFAULT_NOTE_TITLE);
    setDraftTags(selectedNote.tags ?? []);
    setDraftRelatedNoteIds(selectedNote.relatedNoteIds ?? []);
    setDraftPersonIds(selectedNote.personIds ?? []);
    setDraftCompanyIds(selectedNote.companyIds ?? []);
    setDraftProjectIds(selectedNote.projectIds ?? []);
    setDraftTaskIds(selectedNote.taskIds ?? []);
    setDraftMeetingIds(selectedNote.meetingIds ?? []);
  }, [selectedNote?.id]);

  useEffect(() => {
    if (!selectedNote) {
      return;
    }

    const titleChanged = draftTitle !== selectedNote.title;
    const bodyChanged = draftBody !== selectedNote.body;
    const tagsChanged = !equalSet(draftTags, selectedNote.tags ?? []);
    const relatedNotesChanged = !equalSet(
      draftRelatedNoteIds,
      selectedNote.relatedNoteIds ?? [],
    );
    const peopleChanged = !equalSet(
      draftPersonIds,
      selectedNote.personIds ?? [],
    );
    const companiesChanged = !equalSet(
      draftCompanyIds,
      selectedNote.companyIds ?? [],
    );
    const projectsChanged = !equalSet(
      draftProjectIds,
      selectedNote.projectIds ?? [],
    );
    const tasksChanged = !equalSet(draftTaskIds, selectedNote.taskIds ?? []);
    const meetingsChanged = !equalSet(
      draftMeetingIds,
      selectedNote.meetingIds ?? [],
    );

    if (
      !titleChanged &&
      !bodyChanged &&
      !tagsChanged &&
      !relatedNotesChanged &&
      !peopleChanged &&
      !companiesChanged &&
      !projectsChanged &&
      !tasksChanged &&
      !meetingsChanged
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void dispatch(
        dataThunks.notes.updateOne({
          id: selectedNote.id,
          input: {
            title: draftTitle,
            body: draftBody,
            tags: draftTags,
            relatedNoteIds: draftRelatedNoteIds,
            personIds: draftPersonIds,
            companyIds: draftCompanyIds,
            projectIds: draftProjectIds,
            taskIds: draftTaskIds,
            meetingIds: draftMeetingIds,
          },
        }),
      );
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [
    dispatch,
    draftBody,
    draftCompanyIds,
    draftMeetingIds,
    draftPersonIds,
    draftProjectIds,
    draftRelatedNoteIds,
    draftTags,
    draftTaskIds,
    draftTitle,
    selectedNote,
  ]);

  const addTag = () => {
    const value = tagInput.trim();
    if (!value) {
      return;
    }

    const exists = draftTags.some(
      (tag) => tag.toLowerCase() === value.toLowerCase(),
    );
    if (!exists) {
      setDraftTags((prev) => [...prev, value]);
    }
    setTagInput("");
  };

  const deleteCurrentNote = async () => {
    if (!selectedNote || isDeletingNotes) {
      return;
    }

    const confirmed = window.confirm(
      `Delete note "${selectedNote.title || DEFAULT_NOTE_TITLE}"?`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingNotes(true);
    try {
      await dispatch(dataThunks.notes.deleteOne(selectedNote.id)).unwrap();
    } finally {
      setIsDeletingNotes(false);
    }
  };

  const deleteNotesWithSameTitle = async () => {
    if (!selectedNote || isDeletingNotes) {
      return;
    }

    const matchingIds = sortedNotes
      .filter((note) => note.title === selectedNote.title)
      .map((note) => note.id);

    if (matchingIds.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${matchingIds.length} note(s) titled "${selectedNote.title || DEFAULT_NOTE_TITLE}"?`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingNotes(true);
    try {
      await Promise.all(
        matchingIds.map((id) =>
          dispatch(dataThunks.notes.deleteOne(id)).unwrap(),
        ),
      );
    } finally {
      setIsDeletingNotes(false);
    }
  };

  const createQuickNote = async (label: string) => {
    const title = label.trim() || DEFAULT_NOTE_TITLE;
    const created = await dispatch(
      dataThunks.notes.createOne({
        ...createEmptyNoteInput(),
        title,
        body: `<h1>${title}</h1><p></p>`,
      }),
    ).unwrap();

    return created.id;
  };

  const createQuickTask = async (label: string) => {
    const created = await dispatch(
      dataThunks.tasks.createOne(
        createEmptyTaskInput({
          title: label.trim() || "New task",
          status: "inbox",
        }),
      ),
    ).unwrap();

    return created.id;
  };

  const createQuickProject = async (label: string) => {
    const created = await dispatch(
      dataThunks.projects.createOne(
        createEmptyProjectInput({
          name: label.trim() || "New project",
          paraType: "project",
        }),
      ),
    ).unwrap();

    return created.id;
  };

  const createQuickMeeting = async (label: string) => {
    const created = await dispatch(
      dataThunks.meetings.createOne({
        title: label.trim() || "New meeting",
        tags: [],
        scheduledFor: new Date().toISOString(),
        location: "",
        personIds: [],
        companyIds: [],
        projectIds: [],
        noteIds: [],
        taskIds: [],
      }),
    ).unwrap();

    return created.id;
  };

  const createQuickCompany = async (label: string) => {
    const created = await dispatch(
      dataThunks.companies.createOne({
        name: label.trim() || "New company",
        tags: [],
        website: "",
        personIds: [],
        projectIds: [],
        noteIds: [],
        taskIds: [],
        meetingIds: [],
      }),
    ).unwrap();

    return created.id;
  };

  const createQuickPerson = async (label: string) => {
    const normalized = label.trim();
    const parts = normalized.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || "New";
    const lastName = parts.slice(1).join(" ") || "Person";

    const created = await dispatch(
      dataThunks.people.createOne({
        firstName,
        lastName,
        tags: [],
        email: "",
        companyIds: [],
        projectIds: [],
        noteIds: [],
        taskIds: [],
        meetingIds: [],
      }),
    ).unwrap();

    return created.id;
  };

  return (
    <section className="h-[calc(100svh-41px)] p-6">
      <Card className="h-full gap-0 py-0">
        <CardContent className="flex h-full min-h-0 flex-col p-0">
          <div className="bg-card flex items-center gap-1 border-b p-2">
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              {openTabs.map((note) => {
                const isActive = notesTabsState.activeTabId === note.id;
                return (
                  <div
                    key={note.id}
                    className="bg-background inline-flex items-center gap-1 rounded-md border"
                  >
                    <button
                      type="button"
                      className={`px-3 py-1.5 text-sm whitespace-nowrap ${
                        isActive ? "text-foreground" : "text-muted-foreground"
                      }`}
                      onClick={() => {
                        dispatch(notesTabsActions.setActiveTab(note.id));
                        dispatch(dataActions.notes.setSelectedId(note.id));
                      }}
                    >
                      {note.title || DEFAULT_NOTE_TITLE}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="mr-1"
                      aria-label="Close note tab"
                      onClick={() => {
                        dispatch(notesTabsActions.closeNoteTab(note.id));
                      }}
                    >
                      <X />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="ml-2 flex shrink-0 items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void deleteCurrentNote();
                }}
                disabled={!selectedNote || isDeletingNotes}
              >
                <Trash2 className="size-4" />
                Delete note
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void deleteNotesWithSameTitle();
                }}
                disabled={
                  !selectedNote ||
                  isDeletingNotes ||
                  notesWithSameTitleCount < 2
                }
              >
                <Trash2 className="size-4" />
                Delete same title ({notesWithSameTitleCount})
              </Button>
            </div>
          </div>

          <div className="flex h-full min-h-0">
            <div className="h-full min-h-0 flex-1 p-4">
              {selectedNote ? (
                <div className="flex h-full min-h-0 flex-col gap-3">
                  <Input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    placeholder="Note title"
                    className="text-base font-semibold"
                  />

                  <SimpleEditor
                    content={draftBody}
                    onContentChange={setDraftBody}
                    className="h-full"
                  />
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No note selected. Create one with the add button.
                </p>
              )}
            </div>

            <aside className="border-l bg-muted/10 h-full w-80 shrink-0 space-y-5 overflow-y-auto p-4">
              <div>
                <h3 className="text-base font-semibold">Properties</h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  Links, tags, and related records for this note.
                </p>
              </div>

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
                    list="shared-tag-suggestions-notes"
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    Add
                  </Button>
                </div>
                <datalist id="shared-tag-suggestions-notes">
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
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                        style={getTagColorStyle(tag)}
                      >
                        {tag}
                        <button
                          type="button"
                          className="hover:text-foreground text-muted-foreground"
                          onClick={() => {
                            setDraftTags((prev) =>
                              prev.filter((item) => item !== tag),
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
                title="Related notes"
                options={relatedNoteOptions}
                selectedIds={draftRelatedNoteIds}
                onAdd={(id) => {
                  setDraftRelatedNoteIds((prev) => addUnique(prev, id));
                }}
                onRemove={(id) => {
                  setDraftRelatedNoteIds((prev) =>
                    prev.filter((value) => value !== id),
                  );
                }}
                onCreateOption={createQuickNote}
                searchPlaceholder="Search notes..."
              />

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

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Backlinks</h4>
                {backlinks.notes.length === 0 &&
                backlinks.projects.length === 0 &&
                backlinks.tasks.length === 0 &&
                backlinks.meetings.length === 0 &&
                backlinks.companies.length === 0 &&
                backlinks.people.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No backlinks.</p>
                ) : (
                  <div className="space-y-3 text-sm">
                    {backlinks.notes.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">Notes</p>
                        {backlinks.notes.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="hover:bg-muted block w-full rounded-md px-2 py-1 text-left"
                            onClick={() => {
                              dispatch(
                                notesTabsActions.openNoteTab({
                                  id: item.id,
                                  activate: true,
                                }),
                              );
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {backlinks.projects.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">
                          Projects
                        </p>
                        {backlinks.projects.map((item) => (
                          <p key={item.id} className="px-2 py-1">
                            {item.label}
                          </p>
                        ))}
                      </div>
                    )}

                    {backlinks.tasks.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">Tasks</p>
                        {backlinks.tasks.map((item) => (
                          <p key={item.id} className="px-2 py-1">
                            {item.label}
                          </p>
                        ))}
                      </div>
                    )}

                    {backlinks.meetings.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">
                          Meetings
                        </p>
                        {backlinks.meetings.map((item) => (
                          <p key={item.id} className="px-2 py-1">
                            {item.label}
                          </p>
                        ))}
                      </div>
                    )}

                    {backlinks.companies.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">
                          Companies
                        </p>
                        {backlinks.companies.map((item) => (
                          <p key={item.id} className="px-2 py-1">
                            {item.label}
                          </p>
                        ))}
                      </div>
                    )}

                    {backlinks.people.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">People</p>
                        {backlinks.people.map((item) => (
                          <p key={item.id} className="px-2 py-1">
                            {item.label}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
