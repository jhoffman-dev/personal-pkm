import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import * as React from "react";
import { useLocation } from "react-router-dom";
import { getRouteTitle, isRouteActive, navItems } from "@/routes/navigation";
import { useAppDispatch } from "@/store";
import {
  companiesStateFacade,
  useCompaniesStateFacade,
} from "@/features/companies";
import {
  meetingsStateFacade,
  useMeetingsStateFacade,
} from "@/features/meetings";
import {
  notesTabsFacade,
  notesEntityStateFacade,
  useNotesEntityStateFacade,
  useNotesTabsFacade,
} from "@/features/notes";
import { peopleStateFacade, usePeopleStateFacade } from "@/features/people";
import {
  projectsStateFacade,
  useProjectsStateFacade,
} from "@/features/projects";
import {
  useTasksEntityStateFacade,
  useTasksViewFacade,
} from "@/features/tasks";
import { AppSidebarAssistantSection } from "@/blocks/app-sidebar/app-sidebar-assistant-section";
import { useAppSidebarAssistantState } from "@/blocks/app-sidebar/app-sidebar-assistant-state";
import { buildAppSidebarCreateActions } from "@/blocks/app-sidebar/app-sidebar-create-actions";
import { useAppSidebarDerivedData } from "@/blocks/app-sidebar/app-sidebar-derived-data";
import {
  AppSidebarCompaniesSection,
  AppSidebarMeetingsSection,
  AppSidebarPeopleSection,
} from "@/blocks/app-sidebar/app-sidebar-entity-sections";
import { AppSidebarIconRail } from "@/blocks/app-sidebar/app-sidebar-icon-rail";
import { AppSidebarNotesSection } from "@/blocks/app-sidebar/app-sidebar-notes-section";
import { type AppSidebarOpenTarget } from "@/blocks/app-sidebar/app-sidebar-open-target";
import { AppSidebarProjectsSection } from "@/blocks/app-sidebar/app-sidebar-projects-section";
import { useAppSidebarRouteDataEffects } from "@/blocks/app-sidebar/app-sidebar-route-data-effects";
import { AppSidebarTasksSection } from "@/blocks/app-sidebar/app-sidebar-tasks-section";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onOpenWorkbenchRoute: (
    routePath: string,
    openTarget: AppSidebarOpenTarget,
  ) => "primary" | "secondary";
}

function getInitialRailRoute(pathname: string): string {
  const matchingNavItem = navItems.find((item) =>
    isRouteActive(pathname, item.to),
  );
  return matchingNavItem?.to ?? "/dashboard";
}

export function AppSidebar({
  onOpenWorkbenchRoute,
  ...props
}: AppSidebarProps) {
  const dispatch = useAppDispatch();
  const { notesState } = useNotesEntityStateFacade();
  const { activeTabId } = useNotesTabsFacade();
  const { projectsState } = useProjectsStateFacade();
  const { meetingsState } = useMeetingsStateFacade();
  const { companiesState } = useCompaniesStateFacade();
  const { peopleState } = usePeopleStateFacade();
  const { tasksState } = useTasksEntityStateFacade();
  const { selectedProjectId, setSelectedProjectId } = useTasksViewFacade();
  const { setOpen } = useSidebar();
  const { pathname } = useLocation();
  const [activeRailRoute, setActiveRailRoute] = React.useState<string>(() =>
    getInitialRailRoute(pathname),
  );
  const [currentOpenTarget, setCurrentOpenTarget] =
    React.useState<AppSidebarOpenTarget>("active-pane");
  const activeTitle = getRouteTitle(activeRailRoute);
  const isNotesRoute = isRouteActive(activeRailRoute, "/notes");
  const isTasksRoute = isRouteActive(activeRailRoute, "/tasks");
  const isMeetingsRoute = isRouteActive(activeRailRoute, "/meetings");
  const isProjectsRoute = isRouteActive(activeRailRoute, "/projects");
  const isCompaniesRoute = isRouteActive(activeRailRoute, "/companies");
  const isPeopleRoute = isRouteActive(activeRailRoute, "/people");
  const isAssistantRoute = isRouteActive(activeRailRoute, "/assistant");
  const {
    assistantState,
    sortedAssistantConversations,
    renamingConversationId,
    renameValue,
    setRenameValue,
    createConversation,
    selectConversation,
    startConversationRename,
    saveConversationRename,
    cancelConversationRename,
    toggleConversationPinned,
    deleteConversation,
  } = useAppSidebarAssistantState({
    isAssistantRoute,
  });
  const { createCompany, createPerson, createMeeting } =
    buildAppSidebarCreateActions(dispatch);
  const {
    sortedNotes,
    projectsWithTaskCount,
    allTaskCount,
    projectsByPara,
    sortedCompanies,
    sortedPeople,
    sortedMeetings,
  } = useAppSidebarDerivedData({
    notesState,
    projectsState,
    meetingsState,
    companiesState,
    peopleState,
    tasksState,
  });

  useAppSidebarRouteDataEffects({
    dispatch,
    isNotesRoute,
    isTasksRoute,
    isMeetingsRoute,
    isProjectsRoute,
    isCompaniesRoute,
    isPeopleRoute,
    notesStatus: notesState.status,
    notesSelectedId: notesState.selectedId,
    sortedNotes,
    projectsStatus: projectsState.status,
    tasksStatus: tasksState.status,
    meetingsStatus: meetingsState.status,
    companiesStatus: companiesState.status,
    peopleStatus: peopleState.status,
  });

  React.useEffect(() => {
    const resolveOpenTargetFromModifierKeys = (event: KeyboardEvent) => {
      if (event.altKey) {
        return "other-pane" as const;
      }

      if (event.metaKey || event.ctrlKey) {
        return "active-pane-new-tab" as const;
      }

      return "active-pane" as const;
    };

    const handleKeyEvent = (event: KeyboardEvent) => {
      setCurrentOpenTarget(resolveOpenTargetFromModifierKeys(event));
    };

    const handleWindowBlur = () => {
      setCurrentOpenTarget("active-pane");
    };

    window.addEventListener("keydown", handleKeyEvent);
    window.addEventListener("keyup", handleKeyEvent);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyEvent);
      window.removeEventListener("keyup", handleKeyEvent);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  const currentOpenTargetLabel =
    currentOpenTarget === "active-pane"
      ? "Active pane"
      : currentOpenTarget === "other-pane"
        ? "Other pane"
        : "New tab";

  const handleOpenSidebar = () => {
    setOpen(true);
  };

  const handleSelectNote = (
    noteId: string,
    openTarget: AppSidebarOpenTarget,
  ) => {
    const destinationScopeId = onOpenWorkbenchRoute("/notes", openTarget);

    if (openTarget === "active-pane-new-tab") {
      notesTabsFacade.openNoteTab(
        {
          id: noteId,
          activate: true,
        },
        destinationScopeId,
      );
    } else {
      notesTabsFacade.replaceActiveTab(noteId, destinationScopeId);
    }

    notesEntityStateFacade.setSelectedNoteId(noteId);
  };

  const handleSelectTaskProject = (
    projectId: string | null,
    openTarget: AppSidebarOpenTarget,
  ) => {
    setSelectedProjectId(projectId);
    onOpenWorkbenchRoute("/tasks", openTarget);
  };

  const handleCreateMeeting = () => {
    void createMeeting();
  };

  const handleSelectMeeting = (
    meetingId: string,
    openTarget: AppSidebarOpenTarget,
  ) => {
    meetingsStateFacade.setSelectedMeetingId(meetingId);
    onOpenWorkbenchRoute("/meetings", openTarget);
  };

  const handleSelectProject = (
    projectId: string,
    openTarget: AppSidebarOpenTarget,
  ) => {
    projectsStateFacade.setSelectedProjectId(projectId);
    onOpenWorkbenchRoute("/projects", openTarget);
  };

  const handleCreateCompany = () => {
    void createCompany();
  };

  const handleSelectCompany = (
    companyId: string,
    openTarget: AppSidebarOpenTarget,
  ) => {
    companiesStateFacade.setSelectedCompanyId(companyId);
    onOpenWorkbenchRoute("/companies", openTarget);
  };

  const handleCreatePerson = () => {
    void createPerson();
  };

  const handleSelectPerson = (
    personId: string,
    openTarget: AppSidebarOpenTarget,
  ) => {
    peopleStateFacade.setSelectedPersonId(personId);
    onOpenWorkbenchRoute("/people", openTarget);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* ----------------- */}
      {/* Sidebar icon rail */}
      <AppSidebarIconRail
        activeRailRoute={activeRailRoute}
        onOpenSidebar={handleOpenSidebar}
        onSelectRailRoute={setActiveRailRoute}
      />

      {/* --------------------- */}
      {/* Sidebar inner content */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="flex flex-col items-start gap-1 border-b px-4 py-3">
          <h3 className="font-medium">{activeTitle}</h3>
          <p className="text-muted-foreground text-[11px] leading-tight">
            Destination: {currentOpenTargetLabel} · ⌥ Other pane · ⌘/Ctrl New
            tab
          </p>
          {/* <button
            onClick={() => setOpen(false)}
            className="h-6 w-6 p-0 rounded-md hover:bg-sidebar-accent flex items-center justify-center"
          >
            <IconX className="h-4 w-4" />
          </button> */}
        </SidebarHeader>
        <SidebarContent>
          {isNotesRoute ? (
            <AppSidebarNotesSection
              notes={sortedNotes}
              activeTabId={activeTabId}
              onSelectNote={handleSelectNote}
            />
          ) : isTasksRoute ? (
            <AppSidebarTasksSection
              selectedProjectId={selectedProjectId}
              allTaskCount={allTaskCount}
              projectsWithTaskCount={projectsWithTaskCount}
              onSelectProject={handleSelectTaskProject}
            />
          ) : isMeetingsRoute ? (
            <AppSidebarMeetingsSection
              meetings={sortedMeetings}
              selectedMeetingId={meetingsState.selectedId}
              onCreateMeeting={handleCreateMeeting}
              onSelectMeeting={handleSelectMeeting}
            />
          ) : isProjectsRoute ? (
            <AppSidebarProjectsSection
              projectsByPara={projectsByPara}
              selectedProjectId={projectsState.selectedId}
              onSelectProject={handleSelectProject}
            />
          ) : isCompaniesRoute ? (
            <AppSidebarCompaniesSection
              companies={sortedCompanies}
              selectedCompanyId={companiesState.selectedId}
              onCreateCompany={handleCreateCompany}
              onSelectCompany={handleSelectCompany}
            />
          ) : isPeopleRoute ? (
            <AppSidebarPeopleSection
              people={sortedPeople}
              selectedPersonId={peopleState.selectedId}
              onCreatePerson={handleCreatePerson}
              onSelectPerson={handleSelectPerson}
            />
          ) : isAssistantRoute ? (
            <AppSidebarAssistantSection
              conversations={sortedAssistantConversations}
              activeConversationId={assistantState.activeConversationId}
              renamingConversationId={renamingConversationId}
              renameValue={renameValue}
              onRenameValueChange={setRenameValue}
              onCreateConversation={createConversation}
              onSelectConversation={selectConversation}
              onStartRename={startConversationRename}
              onSaveRename={saveConversationRename}
              onCancelRename={cancelConversationRename}
              onTogglePinned={toggleConversationPinned}
              onDeleteConversation={deleteConversation}
            />
          ) : (
            <SidebarGroup />
          )}
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
    </Sidebar>
  );
}
