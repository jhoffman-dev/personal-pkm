import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ParaType } from "@/data/entities";
import {
  PARA_TYPES,
  PARA_TYPE_LABELS,
  createEmptyProjectInput,
  normalizeParaType,
} from "@/lib/project-defaults";
import {
  dataActions,
  dataThunks,
  useAppDispatch,
  useAppSelector,
} from "@/store";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

function DashboardListCard({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: string[];
}) {
  return (
    <Card className="h-full">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">{title}</h4>
          <span className="text-muted-foreground text-xs">{items.length}</span>
        </div>

        {items.length === 0 ? (
          <p className="text-muted-foreground text-xs">{empty}</p>
        ) : (
          <div className="space-y-1.5">
            {items.slice(0, 8).map((item) => (
              <p
                key={item}
                className="bg-muted/30 truncate rounded-md px-2 py-1 text-sm"
              >
                {item}
              </p>
            ))}
            {items.length > 8 ? (
              <p className="text-muted-foreground text-xs">
                +{items.length - 8} more
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ProjectsPage() {
  const dispatch = useAppDispatch();
  const projectsState = useAppSelector((state) => state.projects);
  const tasksState = useAppSelector((state) => state.tasks);
  const notesState = useAppSelector((state) => state.notes);
  const meetingsState = useAppSelector((state) => state.meetings);
  const peopleState = useAppSelector((state) => state.people);
  const companiesState = useAppSelector((state) => state.companies);

  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftParaType, setDraftParaType] = useState<ParaType>("project");
  const [draftTaskIds, setDraftTaskIds] = useState<string[]>([]);
  const [draftNoteIds, setDraftNoteIds] = useState<string[]>([]);
  const [draftMeetingIds, setDraftMeetingIds] = useState<string[]>([]);
  const [draftPersonIds, setDraftPersonIds] = useState<string[]>([]);
  const [draftCompanyIds, setDraftCompanyIds] = useState<string[]>([]);

  useEffect(() => {
    if (projectsState.status === "idle") {
      void dispatch(dataThunks.projects.fetchAll());
    }
    if (tasksState.status === "idle") {
      void dispatch(dataThunks.tasks.fetchAll());
    }
    if (notesState.status === "idle") {
      void dispatch(dataThunks.notes.fetchAll());
    }
    if (meetingsState.status === "idle") {
      void dispatch(dataThunks.meetings.fetchAll());
    }
    if (peopleState.status === "idle") {
      void dispatch(dataThunks.people.fetchAll());
    }
    if (companiesState.status === "idle") {
      void dispatch(dataThunks.companies.fetchAll());
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

  const sortedProjects = useMemo(
    () =>
      projectsState.ids
        .map((id) => projectsState.entities[id])
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [projectsState.entities, projectsState.ids],
  );

  useEffect(() => {
    if (projectsState.status !== "succeeded") {
      return;
    }

    const selectedId = projectsState.selectedId;
    if (selectedId && projectsState.entities[selectedId]) {
      return;
    }

    dispatch(dataActions.projects.setSelectedId(sortedProjects[0]?.id ?? null));
  }, [
    dispatch,
    projectsState.entities,
    projectsState.selectedId,
    projectsState.status,
    sortedProjects,
  ]);

  const selectedProject = projectsState.selectedId
    ? projectsState.entities[projectsState.selectedId]
    : null;

  useEffect(() => {
    if (!selectedProject) {
      setDraftName("");
      setDraftDescription("");
      setDraftParaType("project");
      setDraftTaskIds([]);
      setDraftNoteIds([]);
      setDraftMeetingIds([]);
      setDraftPersonIds([]);
      setDraftCompanyIds([]);
      return;
    }

    setDraftName(selectedProject.name);
    setDraftDescription(selectedProject.description ?? "");
    setDraftParaType(normalizeParaType(selectedProject.paraType));
    setDraftTaskIds(selectedProject.taskIds ?? []);
    setDraftNoteIds(selectedProject.noteIds ?? []);
    setDraftMeetingIds(selectedProject.meetingIds ?? []);
    setDraftPersonIds(selectedProject.personIds ?? []);
    setDraftCompanyIds(selectedProject.companyIds ?? []);
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedProject) {
      return;
    }

    const nameChanged = draftName !== selectedProject.name;
    const descriptionChanged =
      draftDescription !== (selectedProject.description ?? "");
    const paraChanged =
      draftParaType !== normalizeParaType(selectedProject.paraType);
    const tasksChanged = !equalSet(draftTaskIds, selectedProject.taskIds ?? []);
    const notesChanged = !equalSet(draftNoteIds, selectedProject.noteIds ?? []);
    const meetingsChanged = !equalSet(
      draftMeetingIds,
      selectedProject.meetingIds ?? [],
    );
    const peopleChanged = !equalSet(
      draftPersonIds,
      selectedProject.personIds ?? [],
    );
    const companiesChanged = !equalSet(
      draftCompanyIds,
      selectedProject.companyIds ?? [],
    );

    if (
      !nameChanged &&
      !descriptionChanged &&
      !paraChanged &&
      !tasksChanged &&
      !notesChanged &&
      !meetingsChanged &&
      !peopleChanged &&
      !companiesChanged
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void dispatch(
        dataThunks.projects.updateOne({
          id: selectedProject.id,
          input: {
            name: draftName.trim() || "Untitled project",
            description: draftDescription,
            paraType: draftParaType,
            taskIds: draftTaskIds,
            noteIds: draftNoteIds,
            meetingIds: draftMeetingIds,
            personIds: draftPersonIds,
            companyIds: draftCompanyIds,
          },
        }),
      );
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [
    dispatch,
    draftCompanyIds,
    draftDescription,
    draftMeetingIds,
    draftName,
    draftNoteIds,
    draftParaType,
    draftPersonIds,
    draftTaskIds,
    selectedProject,
  ]);

  const taskOptions = useMemo<LinkOption[]>(
    () =>
      tasksState.ids
        .map((id) => tasksState.entities[id])
        .filter(Boolean)
        .map((task) => ({ id: task.id, label: task.title })),
    [tasksState.entities, tasksState.ids],
  );

  const noteOptions = useMemo<LinkOption[]>(
    () =>
      notesState.ids
        .map((id) => notesState.entities[id])
        .filter(Boolean)
        .map((note) => ({ id: note.id, label: note.title })),
    [notesState.entities, notesState.ids],
  );

  const meetingOptions = useMemo<LinkOption[]>(
    () =>
      meetingsState.ids
        .map((id) => meetingsState.entities[id])
        .filter(Boolean)
        .map((meeting) => ({ id: meeting.id, label: meeting.title })),
    [meetingsState.entities, meetingsState.ids],
  );

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
        .map((company) => ({ id: company.id, label: company.name })),
    [companiesState.entities, companiesState.ids],
  );

  const dashboardTasks = draftTaskIds
    .map((id) => tasksState.entities[id]?.title)
    .filter((value): value is string => Boolean(value));
  const dashboardNotes = draftNoteIds
    .map((id) => notesState.entities[id]?.title)
    .filter((value): value is string => Boolean(value));
  const dashboardMeetings = draftMeetingIds
    .map((id) => meetingsState.entities[id]?.title)
    .filter((value): value is string => Boolean(value));
  const dashboardPeople = draftPersonIds
    .map((id) => {
      const person = peopleState.entities[id];
      if (!person) {
        return null;
      }
      return `${person.firstName} ${person.lastName}`.trim();
    })
    .filter((value): value is string => Boolean(value));
  const dashboardCompanies = draftCompanyIds
    .map((id) => companiesState.entities[id]?.name)
    .filter((value): value is string => Boolean(value));

  const createProject = async () => {
    const created = await dispatch(
      dataThunks.projects.createOne(
        createEmptyProjectInput({
          name: "New Project",
        }),
      ),
    ).unwrap();

    dispatch(dataActions.projects.setSelectedId(created.id));
  };

  return (
    <section className="h-[calc(100svh-41px)] p-6">
      <Card className="h-full gap-0 py-0">
        <CardContent className="flex h-full min-h-0 p-0">
          <div className="h-full min-h-0 flex-1 overflow-y-auto p-4">
            {!selectedProject ? (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <p className="text-muted-foreground text-sm">
                  No project selected.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void createProject();
                  }}
                >
                  <Plus className="size-4" />
                  New Project
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {draftName || "Untitled project"}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {draftDescription || "No project summary yet."}
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void createProject();
                    }}
                  >
                    <Plus className="size-4" />
                    New Project
                  </Button>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Dashboard
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <DashboardListCard
                    title="Tasks"
                    empty="No linked tasks."
                    items={dashboardTasks}
                  />
                  <DashboardListCard
                    title="Notes"
                    empty="No linked notes."
                    items={dashboardNotes}
                  />
                  <DashboardListCard
                    title="Meetings"
                    empty="No linked meetings."
                    items={dashboardMeetings}
                  />
                  <DashboardListCard
                    title="People"
                    empty="No linked people."
                    items={dashboardPeople}
                  />
                  <DashboardListCard
                    title="Companies"
                    empty="No linked companies."
                    items={dashboardCompanies}
                  />
                </div>
              </div>
            )}
          </div>

          <aside className="border-l bg-muted/10 h-full w-80 shrink-0 space-y-5 overflow-y-auto p-4">
            <div>
              <h3 className="text-base font-semibold">Properties</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Metadata and linked records for this item.
              </p>
            </div>

            {!selectedProject ? (
              <p className="text-muted-foreground text-sm">
                Select a project to edit its properties.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Name</h4>
                  <Input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    placeholder="Project name"
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Description</h4>
                  <textarea
                    value={draftDescription}
                    onChange={(event) =>
                      setDraftDescription(event.target.value)
                    }
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-24 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    placeholder="Describe this project, area, resource, or archive item"
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">PARA Type</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {PARA_TYPES.map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={draftParaType === type ? "default" : "outline"}
                        onClick={() => setDraftParaType(type)}
                      >
                        {PARA_TYPE_LABELS[type]}
                      </Button>
                    ))}
                  </div>
                </div>

                <PropertyLinkSection
                  title="Tasks"
                  options={taskOptions}
                  selectedIds={draftTaskIds}
                  onToggle={(id) =>
                    setDraftTaskIds((prev) => toggleId(prev, id))
                  }
                />

                <PropertyLinkSection
                  title="Notes"
                  options={noteOptions}
                  selectedIds={draftNoteIds}
                  onToggle={(id) =>
                    setDraftNoteIds((prev) => toggleId(prev, id))
                  }
                />

                <PropertyLinkSection
                  title="Meetings"
                  options={meetingOptions}
                  selectedIds={draftMeetingIds}
                  onToggle={(id) =>
                    setDraftMeetingIds((prev) => toggleId(prev, id))
                  }
                />

                <PropertyLinkSection
                  title="People"
                  options={peopleOptions}
                  selectedIds={draftPersonIds}
                  onToggle={(id) =>
                    setDraftPersonIds((prev) => toggleId(prev, id))
                  }
                />

                <PropertyLinkSection
                  title="Companies"
                  options={companyOptions}
                  selectedIds={draftCompanyIds}
                  onToggle={(id) =>
                    setDraftCompanyIds((prev) => toggleId(prev, id))
                  }
                />
              </>
            )}
          </aside>
        </CardContent>
      </Card>
    </section>
  );
}
