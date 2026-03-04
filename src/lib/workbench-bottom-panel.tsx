import { createContext, useContext } from "react";

export type WorkbenchBottomPanelView =
  | "route-timing"
  | "output"
  | "dev-tools"
  | "properties";

export interface WorkbenchBottomPanelContextValue {
  activeBottomPanelView: WorkbenchBottomPanelView;
  isBottomPanelOpen: boolean;
  activePaneScopeId: string;
  propertiesHostElement: HTMLDivElement | null;
}

const DEFAULT_WORKBENCH_BOTTOM_PANEL_CONTEXT: WorkbenchBottomPanelContextValue =
  {
    activeBottomPanelView: "route-timing",
    isBottomPanelOpen: false,
    activePaneScopeId: "primary",
    propertiesHostElement: null,
  };

export const WorkbenchBottomPanelContext =
  createContext<WorkbenchBottomPanelContextValue>(
    DEFAULT_WORKBENCH_BOTTOM_PANEL_CONTEXT,
  );

export function useWorkbenchBottomPanelContext(): WorkbenchBottomPanelContextValue {
  return useContext(WorkbenchBottomPanelContext);
}
