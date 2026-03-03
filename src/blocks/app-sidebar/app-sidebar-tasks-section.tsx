import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebarTasksSection(params: {
  selectedProjectId: string | null;
  allTaskCount: number;
  projectsWithTaskCount: Array<{ id: string; name: string; taskCount: number }>;
  onSelectProject: (projectId: string | null) => void;
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
              onClick={() => {
                onSelectProject(null);
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
                onClick={() => {
                  onSelectProject(project.id);
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
