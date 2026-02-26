import type { Project, Task } from "@/data/entities";
import type { TaskTimeblockMap } from "@/features/task-timeblocking";

export type BacklogTaskGroup = {
  projectName: string;
  tasks: Array<{
    id: string;
    title: string;
  }>;
};

/**
 * Builds calendar backlog groups from eligible tasks.
 *
 * Eligibility rules are intentionally centralized here so calendar rendering
 * and future automation can share the same policy.
 */
export function buildBacklogTaskGroups(
  tasks: Task[],
  projects: Project[],
  taskTimeblocks: TaskTimeblockMap,
): BacklogTaskGroup[] {
  const projectNameById = new Map<string, string>(
    projects.map((project) => [project.id, project.name]),
  );

  const grouped = new Map<string, BacklogTaskGroup>();
  const unassignedKey = "No Project";

  tasks
    .filter(
      (task) =>
        (task.status === "next_action" || task.status === "in_progress") &&
        !taskTimeblocks[task.id],
    )
    .forEach((task) => {
      const firstProjectName = (task.projectIds ?? [])
        .map((projectId) => projectNameById.get(projectId))
        .find(Boolean);

      const groupKey = firstProjectName ?? unassignedKey;
      const current = grouped.get(groupKey) ?? {
        projectName: groupKey,
        tasks: [],
      };

      current.tasks.push({
        id: task.id,
        title: task.title,
      });
      grouped.set(groupKey, current);
    });

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      tasks: group.tasks.sort((left, right) =>
        left.title.localeCompare(right.title),
      ),
    }))
    .sort((left, right) => left.projectName.localeCompare(right.projectName));
}
