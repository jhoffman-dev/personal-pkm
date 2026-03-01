import {
  Building2,
  Bot,
  CalendarDays,
  ChartGantt,
  Globe,
  PencilRuler,
  LayoutDashboard,
  ListTodo,
  Network,
  NotebookPen,
  TableProperties,
  Shapes,
  Presentation,
  SquareUser,
} from "lucide-react";

export type NavItem = {
  title: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Notes",
    to: "/notes",
    icon: NotebookPen,
  },
  {
    title: "Drawings",
    to: "/drawings",
    icon: PencilRuler,
  },
  {
    title: "Browser",
    to: "/browser",
    icon: Globe,
  },
  {
    title: "Tasks",
    to: "/tasks",
    icon: ListTodo,
  },
  {
    title: "Meetings",
    to: "/meetings",
    icon: Presentation,
  },
  {
    title: "Calendar",
    to: "/calendar",
    icon: CalendarDays,
  },
  {
    title: "Projects",
    to: "/projects",
    icon: ChartGantt,
  },
  {
    title: "Companies",
    to: "/companies",
    icon: Building2,
  },
  {
    title: "People",
    to: "/people",
    icon: SquareUser,
  },
  {
    title: "Object Types",
    to: "/object-types",
    icon: Shapes,
  },
  {
    title: "Objects",
    to: "/objects",
    icon: TableProperties,
  },
  {
    title: "Graph",
    to: "/graph",
    icon: Network,
  },
  {
    title: "Assistant",
    to: "/assistant",
    icon: Bot,
  },
];

export function isRouteActive(pathname: string, routePath: string): boolean {
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}

export function getRouteTitle(pathname: string): string {
  const match = navItems.find((item) => isRouteActive(pathname, item.to));
  return match?.title ?? "Dashboard";
}
