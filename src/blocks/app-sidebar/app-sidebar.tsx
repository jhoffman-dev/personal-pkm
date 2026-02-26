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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAssistantChat, upsertAssistantChat } from "@/lib/ai-client";
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
import {
  ASSISTANT_STORAGE_EVENT,
  type AssistantConversation,
  DEFAULT_CONVERSATION_TITLE,
  createEmptyConversation,
  hydrateAssistantStateFromFirestore,
  loadAssistantState,
  saveAssistantState,
  sortAssistantConversations,
  type StoredAssistantState,
} from "@/lib/assistant-storage";
import type { ParaType } from "@/data/entities";
import { firebaseAuth } from "@/lib/firebase";
import {
  Check,
  ChevronDown,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";

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
  const meetingsState = useAppSelector((state) => state.meetings);
  const companiesState = useAppSelector((state) => state.companies);
  const peopleState = useAppSelector((state) => state.people);
  const tasksState = useAppSelector((state) => state.tasks);
  const tasksViewState = useAppSelector((state) => state.tasksView);
  const { setOpen } = useSidebar();
  const { pathname } = useLocation();
  const activeTitle = getRouteTitle(pathname);
  const isNotesRoute = isRouteActive(pathname, "/notes");
  const isTasksRoute = isRouteActive(pathname, "/tasks");
  const isMeetingsRoute = isRouteActive(pathname, "/meetings");
  const isProjectsRoute = isRouteActive(pathname, "/projects");
  const isCompaniesRoute = isRouteActive(pathname, "/companies");
  const isPeopleRoute = isRouteActive(pathname, "/people");
  const isAssistantRoute = isRouteActive(pathname, "/assistant");
  const assistantUserId = firebaseAuth.currentUser?.uid ?? "guest";
  const assistantSourceId = React.useMemo(() => crypto.randomUUID(), []);
  const [assistantState, setAssistantState] =
    React.useState<StoredAssistantState>(() =>
      loadAssistantState(assistantUserId),
    );
  const [renamingConversationId, setRenamingConversationId] = React.useState<
    string | null
  >(null);
  const [renameValue, setRenameValue] = React.useState("");
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
    if (isMeetingsRoute && meetingsState.status === "idle") {
      void dispatch(dataThunks.meetings.fetchAll());
    }
  }, [dispatch, isMeetingsRoute, meetingsState.status]);

  React.useEffect(() => {
    if (isProjectsRoute && projectsState.status === "idle") {
      void dispatch(dataThunks.projects.fetchAll());
    }
  }, [dispatch, isProjectsRoute, projectsState.status]);

  React.useEffect(() => {
    if (isCompaniesRoute && companiesState.status === "idle") {
      void dispatch(dataThunks.companies.fetchAll());
    }
  }, [companiesState.status, dispatch, isCompaniesRoute]);

  React.useEffect(() => {
    if (isPeopleRoute && peopleState.status === "idle") {
      void dispatch(dataThunks.people.fetchAll());
    }
  }, [dispatch, isPeopleRoute, peopleState.status]);

  React.useEffect(() => {
    if (!isAssistantRoute) {
      return;
    }

    setAssistantState(loadAssistantState(assistantUserId));

    void hydrateAssistantStateFromFirestore(assistantUserId)
      .then((nextState) => {
        setAssistantState(nextState);
      })
      .catch(() => {
        // Keep in-memory state if backend hydration fails.
      });
  }, [assistantUserId, isAssistantRoute]);

  React.useEffect(() => {
    const onAssistantStorageChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{
        key?: string;
        source?: string;
      }>;

      if (customEvent.detail?.source === assistantSourceId) {
        return;
      }

      setAssistantState(loadAssistantState(assistantUserId));
    };

    window.addEventListener(ASSISTANT_STORAGE_EVENT, onAssistantStorageChanged);

    return () => {
      window.removeEventListener(
        ASSISTANT_STORAGE_EVENT,
        onAssistantStorageChanged,
      );
    };
  }, [assistantSourceId, assistantUserId]);

  const updateAssistantState = React.useCallback(
    (updater: (previous: StoredAssistantState) => StoredAssistantState) => {
      setAssistantState((previous) => {
        const next = updater(previous);
        saveAssistantState(next, assistantUserId, assistantSourceId);
        return next;
      });
    },
    [assistantSourceId, assistantUserId],
  );

  const sortedAssistantConversations = React.useMemo(
    () => sortAssistantConversations(assistantState.conversations),
    [assistantState.conversations],
  );

  const persistAssistantConversation = React.useCallback(
    async (conversation: AssistantConversation) => {
      if (!firebaseAuth.currentUser) {
        return;
      }

      const authToken = await firebaseAuth.currentUser
        .getIdToken()
        .catch(() => null);

      if (!authToken) {
        return;
      }

      await upsertAssistantChat({
        authToken,
        userId: assistantUserId,
        conversationId: conversation.id,
        title: conversation.title,
        pinned: conversation.pinned,
        updatedAt: conversation.updatedAt,
        provider: assistantState.provider,
        model: assistantState.model,
        systemPrompt: assistantState.systemPrompt,
        transcript: conversation.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      });
    },
    [
      assistantState.model,
      assistantState.provider,
      assistantState.systemPrompt,
      assistantUserId,
    ],
  );

  const removeAssistantConversationFromFirestore = React.useCallback(
    async (conversationId: string) => {
      if (!firebaseAuth.currentUser) {
        return;
      }

      const authToken = await firebaseAuth.currentUser
        .getIdToken()
        .catch(() => null);

      if (!authToken) {
        return;
      }

      await deleteAssistantChat({
        authToken,
        userId: assistantUserId,
        conversationId,
      });
    },
    [assistantUserId],
  );

  const createAssistantConversation = () => {
    const conversation = createEmptyConversation();
    updateAssistantState((previous) => ({
      ...previous,
      activeConversationId: conversation.id,
      conversations: [conversation, ...previous.conversations],
    }));

    void persistAssistantConversation(conversation).catch(() => {
      // Keep local in-memory state if persistence fails.
    });
  };

  const togglePinnedAssistantConversation = (conversationId: string) => {
    const existingConversation = assistantState.conversations.find(
      (conversation) => conversation.id === conversationId,
    );

    if (!existingConversation) {
      return;
    }

    const updatedConversation: AssistantConversation = {
      ...existingConversation,
      pinned: !existingConversation.pinned,
      updatedAt: new Date().toISOString(),
    };

    updateAssistantState((previous) => ({
      ...previous,
      conversations: previous.conversations.map((conversation) =>
        conversation.id === conversationId ? updatedConversation : conversation,
      ),
    }));

    void persistAssistantConversation(updatedConversation).catch(() => {
      // Keep local in-memory state if persistence fails.
    });
  };

  const startRenamingAssistantConversation = (
    conversationId: string,
    currentTitle: string,
  ) => {
    setRenamingConversationId(conversationId);
    setRenameValue(currentTitle);
  };

  const cancelRenamingAssistantConversation = () => {
    setRenamingConversationId(null);
    setRenameValue("");
  };

  const saveAssistantConversationRename = (conversationId: string) => {
    const nextTitle = renameValue.trim() || DEFAULT_CONVERSATION_TITLE;
    const existingConversation = assistantState.conversations.find(
      (conversation) => conversation.id === conversationId,
    );

    if (!existingConversation) {
      cancelRenamingAssistantConversation();
      return;
    }

    const updatedConversation: AssistantConversation = {
      ...existingConversation,
      title: nextTitle,
      updatedAt: new Date().toISOString(),
    };

    updateAssistantState((previous) => ({
      ...previous,
      conversations: previous.conversations.map((conversation) =>
        conversation.id === conversationId ? updatedConversation : conversation,
      ),
    }));

    void persistAssistantConversation(updatedConversation).catch(() => {
      // Keep local in-memory state if persistence fails.
    });

    cancelRenamingAssistantConversation();
  };

  const selectAssistantConversation = (conversationId: string) => {
    updateAssistantState((previous) => ({
      ...previous,
      activeConversationId: conversationId,
    }));
  };

  const deleteAssistantConversation = (conversationId: string) => {
    updateAssistantState((previous) => {
      const remaining = previous.conversations.filter(
        (conversation) => conversation.id !== conversationId,
      );

      if (remaining.length === 0) {
        const fallback = createEmptyConversation();
        return {
          ...previous,
          activeConversationId: fallback.id,
          conversations: [fallback],
        };
      }

      const activeConversationId =
        previous.activeConversationId === conversationId
          ? remaining[0].id
          : previous.activeConversationId;

      return {
        ...previous,
        activeConversationId,
        conversations: remaining,
      };
    });

    if (renamingConversationId === conversationId) {
      cancelRenamingAssistantConversation();
    }

    void removeAssistantConversationFromFirestore(conversationId).catch(() => {
      // Keep local in-memory state if persistence fails.
    });
  };

  const createCompany = async () => {
    const created = await dispatch(
      dataThunks.companies.createOne({
        name: "New Company",
        tags: [],
        website: "",
        personIds: [],
        projectIds: [],
        noteIds: [],
        taskIds: [],
        meetingIds: [],
      }),
    ).unwrap();

    dispatch(dataActions.companies.setSelectedId(created.id));
  };

  const createPerson = async () => {
    const created = await dispatch(
      dataThunks.people.createOne({
        firstName: "New",
        lastName: "Person",
        tags: [],
        email: "",
        phone: "",
        address: "",
        companyIds: [],
        projectIds: [],
        noteIds: [],
        taskIds: [],
        meetingIds: [],
      }),
    ).unwrap();

    dispatch(dataActions.people.setSelectedId(created.id));
  };

  const createMeeting = async () => {
    const created = await dispatch(
      dataThunks.meetings.createOne({
        title: "New meeting",
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

    dispatch(dataActions.meetings.setSelectedId(created.id));
  };

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

  const sortedCompanies = React.useMemo(
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

  const sortedPeople = React.useMemo(
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

  const sortedMeetings = React.useMemo(
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
                              notesTabsActions.replaceActiveTab(note.id),
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
          ) : isMeetingsRoute ? (
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center justify-between pr-2">
                <span>Meetings</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => void createMeeting()}
                  aria-label="Create meeting"
                >
                  <Plus />
                </Button>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {sortedMeetings.length === 0 ? (
                  <p className="text-sidebar-foreground/70 px-2 py-1 text-xs">
                    No meetings yet.
                  </p>
                ) : (
                  <SidebarMenu>
                    {sortedMeetings.map((meeting) => (
                      <SidebarMenuItem key={meeting.id}>
                        <SidebarMenuButton
                          isActive={meetingsState.selectedId === meeting.id}
                          onClick={() => {
                            dispatch(
                              dataActions.meetings.setSelectedId(meeting.id),
                            );
                          }}
                        >
                          <span>{meeting.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                )}
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
          ) : isCompaniesRoute ? (
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center justify-between pr-2">
                <span>Companies</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => void createCompany()}
                  aria-label="Create company"
                >
                  <Plus />
                </Button>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {sortedCompanies.length === 0 ? (
                  <p className="text-sidebar-foreground/70 px-2 py-1 text-xs">
                    No companies yet.
                  </p>
                ) : (
                  <SidebarMenu>
                    {sortedCompanies.map((company) => (
                      <SidebarMenuItem key={company.id}>
                        <SidebarMenuButton
                          isActive={companiesState.selectedId === company.id}
                          onClick={() => {
                            dispatch(
                              dataActions.companies.setSelectedId(company.id),
                            );
                          }}
                        >
                          <span>{company.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          ) : isPeopleRoute ? (
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center justify-between pr-2">
                <span>People</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => void createPerson()}
                  aria-label="Create person"
                >
                  <Plus />
                </Button>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {sortedPeople.length === 0 ? (
                  <p className="text-sidebar-foreground/70 px-2 py-1 text-xs">
                    No people yet.
                  </p>
                ) : (
                  <SidebarMenu>
                    {sortedPeople.map((person) => {
                      const fullName =
                        `${person.lastName ?? ""}, ${person.firstName ?? ""}`
                          .replace(/^\s*,\s*|\s*,\s*$/g, "")
                          .trim() || "Unnamed person";

                      return (
                        <SidebarMenuItem key={person.id}>
                          <SidebarMenuButton
                            isActive={peopleState.selectedId === person.id}
                            onClick={() => {
                              dispatch(
                                dataActions.people.setSelectedId(person.id),
                              );
                            }}
                          >
                            <span>{fullName}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          ) : isAssistantRoute ? (
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center justify-between pr-2">
                <span>Conversations</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={createAssistantConversation}
                  aria-label="Create conversation"
                >
                  <Plus />
                </Button>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="space-y-1 px-2">
                  {sortedAssistantConversations.map((conversation) => {
                    const lastMessage =
                      conversation.messages[conversation.messages.length - 1];
                    const isActive =
                      assistantState.activeConversationId === conversation.id;

                    return (
                      <div
                        key={conversation.id}
                        className={`group rounded-md border p-2 ${
                          isActive
                            ? "bg-sidebar-accent border-sidebar-border"
                            : "bg-sidebar"
                        }`}
                      >
                        {renamingConversationId === conversation.id ? (
                          <div className="space-y-1">
                            <Input
                              value={renameValue}
                              onChange={(event) =>
                                setRenameValue(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  saveAssistantConversationRename(
                                    conversation.id,
                                  );
                                }
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  cancelRenamingAssistantConversation();
                                }
                              }}
                              className="h-7"
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() =>
                                  saveAssistantConversationRename(
                                    conversation.id,
                                  )
                                }
                                aria-label="Save conversation name"
                              >
                                <Check />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={cancelRenamingAssistantConversation}
                                aria-label="Cancel rename"
                              >
                                <X />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="w-full min-w-0 text-left"
                              onClick={() =>
                                selectAssistantConversation(conversation.id)
                              }
                            >
                              <p className="truncate text-sm font-medium">
                                {conversation.title}
                              </p>
                              <p className="text-sidebar-foreground/70 truncate text-xs">
                                {lastMessage?.content ?? "No messages yet"}
                              </p>
                            </button>

                            <div className="mt-1 flex items-center justify-end gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="opacity-80 group-hover:opacity-100"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  startRenamingAssistantConversation(
                                    conversation.id,
                                    conversation.title,
                                  );
                                }}
                                aria-label="Rename conversation"
                              >
                                <Pencil />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className={
                                  conversation.pinned ? "text-primary" : ""
                                }
                                onClick={(event) => {
                                  event.stopPropagation();
                                  togglePinnedAssistantConversation(
                                    conversation.id,
                                  );
                                }}
                                aria-label={
                                  conversation.pinned
                                    ? "Unpin conversation"
                                    : "Pin conversation"
                                }
                              >
                                <Star
                                  className={
                                    conversation.pinned ? "fill-current" : ""
                                  }
                                />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="text-destructive opacity-80 group-hover:opacity-100"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteAssistantConversation(conversation.id);
                                }}
                                aria-label="Delete conversation"
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </>
                        )}
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
