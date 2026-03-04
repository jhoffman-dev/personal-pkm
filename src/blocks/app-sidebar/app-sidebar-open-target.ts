export type AppSidebarOpenTarget =
  | "active-pane"
  | "other-pane"
  | "active-pane-new-tab";

export function getSidebarOpenTargetFromModifierKeys(params: {
  altKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}): AppSidebarOpenTarget {
  if (params.altKey) {
    return "other-pane";
  }

  if (params.metaKey || params.ctrlKey) {
    return "active-pane-new-tab";
  }

  return "active-pane";
}
