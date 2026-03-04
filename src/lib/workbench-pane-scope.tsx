import type { ReactNode } from "react";
import { WorkbenchPaneScopeContext } from "@/lib/workbench-pane-scope-context";

interface WorkbenchPaneScopeProviderProps {
  scopeId: string;
  children: ReactNode;
}

export function WorkbenchPaneScopeProvider({
  scopeId,
  children,
}: WorkbenchPaneScopeProviderProps) {
  return (
    <WorkbenchPaneScopeContext.Provider value={scopeId}>
      {children}
    </WorkbenchPaneScopeContext.Provider>
  );
}
