import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  PropertyLinkPicker,
  type PropertyOption,
} from "@/components/property-link-picker";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Task, TaskLevel, TaskStatus } from "@/data/entities";
import { createEmptyNoteInput, DEFAULT_NOTE_TITLE } from "@/lib/note-defaults";
import { createEmptyProjectInput } from "@/lib/project-defaults";
import { normalizeParaType } from "@/lib/project-defaults";
import {
  createEmptyTaskInput,
  TASK_STATE_LABELS,
  TASK_STATES,
  normalizeTaskStatus,
} from "@/lib/task-defaults";
import { addUnique } from "@/lib/entity-link-utils";
import { loadAppSettings } from "@/lib/app-settings";
import {
  fromDateTimeLocalValue,
  loadTaskTimeblocks,
  saveTaskTimeblocks,
  toDateTimeLocalValue,
} from "@/lib/task-timeblocks";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import {
  dataThunks,
  tasksViewActions,
  useAppDispatch,
  useAppSelector,
} from "@/store";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  const [detailsTags, setDetailsTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [detailsStatus, setDetailsStatus] = useState<TaskStatus>("inbox");
  const [detailsDueDate, setDetailsDueDate] = useState("");
  const [detailsTimeblockStart, setDetailsTimeblockStart] = useState("");
  const [detailsTimeblockEnd, setDetailsTimeblockEnd] = useState("");
  const [detailsNoteIds, setDetailsNoteIds] = useState<string[]>([]);
  const [detailsProjectIds, setDetailsProjectIds] = useState<string[]>([]);
  const [detailsPersonIds, setDetailsPersonIds] = useState<string[]>([]);
  const [detailsCompanyIds, setDetailsCompanyIds] = useState<string[]>([]);
  const [detailsMeetingIds, setDetailsMeetingIds] = useState<string[]>([]);
  const [mainNoteId, setMainNoteId] = useState<string | null>(null);
  const [mainNoteBodyDraft, setMainNoteBodyDraft] = useState("");
  const [mainNoteSheetOpen, setMainNoteSheetOpen] = useState(false);
  const [isEnsuringMainNote, setIsEnsuringMainNote] = useState(false);

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

  const linkedNotePropertyOptions = useMemo<PropertyOption[]>(
    () =>
      linkedNoteOptions.map((note) => ({
        id: note.id,
        label: note.title,
      })),
    [linkedNoteOptions],
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

  const sharedTagSuggestions = useMemo(() => {
    const values = new Set<string>();

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

    notesState.ids
      .map((id) => notesState.entities[id])
      .filter(Boolean)
      .forEach((note) => {
        (note.tags ?? []).forEach((tag) => {
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
    notesState.entities,
    notesState.ids,
    peopleState.entities,
    peopleState.ids,
    projectsState.entities,
    projectsState.ids,
    tasksState.entities,
    tasksState.ids,
  ]);

  useEffect(() => {
    if (!expandedTask) {
      setDetailsTitle("");
      setDetailsDescription("");
      setDetailsTags([]);
      setDetailsStatus("inbox");
      setDetailsDueDate("");
      setDetailsTimeblockStart("");
      setDetailsTimeblockEnd("");
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
    setDetailsTags(expandedTask.tags ?? []);
    setDetailsStatus(normalizeTaskStatus(expandedTask.status));
    setDetailsDueDate(
      expandedTask.dueDate ? expandedTask.dueDate.slice(0, 10) : "",
    );
    const taskTimeblock = loadTaskTimeblocks()[expandedTask.id];
    setDetailsTimeblockStart(toDateTimeLocalValue(taskTimeblock?.start));
    setDetailsTimeblockEnd(toDateTimeLocalValue(taskTimeblock?.end));
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
      const currentMap = loadTaskTimeblocks();

      const startIso = fromDateTimeLocalValue(detailsTimeblockStart);
      const endIso = fromDateTimeLocalValue(detailsTimeblockEnd);

      if (!startIso || !endIso) {
        if (currentMap[expandedTask.id]) {
          const { [expandedTask.id]: _removed, ...next } = currentMap;
          saveTaskTimeblocks(next);
        }
        return;
      }

      if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
        return;
      }

      saveTaskTimeblocks({
        ...currentMap,
        [expandedTask.id]: {
          start: startIso,
          end: endIso,
        },
      });

      void dispatch(
        dataThunks.tasks.updateOne({
          id: expandedTask.id,
          input: {
            dueDate: startIso,
          },
        }),
      );
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [detailsTimeblockEnd, detailsTimeblockStart, dispatch, expandedTask]);

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
            tags: detailsTags,
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
    detailsTags,
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

  const addTag = () => {
    const value = tagInput.trim();
    if (!value) {
      return;
    }

    const exists = detailsTags.some(
      (tag) => tag.toLowerCase() === value.toLowerCase(),
    );
    if (!exists) {
      setDetailsTags((previous) => [...previous, value]);
    }
    setTagInput("");
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

                <div className="space-y-2 border rounded-md p-2">
                  <label className="text-xs font-medium">Timeblock</label>
                  <input
                    type="datetime-local"
                    value={detailsTimeblockStart}
                    onChange={(event) =>
                      setDetailsTimeblockStart(event.target.value)
                    }
                    className="border rounded-md bg-background w-full px-2 py-2 text-sm"
                  />
                  <input
                    type="datetime-local"
                    value={detailsTimeblockEnd}
                    onChange={(event) =>
                      setDetailsTimeblockEnd(event.target.value)
                    }
                    className="border rounded-md bg-background w-full px-2 py-2 text-sm"
                  />
                  <div className="text-muted-foreground text-[11px]">
                    Default duration:{" "}
                    {loadAppSettings().taskTimeblockDefaultMinutes}m
                  </div>
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
                  <label className="text-xs font-medium">Tags</label>
                  <div className="space-y-2">
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
                        list="shared-tag-suggestions-tasks"
                      />
                      <Button type="button" variant="outline" onClick={addTag}>
                        Add
                      </Button>
                    </div>
                    <datalist id="shared-tag-suggestions-tasks">
                      {sharedTagSuggestions.map((tag) => (
                        <option key={tag} value={tag} />
                      ))}
                    </datalist>
                    <div className="flex flex-wrap gap-1">
                      {detailsTags.length === 0 ? (
                        <p className="text-muted-foreground text-xs">
                          No tags.
                        </p>
                      ) : (
                        detailsTags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px]"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => {
                                setDetailsTags((previous) =>
                                  previous.filter((value) => value !== tag),
                                );
                              }}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label={`Remove ${tag} tag`}
                            >
                              <X className="size-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
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
                  <PropertyLinkPicker
                    title="Linked notes"
                    options={linkedNotePropertyOptions}
                    selectedIds={detailsNoteIds}
                    onAdd={(id) => {
                      setDetailsNoteIds((prev) => addUnique(prev, id));
                    }}
                    onRemove={(id) => {
                      if (id === mainNoteId) {
                        return;
                      }

                      setDetailsNoteIds((prev) =>
                        prev.filter((value) => value !== id),
                      );
                    }}
                    onCreateOption={createQuickNote}
                    searchPlaceholder="Search notes..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Project links</label>
                  <PropertyLinkPicker
                    title="Projects"
                    options={projectOptions}
                    selectedIds={detailsProjectIds}
                    onAdd={(id) => {
                      setDetailsProjectIds((prev) => addUnique(prev, id));
                    }}
                    onRemove={(id) => {
                      setDetailsProjectIds((prev) =>
                        prev.filter((value) => value !== id),
                      );
                    }}
                    onCreateOption={createQuickProject}
                    searchPlaceholder="Search projects..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">People links</label>
                  <PropertyLinkPicker
                    title="People"
                    options={peopleOptions}
                    selectedIds={detailsPersonIds}
                    onAdd={(id) => {
                      setDetailsPersonIds((prev) => addUnique(prev, id));
                    }}
                    onRemove={(id) => {
                      setDetailsPersonIds((prev) =>
                        prev.filter((value) => value !== id),
                      );
                    }}
                    onCreateOption={createQuickPerson}
                    searchPlaceholder="Search people..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Company links</label>
                  <PropertyLinkPicker
                    title="Companies"
                    options={companyOptions}
                    selectedIds={detailsCompanyIds}
                    onAdd={(id) => {
                      setDetailsCompanyIds((prev) => addUnique(prev, id));
                    }}
                    onRemove={(id) => {
                      setDetailsCompanyIds((prev) =>
                        prev.filter((value) => value !== id),
                      );
                    }}
                    onCreateOption={createQuickCompany}
                    searchPlaceholder="Search companies..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Meeting links</label>
                  <PropertyLinkPicker
                    title="Meetings"
                    options={meetingOptions}
                    selectedIds={detailsMeetingIds}
                    onAdd={(id) => {
                      setDetailsMeetingIds((prev) => addUnique(prev, id));
                    }}
                    onRemove={(id) => {
                      setDetailsMeetingIds((prev) =>
                        prev.filter((value) => value !== id),
                      );
                    }}
                    onCreateOption={createQuickMeeting}
                    searchPlaceholder="Search meetings..."
                  />
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
