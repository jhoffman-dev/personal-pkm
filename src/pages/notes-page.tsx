import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEFAULT_NOTE_BODY, DEFAULT_NOTE_TITLE } from "@/lib/note-defaults";
import { normalizeParaType } from "@/lib/project-defaults";
import {
  dataActions,
  dataThunks,
  notesTabsActions,
  useAppDispatch,
  useAppSelector,
} from "@/store";
import { Check, ChevronDown, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type LinkOption = {
  id: string;
  label: string;
};

function toggleId(values: string[], id: string): string[] {
  return values.includes(id)
    ? values.filter((value) => value !== id)
    : [...values, id];
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

function PropertyLinkSection({
  title,
  options,
  selectedIds,
  onToggle,
}: {
  title: string;
  options: LinkOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      {options.length === 0 ? (
        <p className="text-muted-foreground text-xs">No items available.</p>
      ) : (
        <div className="space-y-1">
          {options.map((option) => {
            const checked = selectedIds.includes(option.id);
            return (
              <label
                key={option.id}
                className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(option.id)}
                  className="size-4"
                />
                <span className="truncate">{option.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RelatedNotesDropdownSection({
  options,
  selectedIds,
  onToggle,
}: {
  options: LinkOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options.slice(0, 100);
    }

    return options
      .filter((option) => option.label.toLowerCase().includes(normalized))
      .slice(0, 100);
  }, [options, query]);

  return (
    <div className="space-y-2" ref={containerRef}>
      <h4 className="text-sm font-semibold">Related notes</h4>

      <Button
        type="button"
        variant="outline"
        className="w-full justify-between"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="truncate">
          {selectedIds.length === 0
            ? "Select related notes"
            : `${selectedIds.length} selected`}
        </span>
        <ChevronDown className="size-4" />
      </Button>

      {open && (
        <div className="bg-background space-y-2 rounded-md border p-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes..."
          />

          <div className="max-h-56 space-y-1 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="text-muted-foreground px-2 py-1 text-xs">
                No matching notes.
              </p>
            ) : (
              filteredOptions.map((option) => {
                const checked = selectedIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    className="hover:bg-muted/60 flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm"
                    onClick={() => onToggle(option.id)}
                  >
                    <span className="truncate">{option.label}</span>
                    {checked ? <Check className="text-primary size-4" /> : null}
                  </button>
                );
              })
            )}
          </div>

          {options.length > 100 && query.trim().length === 0 && (
            <p className="text-muted-foreground px-1 text-xs">
              Showing first 100 notes. Start typing to narrow results.
            </p>
          )}
        </div>
      )}
    </div>
  );
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

  const peopleOptions = useMemo<LinkOption[]>(
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

  const companyOptions = useMemo<LinkOption[]>(
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

  const projectOptions = useMemo<LinkOption[]>(
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

  const taskOptions = useMemo<LinkOption[]>(
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

  const meetingOptions = useMemo<LinkOption[]>(
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

  const relatedNoteOptions = useMemo<LinkOption[]>(
    () =>
      sortedNotes
        .filter((note) => note.id !== selectedNote?.id)
        .map((note) => ({
          id: note.id,
          label: note.title || DEFAULT_NOTE_TITLE,
        })),
    [selectedNote?.id, sortedNotes],
  );

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
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    Add
                  </Button>
                </div>
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

              <RelatedNotesDropdownSection
                options={relatedNoteOptions}
                selectedIds={draftRelatedNoteIds}
                onToggle={(id) => {
                  setDraftRelatedNoteIds((prev) => toggleId(prev, id));
                }}
              />

              <PropertyLinkSection
                title="People"
                options={peopleOptions}
                selectedIds={draftPersonIds}
                onToggle={(id) => {
                  setDraftPersonIds((prev) => toggleId(prev, id));
                }}
              />

              <PropertyLinkSection
                title="Companies"
                options={companyOptions}
                selectedIds={draftCompanyIds}
                onToggle={(id) => {
                  setDraftCompanyIds((prev) => toggleId(prev, id));
                }}
              />

              <PropertyLinkSection
                title="Projects"
                options={projectOptions}
                selectedIds={draftProjectIds}
                onToggle={(id) => {
                  setDraftProjectIds((prev) => toggleId(prev, id));
                }}
              />

              <PropertyLinkSection
                title="Tasks"
                options={taskOptions}
                selectedIds={draftTaskIds}
                onToggle={(id) => {
                  setDraftTaskIds((prev) => toggleId(prev, id));
                }}
              />

              <PropertyLinkSection
                title="Meetings"
                options={meetingOptions}
                selectedIds={draftMeetingIds}
                onToggle={(id) => {
                  setDraftMeetingIds((prev) => toggleId(prev, id));
                }}
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
