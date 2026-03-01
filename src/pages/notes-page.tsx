import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import {
  PropertyLinkPicker,
  type PropertyOption,
} from "@/components/property-link-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SystemCustomPropertiesPanel } from "@/components/system-custom-properties-panel";
import { DEFAULT_NOTE_BODY, DEFAULT_NOTE_TITLE } from "@/lib/note-defaults";
import { firebaseAuth } from "@/lib/firebase";
import { migrateEmbeddedNoteImagesToStorage } from "@/lib/note-images-storage";
import {
  appendUniqueTag,
  buildQuickCompanyCreateInput,
  buildQuickMeetingCreateInput,
  buildQuickNoteCreateInput,
  buildQuickPersonCreateInput,
  buildQuickProjectCreateInput,
  buildQuickTaskCreateInput,
  buildSharedTagSuggestions,
} from "@/features/tasks";
import {
  buildDeleteCurrentNotePlan,
  buildDeleteSameTitleNotesPlan,
  buildNoteBacklinks,
  buildNoteUpdateInputFromDraft,
  createNoteDraftState,
  hasNoteDraftChanges,
  reconcileNotesTabs,
  runNoteDeleteWorkflow,
} from "@/features/notes";
import { addUnique } from "@/lib/entity-link-utils";
import { normalizeParaType } from "@/lib/project-defaults";
import { enqueueNoteForLinking } from "@/lib/note-linking-queue";
import {
  buildDrawingEmbedHtml,
  convertDrawingLinksToEmbedBlocks,
} from "@/lib/drawing-links";
import { listDrawings } from "@/lib/drawings-store";
import {
  dataActions,
  dataThunks,
  notesTabsActions,
  useAppDispatch,
  useAppSelector,
} from "@/store";
import { Trash2, X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

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
  const hydratedNoteIdRef = useRef<string | null>(null);
  const migratedNoteIdsRef = useRef<Set<string>>(new Set());

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
    const projects = projectsState.ids
      .map((id) => projectsState.entities[id])
      .filter(Boolean);
    const tasks = tasksState.ids
      .map((id) => tasksState.entities[id])
      .filter(Boolean);
    const meetings = meetingsState.ids
      .map((id) => meetingsState.entities[id])
      .filter(Boolean);
    const companies = companiesState.ids
      .map((id) => companiesState.entities[id])
      .filter(Boolean);
    const people = peopleState.ids
      .map((id) => peopleState.entities[id])
      .filter(Boolean);

    return buildSharedTagSuggestions([
      sortedNotes,
      projects,
      tasks,
      meetings,
      companies,
      people,
    ]);
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

  const availableDrawings = listDrawings();

  const backlinks = useMemo(() => {
    const projects = projectsState.ids
      .map((id) => projectsState.entities[id])
      .filter(Boolean);
    const tasks = tasksState.ids
      .map((id) => tasksState.entities[id])
      .filter(Boolean);
    const meetings = meetingsState.ids
      .map((id) => meetingsState.entities[id])
      .filter(Boolean);
    const companies = companiesState.ids
      .map((id) => companiesState.entities[id])
      .filter(Boolean);
    const people = peopleState.ids
      .map((id) => peopleState.entities[id])
      .filter(Boolean);

    return buildNoteBacklinks({
      selectedNoteId: selectedNote?.id ?? null,
      notes: sortedNotes,
      projects,
      tasks,
      meetings,
      companies,
      people,
    });
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
    const reconciliation = reconcileNotesTabs({
      notesStatus: notesState.status,
      noteIds: notesState.ids,
      openTabIds: notesTabsState.openTabIds,
      activeTabId: notesTabsState.activeTabId,
      sortedNoteIds: sortedNotes.map((note) => note.id),
    });

    if (!reconciliation) {
      return;
    }

    if (reconciliation.type === "set-open-tabs") {
      dispatch(notesTabsActions.setOpenTabs(reconciliation.openTabIds));
      return;
    }

    if (reconciliation.type === "set-active-tab") {
      dispatch(notesTabsActions.setActiveTab(reconciliation.activeTabId));
      return;
    }

    if (reconciliation.type === "open-note-tab") {
      dispatch(
        notesTabsActions.openNoteTab({
          id: reconciliation.id,
          activate: reconciliation.activate,
        }),
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
    if (selectedNote?.id === hydratedNoteIdRef.current) {
      return;
    }

    const nextDraft = createNoteDraftState(selectedNote);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftBody(convertDrawingLinksToEmbedBlocks(nextDraft.body));
    setDraftTitle(nextDraft.title);
    setDraftTags(nextDraft.tags);
    setDraftRelatedNoteIds(nextDraft.relatedNoteIds);
    setDraftPersonIds(nextDraft.personIds);
    setDraftCompanyIds(nextDraft.companyIds);
    setDraftProjectIds(nextDraft.projectIds);
    setDraftTaskIds(nextDraft.taskIds);
    setDraftMeetingIds(nextDraft.meetingIds);
    hydratedNoteIdRef.current = selectedNote?.id ?? null;
  }, [selectedNote]);

  useEffect(() => {
    if (!selectedNote) {
      return;
    }

    const draft = {
      title: draftTitle,
      body: draftBody,
      tags: draftTags,
      relatedNoteIds: draftRelatedNoteIds,
      personIds: draftPersonIds,
      companyIds: draftCompanyIds,
      projectIds: draftProjectIds,
      taskIds: draftTaskIds,
      meetingIds: draftMeetingIds,
    };

    if (!hasNoteDraftChanges({ note: selectedNote, draft })) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void dispatch(
        dataThunks.notes.updateOne({
          id: selectedNote.id,
          input: buildNoteUpdateInputFromDraft(draft),
        }),
      );
      enqueueNoteForLinking(selectedNote.id);
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

  useEffect(() => {
    if (notesState.status !== "succeeded") {
      return;
    }

    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) {
      return;
    }

    const notesWithEmbeddedImages = sortedNotes.filter((note) => {
      if (migratedNoteIdsRef.current.has(note.id)) {
        return false;
      }

      return note.body.includes("data:image");
    });

    if (notesWithEmbeddedImages.length === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      for (const note of notesWithEmbeddedImages) {
        if (cancelled) {
          break;
        }

        migratedNoteIdsRef.current.add(note.id);

        try {
          const migrationResult = await migrateEmbeddedNoteImagesToStorage({
            userId,
            noteId: note.id,
            html: note.body,
          });

          if (migrationResult.migratedCount === 0) {
            continue;
          }

          await dispatch(
            dataThunks.notes.updateOne({
              id: note.id,
              input: {
                body: migrationResult.html,
              },
            }),
          ).unwrap();

          if (selectedNote?.id === note.id) {
            setDraftBody(
              convertDrawingLinksToEmbedBlocks(migrationResult.html),
            );
          }
        } catch {
          migratedNoteIdsRef.current.delete(note.id);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, notesState.status, selectedNote?.id, sortedNotes]);

  const addTag = () => {
    const { nextTags, nextTagInput } = appendUniqueTag(draftTags, tagInput);
    if (nextTags !== draftTags) {
      setDraftTags(nextTags);
    }
    setTagInput(nextTagInput);
  };

  const deleteCurrentNote = async () => {
    const plan = buildDeleteCurrentNotePlan(selectedNote);

    await runNoteDeleteWorkflow({
      isDeleting: isDeletingNotes,
      plan,
      confirm: (message) => window.confirm(message),
      deleteByIds: async (noteIds) => {
        await Promise.all(
          noteIds.map((id) =>
            dispatch(dataThunks.notes.deleteOne(id)).unwrap(),
          ),
        );
      },
      setIsDeleting: setIsDeletingNotes,
    });
  };

  const deleteNotesWithSameTitle = async () => {
    const plan = buildDeleteSameTitleNotesPlan({
      selectedNote,
      sortedNotes,
    });

    await runNoteDeleteWorkflow({
      isDeleting: isDeletingNotes,
      plan,
      confirm: (message) => window.confirm(message),
      deleteByIds: async (noteIds) => {
        await Promise.all(
          noteIds.map((id) =>
            dispatch(dataThunks.notes.deleteOne(id)).unwrap(),
          ),
        );
      },
      setIsDeleting: setIsDeletingNotes,
    });
  };

  const createQuickNote = async (label: string) => {
    const created = await dispatch(
      dataThunks.notes.createOne(buildQuickNoteCreateInput(label)),
    ).unwrap();

    return created.id;
  };

  const createQuickTask = async (label: string) => {
    const created = await dispatch(
      dataThunks.tasks.createOne(buildQuickTaskCreateInput(label)),
    ).unwrap();

    return created.id;
  };

  const createQuickProject = async (label: string) => {
    const created = await dispatch(
      dataThunks.projects.createOne(buildQuickProjectCreateInput(label)),
    ).unwrap();

    return created.id;
  };

  const createQuickMeeting = async (label: string) => {
    const created = await dispatch(
      dataThunks.meetings.createOne(buildQuickMeetingCreateInput(label)),
    ).unwrap();

    return created.id;
  };

  const createQuickCompany = async (label: string) => {
    const created = await dispatch(
      dataThunks.companies.createOne(buildQuickCompanyCreateInput(label)),
    ).unwrap();

    return created.id;
  };

  const createQuickPerson = async (label: string) => {
    const created = await dispatch(
      dataThunks.people.createOne(buildQuickPersonCreateInput(label)),
    ).unwrap();

    return created.id;
  };

  return (
    <section className="h-[calc(100svh-41px)] p-6">
      <Card className="h-full min-w-0 overflow-hidden gap-0 py-0">
        <CardContent className="flex h-full min-h-0 min-w-0 flex-col p-0">
          <div className="bg-card grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b p-2">
            <div className="min-w-0 overflow-x-auto">
              <div className="flex w-max min-w-full items-center gap-1 pr-1">
                {openTabs.map((note) => {
                  const isActive = notesTabsState.activeTabId === note.id;
                  return (
                    <div
                      key={note.id}
                      className="bg-background inline-flex min-w-0 items-center gap-1 rounded-md border"
                    >
                      <button
                        type="button"
                        className={`max-w-64 truncate px-3 py-1.5 text-sm whitespace-nowrap ${
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
            </div>

            <div className="flex shrink-0 items-center gap-1">
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

          <div className="flex h-full min-h-0 min-w-0 overflow-hidden">
            <div className="h-full min-h-0 min-w-0 flex-1 p-4">
              {selectedNote ? (
                <div className="flex h-full min-h-0 flex-col gap-3">
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    placeholder="Note title"
                    className="w-full border-0 bg-transparent px-0 text-center text-[2.5rem] leading-[1.1] font-bold outline-none"
                  />

                  <div className="min-h-0 flex-1">
                    <SimpleEditor
                      content={draftBody}
                      onContentChange={setDraftBody}
                      noteId={selectedNote.id}
                      className="h-full"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No note selected. Create one with the add button.
                </p>
              )}
            </div>

            <aside className="border-l bg-muted/10 h-full w-80 max-w-80 shrink-0 basis-80 space-y-5 overflow-y-auto p-4">
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

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Drawings</h4>
                {availableDrawings.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No drawings yet. Create one in the Drawings page.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {availableDrawings.slice(0, 8).map((drawing) => (
                      <div
                        key={drawing.id}
                        className="flex items-center justify-between gap-2 rounded-md border px-2 py-1"
                      >
                        <p className="truncate text-xs">{drawing.title}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDraftBody(
                              (previous) =>
                                `${previous}${buildDrawingEmbedHtml(drawing.id)}`,
                            );
                          }}
                        >
                          Embed
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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

              <SystemCustomPropertiesPanel
                objectTypeId="object_type_notes"
                recordId={selectedNote?.id ?? null}
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
                                notesTabsActions.replaceActiveTab(item.id),
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
