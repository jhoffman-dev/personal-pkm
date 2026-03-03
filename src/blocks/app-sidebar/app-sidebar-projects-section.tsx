import type { ParaType } from "@/data/entities";
import { PARA_TYPES, PARA_TYPE_LABELS } from "@/lib/project-defaults";
import { ChevronDown } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import * as React from "react";

export function AppSidebarProjectsSection(params: {
  projectsByPara: Record<ParaType, Array<{ id: string; name: string }>>;
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
}) {
  const { projectsByPara, selectedProjectId, onSelectProject } = params;
  const [expandedProjectSections, setExpandedProjectSections] = React.useState<
    Record<ParaType, boolean>
  >({
    project: true,
    area: true,
    resource: true,
    archive: false,
  });

  return (
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
                            selectedProjectId === project.id
                              ? "bg-sidebar-accent"
                              : ""
                          }`}
                          onClick={() => {
                            onSelectProject(project.id);
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
  );
}
