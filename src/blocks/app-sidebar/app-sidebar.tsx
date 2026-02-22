import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/nav-user";
import avatarImage from "@/assets/Profile - Avatar - James Hoffman.png";
import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { getRouteTitle, isRouteActive, navItems } from "@/routes/navigation";
import {
  dataActions,
  dataThunks,
  notesTabsActions,
  tasksViewActions,
  useAppDispatch,
  useAppSelector,
} from "@/store";
import { DEFAULT_NOTE_TITLE } from "@/lib/note-defaults";
import {
  PARA_TYPES,
  PARA_TYPE_LABELS,
  normalizeParaType,
} from "@/lib/project-defaults";
import type { ParaType } from "@/data/entities";
import { ChevronDown } from "lucide-react";

const data = {
  user: {
    name: "James Hoffman",
    email: "software@jhoffman.dev",
    avatar: avatarImage,
  },
  navMain: navItems,
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const dispatch = useAppDispatch();
  const notesState = useAppSelector((state) => state.notes);
  const notesTabsState = useAppSelector((state) => state.notesTabs);
  const projectsState = useAppSelector((state) => state.projects);
  const tasksState = useAppSelector((state) => state.tasks);
  const tasksViewState = useAppSelector((state) => state.tasksView);
  const { setOpen } = useSidebar();
  const { pathname } = useLocation();
  const activeTitle = getRouteTitle(pathname);
  const isNotesRoute = isRouteActive(pathname, "/notes");
  const isTasksRoute = isRouteActive(pathname, "/tasks");
  const isProjectsRoute = isRouteActive(pathname, "/projects");
  const [expandedProjectSections, setExpandedProjectSections] = React.useState<
    Record<ParaType, boolean>
  >({
    project: true,
    area: true,
    resource: true,
    archive: false,
  });

  const sortedNotes = React.useMemo(
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

  React.useEffect(() => {
    if (isNotesRoute && notesState.status === "idle") {
      void dispatch(dataThunks.notes.fetchAll());
    }
  }, [dispatch, isNotesRoute, notesState.status]);

  React.useEffect(() => {
    if (isNotesRoute && !notesState.selectedId && sortedNotes.length > 0) {
      dispatch(dataActions.notes.setSelectedId(sortedNotes[0].id));
    }
  }, [dispatch, isNotesRoute, notesState.selectedId, sortedNotes]);

  React.useEffect(() => {
    if (isTasksRoute && projectsState.status === "idle") {
      void dispatch(dataThunks.projects.fetchAll());
    }
    if (isTasksRoute && tasksState.status === "idle") {
      void dispatch(dataThunks.tasks.fetchAll());
    }
  }, [dispatch, isTasksRoute, projectsState.status, tasksState.status]);

  React.useEffect(() => {
    if (isProjectsRoute && projectsState.status === "idle") {
      void dispatch(dataThunks.projects.fetchAll());
    }
  }, [dispatch, isProjectsRoute, projectsState.status]);

  const projectsWithTaskCount = React.useMemo(
    () =>
      projectsState.ids
        .map((id) => projectsState.entities[id])
        .filter(Boolean)
        .filter((project) => normalizeParaType(project.paraType) !== "archive")
        .map((project) => ({
          id: project.id,
          name: project.name,
          taskCount: tasksState.ids
            .map((taskId) => tasksState.entities[taskId])
            .filter(Boolean)
            .filter((task) => (task.projectIds ?? []).includes(project.id))
            .length,
        })),
    [
      projectsState.entities,
      projectsState.ids,
      tasksState.entities,
      tasksState.ids,
    ],
  );

  const allTaskCount = React.useMemo(
    () => tasksState.ids.length,
    [tasksState.ids.length],
  );

  const projectsByPara = React.useMemo(() => {
    const grouped: Record<ParaType, { id: string; name: string }[]> = {
      project: [],
      area: [],
      resource: [],
      archive: [],
    };

    projectsState.ids
      .map((id) => projectsState.entities[id])
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .forEach((project) => {
        grouped[normalizeParaType(project.paraType)].push({
          id: project.id,
          name: project.name,
        });
      });

    return grouped;
  }, [projectsState.entities, projectsState.ids]);

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* ----------------- */}
      {/* Sidebar icon rail */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)] border-r"
      >
        <SidebarHeader />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {data.navMain.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      isActive={isRouteActive(pathname, item.to)}
                      className="px-2.5 md:px-2"
                    >
                      <NavLink
                        to={item.to}
                        onClick={() => {
                          setOpen(true);
                        }}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={data.user} />
        </SidebarFooter>
      </Sidebar>

      {/* --------------------- */}
      {/* Sidebar inner content */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="flex flex-row items-center justify-between border-b px-4">
          <h3 className="font-medium">{activeTitle}</h3>
          {/* <button
            onClick={() => setOpen(false)}
            className="h-6 w-6 p-0 rounded-md hover:bg-sidebar-accent flex items-center justify-center"
          >
            <IconX className="h-4 w-4" />
          </button> */}
        </SidebarHeader>
        <SidebarContent>
          {isNotesRoute ? (
            <SidebarGroup>
              <SidebarGroupLabel>Notes</SidebarGroupLabel>
              <SidebarGroupContent>
                {sortedNotes.length === 0 ? (
                  <p className="text-sidebar-foreground/70 px-2 py-1 text-xs">
                    No notes yet.
                  </p>
                ) : (
                  <SidebarMenu>
                    {sortedNotes.map((note) => (
                      <SidebarMenuItem key={note.id}>
                        <SidebarMenuButton
                          isActive={notesTabsState.activeTabId === note.id}
                          onClick={(event) => {
                            const openInBackgroundTab =
                              event.metaKey || event.ctrlKey;

                            if (openInBackgroundTab) {
                              dispatch(
                                notesTabsActions.openNoteTab({
                                  id: note.id,
                                  activate: false,
                                }),
                              );
                              return;
                            }

                            dispatch(
                              notesTabsActions.openNoteTab({
                                id: note.id,
                                activate: true,
                              }),
                            );
                            dispatch(dataActions.notes.setSelectedId(note.id));
                          }}
                          onAuxClick={(event) => {
                            if (event.button !== 1) {
                              return;
                            }

                            dispatch(
                              notesTabsActions.openNoteTab({
                                id: note.id,
                                activate: false,
                              }),
                            );
                          }}
                        >
                          <span>{note.title || DEFAULT_NOTE_TITLE}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          ) : isTasksRoute ? (
            <SidebarGroup>
              <SidebarGroupLabel>Projects</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={tasksViewState.selectedProjectId === null}
                      onClick={() => {
                        dispatch(tasksViewActions.setSelectedProjectId(null));
                      }}
                    >
                      <span>All Tasks</span>
                      <span className="text-muted-foreground ml-auto text-xs">
                        {allTaskCount}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {projectsWithTaskCount.map((project) => (
                    <SidebarMenuItem key={project.id}>
                      <SidebarMenuButton
                        isActive={
                          tasksViewState.selectedProjectId === project.id
                        }
                        onClick={() => {
                          dispatch(
                            tasksViewActions.setSelectedProjectId(project.id),
                          );
                        }}
                      >
                        <span>{project.name}</span>
                        <span className="text-muted-foreground ml-auto text-xs">
                          {project.taskCount}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : isProjectsRoute ? (
            <SidebarGroup>
              <SidebarGroupLabel>PARA</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="space-y-2 px-2">
                  {PARA_TYPES.map((paraType) => {
                    const isOpen = expandedProjectSections[paraType];
                    const items = projectsByPara[paraType];

                    return (
                      <div
                        key={paraType}
                        className="rounded-md border bg-sidebar-accent/10"
                      >
                        <button
                          type="button"
                          className="hover:bg-sidebar-accent/50 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                          onClick={() => {
                            setExpandedProjectSections((prev) => ({
                              ...prev,
                              [paraType]: !prev[paraType],
                            }));
                          }}
                        >
                          <ChevronDown
                            className={`size-4 transition-transform ${
                              isOpen ? "rotate-0" : "-rotate-90"
                            }`}
                          />
                          <span>{PARA_TYPE_LABELS[paraType]}</span>
                          <span className="text-sidebar-foreground/60 ml-auto text-xs">
                            {items.length}
                          </span>
                        </button>

                        {isOpen ? (
                          <div className="space-y-1 px-1 pb-1">
                            {items.length === 0 ? (
                              <p className="text-sidebar-foreground/70 px-2 py-1 text-xs">
                                No items.
                              </p>
                            ) : (
                              items.map((project) => (
                                <button
                                  key={project.id}
                                  type="button"
                                  className={`hover:bg-sidebar-accent/60 w-full rounded-md px-2 py-1 text-left text-sm ${
                                    projectsState.selectedId === project.id
                                      ? "bg-sidebar-accent"
                                      : ""
                                  }`}
                                  onClick={() => {
                                    dispatch(
                                      dataActions.projects.setSelectedId(
                                        project.id,
                                      ),
                                    );
                                  }}
                                >
                                  {project.name}
                                </button>
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            <SidebarGroup />
          )}
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
    </Sidebar>
  );
}
