import { Card, CardContent } from "@/components/ui/card";
import { dataThunks, useAppDispatch, useAppSelector } from "@/store";
import ForceGraph2D from "react-force-graph-2d";
import { useEffect, useMemo, useRef, useState } from "react";

type GraphNode = {
  id: string;
  label: string;
  type: "project" | "note" | "task" | "meeting" | "company" | "person";
};

type GraphLink = {
  source: string;
  target: string;
  relation: string;
};

const NODE_COLOR_BY_TYPE: Record<GraphNode["type"], string> = {
  project: "#22c55e",
  note: "#06b6d4",
  task: "#3b82f6",
  meeting: "#f59e0b",
  company: "#ec4899",
  person: "#a855f7",
};

function formatPersonName(firstName?: string, lastName?: string): string {
  return `${lastName ?? ""}, ${firstName ?? ""}`
    .replace(/^\s*,\s*|\s*,\s*$/g, "")
    .trim();
}

export function GraphPage() {
  const dispatch = useAppDispatch();
  const projectsState = useAppSelector((state) => state.projects);
  const notesState = useAppSelector((state) => state.notes);
  const tasksState = useAppSelector((state) => state.tasks);
  const meetingsState = useAppSelector((state) => state.meetings);
  const companiesState = useAppSelector((state) => state.companies);
  const peopleState = useAppSelector((state) => state.people);

  const containerRef = useRef<HTMLDivElement>(null);
  const [graphSize, setGraphSize] = useState({ width: 900, height: 600 });

  useEffect(() => {
    if (projectsState.status === "idle") {
      void dispatch(dataThunks.projects.fetchAll());
    }
    if (notesState.status === "idle") {
      void dispatch(dataThunks.notes.fetchAll());
    }
    if (tasksState.status === "idle") {
      void dispatch(dataThunks.tasks.fetchAll());
    }
    if (meetingsState.status === "idle") {
      void dispatch(dataThunks.meetings.fetchAll());
    }
    if (companiesState.status === "idle") {
      void dispatch(dataThunks.companies.fetchAll());
    }
    if (peopleState.status === "idle") {
      void dispatch(dataThunks.people.fetchAll());
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

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const updateSize = () => {
      if (!containerRef.current) {
        return;
      }

      setGraphSize({
        width: Math.max(400, containerRef.current.clientWidth),
        height: Math.max(400, containerRef.current.clientHeight),
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    const nodeIdSet = new Set<string>();
    const linkIdSet = new Set<string>();

    const addNode = (node: GraphNode) => {
      if (nodeIdSet.has(node.id)) {
        return;
      }
      nodeIdSet.add(node.id);
      nodes.push(node);
    };

    const projects = projectsState.ids
      .map((id) => projectsState.entities[id])
      .filter(Boolean);
    const notes = notesState.ids
      .map((id) => notesState.entities[id])
      .filter(Boolean);
    const tasks = tasksState.ids
      .map((id) => tasksState.entities[id])
      .filter(Boolean);
    const meetings = meetingsState.ids
      .map((id) => meetingsState.entities[id])
      .filter(Boolean);
    const companies = companiesState.ids
      .map((id) => companiesState.entities[id])
      .filter(Boolean);
    const people = peopleState.ids
      .map((id) => peopleState.entities[id])
      .filter(Boolean);

    projects.forEach((item) =>
      addNode({ id: item.id, label: item.name, type: "project" }),
    );
    notes.forEach((item) =>
      addNode({ id: item.id, label: item.title, type: "note" }),
    );
    tasks.forEach((item) =>
      addNode({ id: item.id, label: item.title, type: "task" }),
    );
    meetings.forEach((item) =>
      addNode({ id: item.id, label: item.title, type: "meeting" }),
    );
    companies.forEach((item) =>
      addNode({ id: item.id, label: item.name, type: "company" }),
    );
    people.forEach((item) =>
      addNode({
        id: item.id,
        label:
          formatPersonName(item.firstName, item.lastName) || "Unnamed person",
        type: "person",
      }),
    );

    const addEntityLinks = (entity: Record<string, unknown>) => {
      const sourceId = typeof entity.id === "string" ? entity.id : null;
      if (!sourceId) {
        return;
      }

      for (const [field, value] of Object.entries(entity)) {
        if (!field.endsWith("Ids") || !Array.isArray(value)) {
          continue;
        }

        value.forEach((target) => {
          if (typeof target !== "string" || !nodeIdSet.has(target)) {
            return;
          }

          const [first, second] = [sourceId, target].sort((a, b) =>
            a.localeCompare(b),
          );
          const linkKey = `${first}::${second}`;

          if (linkIdSet.has(linkKey)) {
            return;
          }

          linkIdSet.add(linkKey);
          links.push({
            source: sourceId,
            target,
            relation: field,
          });
        });
      }
    };

    [
      ...projects,
      ...notes,
      ...tasks,
      ...meetings,
      ...companies,
      ...people,
    ].forEach((entity) =>
      addEntityLinks(entity as unknown as Record<string, unknown>),
    );

    return { nodes, links };
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

  return (
    <section className="h-[calc(100svh-41px)] p-6">
      <Card className="h-full">
        <CardContent className="flex h-full min-h-0 flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Connection Graph
              </h2>
              <p className="text-muted-foreground text-sm">
                Showing {graphData.nodes.length} entities and{" "}
                {graphData.links.length} unique links.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            {Object.entries(NODE_COLOR_BY_TYPE).map(([type, color]) => (
              <div key={type} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="capitalize">{type}</span>
              </div>
            ))}
          </div>

          <div
            ref={containerRef}
            className="min-h-0 flex-1 overflow-hidden rounded-md border"
          >
            <ForceGraph2D
              width={graphSize.width}
              height={graphSize.height}
              graphData={graphData}
              nodeLabel={(node) => {
                const typedNode = node as GraphNode;
                return `${typedNode.type}: ${typedNode.label}`;
              }}
              nodeColor={(node) => {
                const typedNode = node as GraphNode;
                return NODE_COLOR_BY_TYPE[typedNode.type] ?? "#64748b";
              }}
              nodeVal={4}
              linkColor={() => "rgba(120,120,140,0.35)"}
              linkWidth={1.2}
              cooldownTicks={80}
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
