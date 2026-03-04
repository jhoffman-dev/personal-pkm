import { WorkbenchPaneScopeContext } from "@/lib/workbench-pane-scope-context";
import { useContext } from "react";

export function useWorkbenchPaneScopeId(): string {
  return useContext(WorkbenchPaneScopeContext);
}
