import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Task, TaskLevel, TaskStatus } from "@/data/entities";
import { createEmptyNoteInput } from "@/lib/note-defaults";
import { normalizeParaType } from "@/lib/project-defaults";
import {
  createEmptyTaskInput,
  TASK_STATE_LABELS,
  TASK_STATES,
  normalizeTaskStatus,
} from "@/lib/task-defaults";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import {
  dataThunks,
  tasksViewActions,
  useAppDispatch,
  useAppSelector,
} from "@/store";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type TaskNode = Task & { children: TaskNode[] };

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clampLevel(parentLevel: TaskLevel): TaskLevel {
  if (parentLevel === "story") {
    return "task";
  }
  return "subtask";
}

function getTaskProgress(node: TaskNode): number {
  const descendants: TaskNode[] = [];

  const walk = (current: TaskNode) => {
    current.children.forEach((child) => {
      descendants.push(child);
      walk(child);
    });
  };

  walk(node);

  if (descendants.length === 0) {
    return normalizeTaskStatus(node.status) === "complete" ? 100 : 0;
  }

  const completed = descendants.filter(
    (task) => normalizeTaskStatus(task.status) === "complete",
  ).length;

  return Math.round((completed / descendants.length) * 100);
}

function buildTaskTree(tasks: Task[]): TaskNode[] {
  const byId = new Map<string, TaskNode>();

  tasks.forEach((task) => {
    byId.set(task.id, {
      ...task,
      status: normalizeTaskStatus(task.status),
      level: task.level ?? "task",
      parentTaskId: task.parentTaskId ?? null,
      notes: task.notes ?? "",
      children: [],
    });
  });

  const roots: TaskNode[] = [];

  byId.forEach((node) => {
    const parentId = node.parentTaskId;
    if (!parentId || !byId.has(parentId)) {
      roots.push(node);
      return;
    }

    byId.get(parentId)?.children.push(node);
  });

  const sortRecursive = (items: TaskNode[]) => {
    items.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    items.forEach((item) => sortRecursive(item.children));
  };

  sortRecursive(roots);
  return roots;
}

export function TasksPage() {
  const dispatch = useAppDispatch();
  const tasksState = useAppSelector((state) => state.tasks);
  const notesState = useAppSelector((state) => state.notes);
  const projectsState = useAppSelector((state) => state.projects);
  const peopleState = useAppSelector((state) => state.people);
  const companiesState = useAppSelector((state) => state.companies);
  const meetingsState = useAppSelector((state) => state.meetings);
  const tasksViewState = useAppSelector((state) => state.tasksView);

  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [detailsTitle, setDetailsTitle] = useState("");
  const [detailsDescription, setDetailsDescription] = useState("");
  const [detailsStatus, setDetailsStatus] = useState<TaskStatus>("inbox");
  const [detailsDueDate, setDetailsDueDate] = useState("");
  const [detailsNoteIds, setDetailsNoteIds] = useState<string[]>([]);
  const [detailsProjectIds, setDetailsProjectIds] = useState<string[]>([]);
  const [detailsPersonIds, setDetailsPersonIds] = useState<string[]>([]);
  const [detailsCompanyIds, setDetailsCompanyIds] = useState<string[]>([]);
  const [detailsMeetingIds, setDetailsMeetingIds] = useState<string[]>([]);
  const [mainNoteId, setMainNoteId] = useState<string | null>(null);
  const [mainNoteBodyDraft, setMainNoteBodyDraft] = useState("");
  const [linkedNotesOpen, setLinkedNotesOpen] = useState(false);
  const [linkedNotesQuery, setLinkedNotesQuery] = useState("");
  const [mainNoteSheetOpen, setMainNoteSheetOpen] = useState(false);
  const [isEnsuringMainNote, setIsEnsuringMainNote] = useState(false);
  const linkedNotesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tasksState.status === "idle") {
      void dispatch(dataThunks.tasks.fetchAll());
    }
    if (projectsState.status === "idle") {
      void dispatch(dataThunks.projects.fetchAll());
    }
    if (notesState.status === "idle") {
      void dispatch(dataThunks.notes.fetchAll());
    }
    if (peopleState.status === "idle") {
      void dispatch(dataThunks.people.fetchAll());
    }
    if (companiesState.status === "idle") {
      void dispatch(dataThunks.companies.fetchAll());
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

  const tasks = useMemo(
    () => tasksState.ids.map((id) => tasksState.entities[id]).filter(Boolean),
    [tasksState.entities, tasksState.ids],
  );

  const filteredTasks = useMemo(() => {
    if (!tasksViewState.selectedProjectId) {
      return tasks;
    }

    return tasks.filter((task) =>
      (task.projectIds ?? []).includes(
        tasksViewState.selectedProjectId as string,
      ),
    );
  }, [tasks, tasksViewState.selectedProjectId]);

  const rootTasks = useMemo(
    () => buildTaskTree(filteredTasks),
    [filteredTasks],
  );

  const expandedTask = tasksViewState.expandedTaskId
    ? tasksState.entities[tasksViewState.expandedTaskId]
    : null;

  const linkedNoteOptions = useMemo(
    () =>
      notesState.ids
        .map((id) => notesState.entities[id])
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [notesState.entities, notesState.ids],
  );

  const filteredLinkedNoteOptions = useMemo(() => {
    const normalized = linkedNotesQuery.trim().toLowerCase();
    if (!normalized) {
      return linkedNoteOptions.slice(0, 100);
    }

    return linkedNoteOptions
      .filter((note) => note.title.toLowerCase().includes(normalized))
      .slice(0, 100);
  }, [linkedNoteOptions, linkedNotesQuery]);

  useEffect(() => {
    if (!linkedNotesOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!linkedNotesRef.current?.contains(target)) {
        setLinkedNotesOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [linkedNotesOpen]);

  useEffect(() => {
    if (!expandedTask) {
      setDetailsTitle("");
      setDetailsDescription("");
      setDetailsStatus("inbox");
      setDetailsDueDate("");
      setDetailsNoteIds([]);
      setDetailsProjectIds([]);
      setDetailsPersonIds([]);
      setDetailsCompanyIds([]);
      setDetailsMeetingIds([]);
      setMainNoteId(null);
      setMainNoteBodyDraft("");
      return;
    }

    setDetailsTitle(expandedTask.title);
    setDetailsDescription(expandedTask.description ?? "");
    setDetailsStatus(normalizeTaskStatus(expandedTask.status));
    setDetailsDueDate(
      expandedTask.dueDate ? expandedTask.dueDate.slice(0, 10) : "",
    );
    setDetailsNoteIds(expandedTask.noteIds ?? []);
    setDetailsProjectIds(expandedTask.projectIds ?? []);
    setDetailsPersonIds(expandedTask.personIds ?? []);
    setDetailsCompanyIds(expandedTask.companyIds ?? []);
    setDetailsMeetingIds(expandedTask.meetingIds ?? []);
    const linkedNotes = (expandedTask.noteIds ?? [])
      .map((id) => notesState.entities[id])
      .filter(Boolean);
    const matchedByTitle = linkedNotes.find(
      (note) => note.title === expandedTask.title,
    );
    const initialMainNote = matchedByTitle ?? linkedNotes[0] ?? null;
    setMainNoteId(initialMainNote?.id ?? null);
    setMainNoteBodyDraft(initialMainNote?.body ?? "");
  }, [expandedTask?.id]);

  useEffect(() => {
    if (!expandedTask) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void dispatch(
        dataThunks.tasks.updateOne({
          id: expandedTask.id,
          input: {
            title: detailsTitle || "Untitled task",
            description: detailsDescription,
            status: detailsStatus,
            dueDate: detailsDueDate
              ? new Date(detailsDueDate).toISOString()
              : undefined,
            noteIds: detailsNoteIds,
            projectIds: detailsProjectIds,
            personIds: detailsPersonIds,
            companyIds: detailsCompanyIds,
            meetingIds: detailsMeetingIds,
          },
        }),
      );
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [
    detailsCompanyIds,
    detailsDescription,
    detailsDueDate,
    detailsMeetingIds,
    detailsNoteIds,
    detailsPersonIds,
    detailsProjectIds,
    detailsStatus,
    detailsTitle,
    dispatch,
    expandedTask,
  ]);

  const ensureMainNote = async (): Promise<string | null> => {
    if (!expandedTask) {
      return null;
    }

    if (mainNoteId && notesState.entities[mainNoteId]) {
      return mainNoteId;
    }

    const currentTitle = detailsTitle.trim() || expandedTask.title.trim();

    const linkedCandidates = detailsNoteIds
      .map((id) => notesState.entities[id])
      .filter(Boolean);

    const linkedTitleMatch = linkedCandidates.find(
      (note) => note.title === currentTitle,
    );

    const globalTitleMatch = notesState.ids
      .map((id) => notesState.entities[id])
      .filter(Boolean)
      .filter((note) => note.title === currentTitle)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0];

    const resolved =
      linkedTitleMatch ?? linkedCandidates[0] ?? globalTitleMatch;

    if (resolved) {
      setMainNoteId(resolved.id);
      setMainNoteBodyDraft(resolved.body);
      setDetailsNoteIds((prev) =>
        prev.includes(resolved.id) ? prev : [...prev, resolved.id],
      );
      return resolved.id;
    }

    if (!currentTitle || isEnsuringMainNote) {
      return null;
    }

    setIsEnsuringMainNote(true);
    try {
      const created = await dispatch(
        dataThunks.notes.createOne({
          ...createEmptyNoteInput(),
          title: currentTitle,
          body: `<h1>${currentTitle}</h1><p></p>`,
        }),
      ).unwrap();

      setMainNoteId(created.id);
      setMainNoteBodyDraft(created.body);
      setDetailsNoteIds((prev) =>
        prev.includes(created.id) ? prev : [...prev, created.id],
      );
      return created.id;
    } finally {
      setIsEnsuringMainNote(false);
    }
  };

  useEffect(() => {
    if (!mainNoteId) {
      return;
    }

    if (!detailsNoteIds.includes(mainNoteId)) {
      setDetailsNoteIds((prev) => [...prev, mainNoteId]);
    }
  }, [detailsNoteIds, mainNoteId]);

  useEffect(() => {
    if (!mainNoteId) {
      return;
    }

    if (mainNoteSheetOpen) {
      return;
    }

    const mainNote = notesState.entities[mainNoteId];
    if (!mainNote) {
      return;
    }

    if (mainNoteBodyDraft !== mainNote.body) {
      setMainNoteBodyDraft(mainNote.body);
    }
  }, [mainNoteBodyDraft, mainNoteId, mainNoteSheetOpen, notesState.entities]);

  useEffect(() => {
    if (!mainNoteId) {
      return;
    }

    const mainNote = notesState.entities[mainNoteId];
    if (!mainNote) {
      return;
    }

    const titleChanged = mainNote.title !== detailsTitle;
    const bodyChanged = mainNote.body !== mainNoteBodyDraft;

    if (!titleChanged && !bodyChanged) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void dispatch(
        dataThunks.notes.updateOne({
          id: mainNoteId,
          input: {
            title: detailsTitle,
            body: mainNoteBodyDraft,
          },
        }),
      );
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [
    detailsTitle,
    dispatch,
    mainNoteBodyDraft,
    mainNoteId,
    notesState.entities,
  ]);

  const createStory = async () => {
    const title = newStoryTitle.trim();
    const created = await dispatch(
      dataThunks.tasks.createOne(
        createEmptyTaskInput({
          title: title || "New story",
          level: "story",
          projectIds: tasksViewState.selectedProjectId
            ? [tasksViewState.selectedProjectId]
            : [],
        }),
      ),
    ).unwrap();

    setNewStoryTitle("");
    dispatch(tasksViewActions.setExpandedTaskId(created.id));
  };

  const createChildTask = async (parent: TaskNode) => {
    if (parent.level === "subtask") {
      return;
    }

    const created = await dispatch(
      dataThunks.tasks.createOne(
        createEmptyTaskInput({
          title: `New ${clampLevel(parent.level)}`,
          level: clampLevel(parent.level),
          parentTaskId: parent.id,
          projectIds: parent.projectIds ?? [],
          status: normalizeTaskStatus(parent.status),
        }),
      ),
    ).unwrap();

    dispatch(tasksViewActions.setExpandedTaskId(created.id));
  };

  const toggleComplete = (task: TaskNode, checked: boolean) => {
    void dispatch(
      dataThunks.tasks.updateOne({
        id: task.id,
        input: {
          status: checked ? "complete" : "inbox",
        },
      }),
    );
  };

  const moveTaskToState = (taskId: string, status: TaskStatus) => {
    void dispatch(
      dataThunks.tasks.updateOne({
        id: taskId,
        input: { status },
      }),
    );
  };

  const taskRowsByState = useMemo(() => {
    const map = new Map<TaskStatus, TaskNode[]>();
    TASK_STATES.forEach((status) => map.set(status, []));

    rootTasks.forEach((task) => {
      const state = normalizeTaskStatus(task.status);
      map.get(state)?.push(task);
    });

    return map;
  }, [rootTasks]);

  const renderTaskNode = (node: TaskNode, depth = 0) => {
    const isExpanded = tasksViewState.expandedTaskId === node.id;
    const progress = getTaskProgress(node);
    const isComplete = normalizeTaskStatus(node.status) === "complete";

    return (
      <div key={node.id} className="space-y-2">
        <div
          className="bg-card border rounded-md p-3"
          style={{ marginLeft: `${depth * 16}px` }}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData("text/task-id", node.id);
          }}
        >
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={isComplete}
              onChange={(event) => toggleComplete(node, event.target.checked)}
              className="mt-1 size-4"
            />

            <button
              type="button"
              className="flex-1 text-left"
              onClick={() => {
                dispatch(
                  tasksViewActions.setExpandedTaskId(
                    isExpanded ? null : node.id,
                  ),
                );
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{node.title}</span>
                <span className="text-muted-foreground text-xs uppercase">
                  {node.level}
                </span>
              </div>
              <div className="text-muted-foreground mt-1 text-xs">
                {TASK_STATE_LABELS[normalizeTaskStatus(node.status)]}
              </div>
            </button>

            <select
              value={normalizeTaskStatus(node.status)}
              onChange={(event) =>
                moveTaskToState(node.id, event.target.value as TaskStatus)
              }
              className="border rounded-md bg-background px-2 py-1 text-xs"
            >
              {TASK_STATES.map((status) => (
                <option key={status} value={status}>
                  {TASK_STATE_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2">
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {progress}% complete
            </p>
          </div>

          {isExpanded && (
            <div className="mt-3 flex gap-2">
              {node.level !== "subtask" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void createChildTask(node);
                  }}
                >
                  <Plus className="size-4" />
                  Add child
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void dispatch(dataThunks.tasks.deleteOne(node.id));
                }}
              >
                <X className="size-4" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {node.children.map((child) => renderTaskNode(child, depth + 1))}
      </div>
    );
  };

  const mainNote = mainNoteId ? notesState.entities[mainNoteId] : null;

  return (
    <section className="h-[calc(100svh-41px)] p-6">
      <Card className="h-full py-0">
        <CardContent className="grid h-full min-h-0 grid-cols-[1fr_20rem] gap-0 p-0">
          <div className="min-h-0 overflow-y-auto p-4 space-y-4">
            <div className="flex gap-2">
              <Input
                value={newStoryTitle}
                onChange={(event) => setNewStoryTitle(event.target.value)}
                placeholder="New story title"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void createStory();
                  }
                }}
              />
              <Button type="button" onClick={() => void createStory()}>
                <Plus className="size-4" />
                Story
              </Button>
            </div>

            {TASK_STATES.map((status) => (
              <div
                key={status}
                className="space-y-3 border rounded-lg p-3"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const taskId = event.dataTransfer.getData("text/task-id");
                  if (!taskId) {
                    return;
                  }
                  moveTaskToState(taskId, status);
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    {TASK_STATE_LABELS[status]}
                  </h3>
                  <span className="text-muted-foreground text-xs">
                    {taskRowsByState.get(status)?.length ?? 0}
                  </span>
                </div>

                <div className="space-y-2">
                  {(taskRowsByState.get(status) ?? []).map((task) =>
                    renderTaskNode(task),
                  )}
                  {(taskRowsByState.get(status) ?? []).length === 0 && (
                    <p className="text-muted-foreground text-xs px-1 py-2">
                      Drop tasks here or create a new story.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <aside className="border-l bg-muted/10 min-h-0 overflow-y-auto p-4 space-y-3">
            <h3 className="text-sm font-semibold">Task Details</h3>
            {!expandedTask ? (
              <p className="text-muted-foreground text-xs">
                Click a task to expand details and settings.
              </p>
            ) : (
              <>
                <Input
                  value={detailsTitle}
                  onChange={(event) => setDetailsTitle(event.target.value)}
                  placeholder="Task title"
                />

                <div className="space-y-1">
                  <label className="text-xs font-medium">State</label>
                  <select
                    value={detailsStatus}
                    onChange={(event) =>
                      setDetailsStatus(event.target.value as TaskStatus)
                    }
                    className="border rounded-md bg-background w-full px-2 py-2 text-sm"
                  >
                    {TASK_STATES.map((status) => (
                      <option key={status} value={status}>
                        {TASK_STATE_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Due date</label>
                  <Input
                    type="date"
                    value={detailsDueDate}
                    onChange={(event) => setDetailsDueDate(event.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Description</label>
                  <textarea
                    className="border rounded-md bg-background min-h-20 w-full px-3 py-2 text-sm"
                    value={detailsDescription}
                    onChange={(event) =>
                      setDetailsDescription(event.target.value)
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Main note</label>
                  <div className="border rounded-md bg-background p-2 space-y-2">
                    <p className="text-xs font-medium truncate">
                      {mainNote?.title || detailsTitle || "Task note"}
                    </p>
                    <p className="text-muted-foreground text-xs line-clamp-3 min-h-10">
                      {mainNote
                        ? stripHtml(mainNote.body)
                        : "No note content yet."}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void (async () => {
                          const noteId = await ensureMainNote();
                          if (noteId) {
                            setMainNoteSheetOpen(true);
                          }
                        })();
                      }}
                      disabled={isEnsuringMainNote || !expandedTask}
                    >
                      {isEnsuringMainNote
                        ? "Preparing note..."
                        : "Open note editor"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Linked notes</label>
                  <div className="space-y-2" ref={linkedNotesRef}>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => setLinkedNotesOpen((value) => !value)}
                    >
                      <span className="truncate">
                        {detailsNoteIds.length === 0
                          ? "Select linked notes"
                          : `${detailsNoteIds.length} selected`}
                      </span>
                      <ChevronDown className="size-4" />
                    </Button>

                    {linkedNotesOpen && (
                      <div className="bg-background rounded-md border p-2 space-y-2">
                        <Input
                          value={linkedNotesQuery}
                          onChange={(event) =>
                            setLinkedNotesQuery(event.target.value)
                          }
                          placeholder="Search notes..."
                        />

                        <div className="max-h-44 overflow-y-auto space-y-1">
                          {filteredLinkedNoteOptions.length === 0 ? (
                            <p className="text-muted-foreground px-2 py-1 text-xs">
                              No matching notes.
                            </p>
                          ) : (
                            filteredLinkedNoteOptions.map((note) => {
                              const checked = detailsNoteIds.includes(note.id);
                              const isMain = note.id === mainNoteId;

                              return (
                                <button
                                  key={note.id}
                                  type="button"
                                  className="hover:bg-muted/60 flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs"
                                  onClick={() => {
                                    if (isMain) {
                                      return;
                                    }
                                    setDetailsNoteIds((prev) =>
                                      prev.includes(note.id)
                                        ? prev.filter(
                                            (value) => value !== note.id,
                                          )
                                        : [...prev, note.id],
                                    );
                                  }}
                                >
                                  <span className="truncate">{note.title}</span>
                                  <div className="flex items-center gap-1">
                                    {isMain ? (
                                      <span className="text-muted-foreground text-[10px]">
                                        main
                                      </span>
                                    ) : null}
                                    {checked ? (
                                      <Check className="text-primary size-3.5" />
                                    ) : null}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>

                        {linkedNoteOptions.length > 100 &&
                          linkedNotesQuery.trim().length === 0 && (
                            <p className="text-muted-foreground text-[10px] px-1">
                              Showing first 100 notes. Type to narrow results.
                            </p>
                          )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {detailsNoteIds.length === 0 ? (
                        <p className="text-muted-foreground text-xs">
                          No linked notes.
                        </p>
                      ) : (
                        detailsNoteIds
                          .map((id) => notesState.entities[id])
                          .filter(Boolean)
                          .map((note) => {
                            const isMain = note.id === mainNoteId;

                            return (
                              <span
                                key={note.id}
                                className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px]"
                              >
                                <span className="truncate max-w-32">
                                  {note.title}
                                </span>
                                {isMain ? (
                                  <span className="text-[10px] opacity-70">
                                    main
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDetailsNoteIds((prev) =>
                                        prev.filter(
                                          (value) => value !== note.id,
                                        ),
                                      );
                                    }}
                                  >
                                    <X className="size-3" />
                                  </button>
                                )}
                              </span>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Project links</label>
                  <div className="space-y-1 max-h-24 overflow-y-auto border rounded-md p-2 bg-background">
                    {projectsState.ids
                      .map((id) => projectsState.entities[id])
                      .filter(Boolean)
                      .filter(
                        (project) =>
                          normalizeParaType(project.paraType) !== "archive",
                      )
                      .map((project) => {
                        const checked = detailsProjectIds.includes(project.id);
                        return (
                          <label
                            key={project.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setDetailsProjectIds((prev) =>
                                  prev.includes(project.id)
                                    ? prev.filter(
                                        (value) => value !== project.id,
                                      )
                                    : [...prev, project.id],
                                );
                              }}
                            />
                            <span className="truncate">{project.name}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">People links</label>
                  <div className="space-y-1 max-h-24 overflow-y-auto border rounded-md p-2 bg-background">
                    {peopleState.ids
                      .map((id) => peopleState.entities[id])
                      .filter(Boolean)
                      .map((person) => {
                        const checked = detailsPersonIds.includes(person.id);
                        return (
                          <label
                            key={person.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setDetailsPersonIds((prev) =>
                                  prev.includes(person.id)
                                    ? prev.filter(
                                        (value) => value !== person.id,
                                      )
                                    : [...prev, person.id],
                                );
                              }}
                            />
                            <span className="truncate">
                              {person.firstName} {person.lastName}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Company links</label>
                  <div className="space-y-1 max-h-24 overflow-y-auto border rounded-md p-2 bg-background">
                    {companiesState.ids
                      .map((id) => companiesState.entities[id])
                      .filter(Boolean)
                      .map((company) => {
                        const checked = detailsCompanyIds.includes(company.id);
                        return (
                          <label
                            key={company.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setDetailsCompanyIds((prev) =>
                                  prev.includes(company.id)
                                    ? prev.filter(
                                        (value) => value !== company.id,
                                      )
                                    : [...prev, company.id],
                                );
                              }}
                            />
                            <span className="truncate">{company.name}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Meeting links</label>
                  <div className="space-y-1 max-h-24 overflow-y-auto border rounded-md p-2 bg-background">
                    {meetingsState.ids
                      .map((id) => meetingsState.entities[id])
                      .filter(Boolean)
                      .map((meeting) => {
                        const checked = detailsMeetingIds.includes(meeting.id);
                        return (
                          <label
                            key={meeting.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setDetailsMeetingIds((prev) =>
                                  prev.includes(meeting.id)
                                    ? prev.filter(
                                        (value) => value !== meeting.id,
                                      )
                                    : [...prev, meeting.id],
                                );
                              }}
                            />
                            <span className="truncate">{meeting.title}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              </>
            )}
          </aside>

          <Sheet open={mainNoteSheetOpen} onOpenChange={setMainNoteSheetOpen}>
            <SheetContent side="right" className="w-[92vw] sm:max-w-5xl p-0">
              <SheetHeader className="border-b px-4 py-3">
                <SheetTitle>{detailsTitle || "Task note"}</SheetTitle>
                <SheetDescription>
                  This is the main note linked to the task.
                </SheetDescription>
              </SheetHeader>

              <div className="h-[calc(100vh-80px)] p-4">
                {mainNoteId ? (
                  <SimpleEditor
                    content={mainNoteBodyDraft}
                    onContentChange={setMainNoteBodyDraft}
                    onTitleChange={setDetailsTitle}
                    className="h-full"
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No main note available for this task yet.
                  </p>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </CardContent>
      </Card>
    </section>
  );
}
