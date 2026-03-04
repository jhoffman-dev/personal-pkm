import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  getSidebarOpenTargetFromModifierKeys,
  type AppSidebarOpenTarget,
} from "@/blocks/app-sidebar/app-sidebar-open-target";

export function AppSidebarTasksSection(params: {
  selectedProjectId: string | null;
  allTaskCount: number;
  projectsWithTaskCount: Array<{ id: string; name: string; taskCount: number }>;
  onSelectProject: (
    projectId: string | null,
    openTarget: AppSidebarOpenTarget,
  ) => void;
}) {
  const {
    selectedProjectId,
    allTaskCount,
    projectsWithTaskCount,
    onSelectProject,
  } = params;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={selectedProjectId === null}
              onClick={(event) => {
                onSelectProject(
                  null,
                  getSidebarOpenTargetFromModifierKeys({
                    altKey: event.altKey,
                    metaKey: event.metaKey,
                    ctrlKey: event.ctrlKey,
                  }),
                );
              }}
              onAuxClick={(event) => {
                if (event.button !== 1) {
                  return;
                }

                onSelectProject(null, "active-pane-new-tab");
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
                isActive={selectedProjectId === project.id}
                onClick={(event) => {
                  onSelectProject(
                    project.id,
                    getSidebarOpenTargetFromModifierKeys({
                      altKey: event.altKey,
                      metaKey: event.metaKey,
                      ctrlKey: event.ctrlKey,
                    }),
                  );
                }}
                onAuxClick={(event) => {
                  if (event.button !== 1) {
                    return;
                  }

                  onSelectProject(project.id, "active-pane-new-tab");
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
  );
}
