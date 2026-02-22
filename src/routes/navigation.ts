import {
  Building2,
  ChartGantt,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
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
];

export function isRouteActive(pathname: string, routePath: string): boolean {
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}

export function getRouteTitle(pathname: string): string {
  const match = navItems.find((item) => isRouteActive(pathname, item.to));
  return match?.title ?? "Dashboard";
}
