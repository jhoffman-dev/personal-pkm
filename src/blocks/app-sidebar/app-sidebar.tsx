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
import { getRouteTitle, isRouteActive } from "@/routes/navigation";
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
import { AppSidebarProjectsSection } from "@/blocks/app-sidebar/app-sidebar-projects-section";
import { useAppSidebarRouteDataEffects } from "@/blocks/app-sidebar/app-sidebar-route-data-effects";
import { AppSidebarTasksSection } from "@/blocks/app-sidebar/app-sidebar-tasks-section";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const dispatch = useAppDispatch();
  const { notesState } = useNotesEntityStateFacade();
  const { activeTabId, openNoteTab, replaceActiveTab } = useNotesTabsFacade();
  const { projectsState } = useProjectsStateFacade();
  const { meetingsState } = useMeetingsStateFacade();
  const { companiesState } = useCompaniesStateFacade();
  const { peopleState } = usePeopleStateFacade();
  const { tasksState } = useTasksEntityStateFacade();
  const { selectedProjectId, setSelectedProjectId } = useTasksViewFacade();
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

  const handleOpenSidebar = () => {
    setOpen(true);
  };

  const handleSelectNote = (noteId: string) => {
    replaceActiveTab(noteId);
    notesEntityStateFacade.setSelectedNoteId(noteId);
  };

  const handleOpenNoteInBackground = (noteId: string) => {
    openNoteTab({
      id: noteId,
      activate: false,
    });
  };

  const handleSelectTaskProject = (projectId: string | null) => {
    setSelectedProjectId(projectId);
  };

  const handleCreateMeeting = () => {
    void createMeeting();
  };

  const handleSelectMeeting = (meetingId: string) => {
    meetingsStateFacade.setSelectedMeetingId(meetingId);
  };

  const handleSelectProject = (projectId: string) => {
    projectsStateFacade.setSelectedProjectId(projectId);
  };

  const handleCreateCompany = () => {
    void createCompany();
  };

  const handleSelectCompany = (companyId: string) => {
    companiesStateFacade.setSelectedCompanyId(companyId);
  };

  const handleCreatePerson = () => {
    void createPerson();
  };

  const handleSelectPerson = (personId: string) => {
    peopleStateFacade.setSelectedPersonId(personId);
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
        pathname={pathname}
        onOpenSidebar={handleOpenSidebar}
      />

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
            <AppSidebarNotesSection
              notes={sortedNotes}
              activeTabId={activeTabId}
              onSelectNote={handleSelectNote}
              onOpenNoteBackground={handleOpenNoteInBackground}
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
