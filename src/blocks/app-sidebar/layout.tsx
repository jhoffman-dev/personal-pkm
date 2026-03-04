import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/blocks/app-sidebar/app-sidebar";
import { AppSidebarAssistantSection } from "@/blocks/app-sidebar/app-sidebar-assistant-section";
import { useAppSidebarAssistantState } from "@/blocks/app-sidebar/app-sidebar-assistant-state";
import { AppBar } from "@/components/app-bar";
import { DevOutputPanel } from "@/components/dev-output-panel";
import { DevRouteTimingPanel } from "@/components/dev-route-timing-panel";
import { Button } from "@/components/ui/button";
import { createEmptyNoteInput } from "@/lib/note-defaults";
import { getRouteTitle } from "@/routes/navigation";
import { prefetchRouteModule } from "@/routes/route-module-loaders";
import { useAppDispatch } from "@/store";
import {
  notesDataRuntime,
  useNotesEntityStateFacade,
  useNotesTabsFacade,
} from "@/features/notes";
import { Plus } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const WORKBENCH_LAYOUT_STORAGE_KEY = "pkm.workbench.layout.v1";
const WORKBENCH_RIGHT_SIDEBAR_STORAGE_KEY = "pkm.workbench.right-sidebar.v1";
const WORKBENCH_BOTTOM_PANEL_STORAGE_KEY = "pkm.workbench.bottom-panel.v1";
const WORKBENCH_BOTTOM_PANEL_VIEW_STORAGE_KEY =
  "pkm.workbench.bottom-panel-view.v1";
const WORKBENCH_EDITOR_GROUPS_STORAGE_KEY = "pkm.workbench.editor-groups.v1";

type BottomPanelView = "route-timing" | "output";
type EditorGroupId = "primary" | "secondary";

const DEFAULT_BOTTOM_PANEL_VIEW: BottomPanelView = "route-timing";

interface EditorGroupsState {
  isSplitLayout: boolean;
  activeGroupId: EditorGroupId;
  primaryGroupWidthPercent: number;
}

const DEFAULT_EDITOR_GROUPS_STATE: EditorGroupsState = {
  isSplitLayout: false,
  activeGroupId: "primary",
  primaryGroupWidthPercent: 50,
};

interface WorkbenchLayoutState {
  rightSidebarWidth: number;
  bottomPanelHeight: number;
}

const DEFAULT_WORKBENCH_LAYOUT_STATE: WorkbenchLayoutState = {
  rightSidebarWidth: 320,
  bottomPanelHeight: 220,
};

const MIN_RIGHT_SIDEBAR_WIDTH = 260;
const MAX_RIGHT_SIDEBAR_WIDTH = 560;
const MIN_BOTTOM_PANEL_HEIGHT = 140;
const MAX_BOTTOM_PANEL_HEIGHT = 420;
const MIN_PRIMARY_GROUP_WIDTH_PERCENT = 30;
const MAX_PRIMARY_GROUP_WIDTH_PERCENT = 70;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function loadPersistedBoolean(storageKey: string, fallback: boolean): boolean {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "boolean" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function loadPersistedBottomPanelView(): BottomPanelView {
  if (typeof window === "undefined") {
    return DEFAULT_BOTTOM_PANEL_VIEW;
  }

  const raw = window.localStorage.getItem(
    WORKBENCH_BOTTOM_PANEL_VIEW_STORAGE_KEY,
  );
  if (!raw) {
    return DEFAULT_BOTTOM_PANEL_VIEW;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed === "route-timing" || parsed === "output"
      ? parsed
      : DEFAULT_BOTTOM_PANEL_VIEW;
  } catch {
    return DEFAULT_BOTTOM_PANEL_VIEW;
  }
}

function loadWorkbenchLayoutState(): WorkbenchLayoutState {
  if (typeof window === "undefined") {
    return DEFAULT_WORKBENCH_LAYOUT_STATE;
  }

  const raw = window.localStorage.getItem(WORKBENCH_LAYOUT_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_WORKBENCH_LAYOUT_STATE;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WorkbenchLayoutState>;
    return {
      rightSidebarWidth:
        typeof parsed.rightSidebarWidth === "number"
          ? parsed.rightSidebarWidth
          : DEFAULT_WORKBENCH_LAYOUT_STATE.rightSidebarWidth,
      bottomPanelHeight:
        typeof parsed.bottomPanelHeight === "number"
          ? parsed.bottomPanelHeight
          : DEFAULT_WORKBENCH_LAYOUT_STATE.bottomPanelHeight,
    };
  } catch {
    return DEFAULT_WORKBENCH_LAYOUT_STATE;
  }
}

function loadEditorGroupsState(): EditorGroupsState {
  if (typeof window === "undefined") {
    return DEFAULT_EDITOR_GROUPS_STATE;
  }

  const raw = window.localStorage.getItem(WORKBENCH_EDITOR_GROUPS_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_EDITOR_GROUPS_STATE;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<EditorGroupsState>;
    return {
      isSplitLayout:
        typeof parsed.isSplitLayout === "boolean"
          ? parsed.isSplitLayout
          : DEFAULT_EDITOR_GROUPS_STATE.isSplitLayout,
      activeGroupId:
        parsed.activeGroupId === "primary" ||
        parsed.activeGroupId === "secondary"
          ? parsed.activeGroupId
          : DEFAULT_EDITOR_GROUPS_STATE.activeGroupId,
      primaryGroupWidthPercent:
        typeof parsed.primaryGroupWidthPercent === "number"
          ? clampNumber(
              parsed.primaryGroupWidthPercent,
              MIN_PRIMARY_GROUP_WIDTH_PERCENT,
              MAX_PRIMARY_GROUP_WIDTH_PERCENT,
            )
          : DEFAULT_EDITOR_GROUPS_STATE.primaryGroupWidthPercent,
    };
  } catch {
    return DEFAULT_EDITOR_GROUPS_STATE;
  }
}

export default function Layout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const title = getRouteTitle(pathname);
  const { openNoteTab } = useNotesTabsFacade();
  const { setSelectedNoteId } = useNotesEntityStateFacade();
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(() =>
    loadPersistedBoolean(WORKBENCH_RIGHT_SIDEBAR_STORAGE_KEY, true),
  );
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(() =>
    loadPersistedBoolean(WORKBENCH_BOTTOM_PANEL_STORAGE_KEY, false),
  );
  const [activeBottomPanelView, setActiveBottomPanelView] =
    useState<BottomPanelView>(() => loadPersistedBottomPanelView());
  const [workbenchLayoutState, setWorkbenchLayoutState] =
    useState<WorkbenchLayoutState>(() => loadWorkbenchLayoutState());
  const [editorGroupsState, setEditorGroupsState] = useState<EditorGroupsState>(
    () => loadEditorGroupsState(),
  );
  const centerWorkbenchRef = useRef<HTMLDivElement | null>(null);
  const {
    assistantState,
    sortedAssistantConversations,
    renamingConversationId,
    renameValue,
    setRenameValue,
    createConversation,
    selectConversation,
    startConversationRename,
    saveConversationRename,
    cancelConversationRename,
    toggleConversationPinned,
    deleteConversation,
  } = useAppSidebarAssistantState({
    isAssistantRoute: true,
  });

  useEffect(() => {
    window.localStorage.setItem(
      WORKBENCH_RIGHT_SIDEBAR_STORAGE_KEY,
      JSON.stringify(isRightSidebarOpen),
    );
  }, [isRightSidebarOpen]);

  useEffect(() => {
    window.localStorage.setItem(
      WORKBENCH_BOTTOM_PANEL_STORAGE_KEY,
      JSON.stringify(isBottomPanelOpen),
    );
  }, [isBottomPanelOpen]);

  useEffect(() => {
    window.localStorage.setItem(
      WORKBENCH_BOTTOM_PANEL_VIEW_STORAGE_KEY,
      JSON.stringify(activeBottomPanelView),
    );
  }, [activeBottomPanelView]);

  useEffect(() => {
    window.localStorage.setItem(
      WORKBENCH_LAYOUT_STORAGE_KEY,
      JSON.stringify(workbenchLayoutState),
    );
  }, [workbenchLayoutState]);

  useEffect(() => {
    window.localStorage.setItem(
      WORKBENCH_EDITOR_GROUPS_STORAGE_KEY,
      JSON.stringify(editorGroupsState),
    );
  }, [editorGroupsState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifierPressed = event.metaKey || event.ctrlKey;
      if (!isModifierPressed) {
        return;
      }

      const eventTarget = event.target as HTMLElement | null;
      const isTypingContext =
        eventTarget?.tagName === "INPUT" ||
        eventTarget?.tagName === "TEXTAREA" ||
        eventTarget?.isContentEditable;

      if (isTypingContext) {
        return;
      }

      if (event.altKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setIsRightSidebarOpen((previous) => !previous);
        return;
      }

      if (!event.altKey && (event.key === "\\" || event.code === "Backslash")) {
        event.preventDefault();
        setEditorGroupsState((previous) => ({
          ...previous,
          isSplitLayout: !previous.isSplitLayout,
          activeGroupId: previous.isSplitLayout
            ? "primary"
            : previous.activeGroupId,
        }));
        return;
      }

      if (!event.altKey && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setIsBottomPanelOpen((previous) => !previous);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleRightSidebarResizeStart = (
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = workbenchLayoutState.rightSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const nextWidth = clampNumber(
        startWidth + deltaX,
        MIN_RIGHT_SIDEBAR_WIDTH,
        Math.min(MAX_RIGHT_SIDEBAR_WIDTH, window.innerWidth - 320),
      );

      setWorkbenchLayoutState((previous) => ({
        ...previous,
        rightSidebarWidth: nextWidth,
      }));
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleBottomPanelResizeStart = (
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();

    const startY = event.clientY;
    const startHeight = workbenchLayoutState.bottomPanelHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const nextHeight = clampNumber(
        startHeight + deltaY,
        MIN_BOTTOM_PANEL_HEIGHT,
        Math.min(MAX_BOTTOM_PANEL_HEIGHT, window.innerHeight - 180),
      );

      setWorkbenchLayoutState((previous) => ({
        ...previous,
        bottomPanelHeight: nextHeight,
      }));
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleEditorGroupResizeStart = (
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();

    const container = centerWorkbenchRef.current;
    if (!container) {
      return;
    }

    const startX = event.clientX;
    const startWidthPercent = editorGroupsState.primaryGroupWidthPercent;
    const containerWidth = container.getBoundingClientRect().width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const nextWidthPercent = clampNumber(
        startWidthPercent + deltaPercent,
        MIN_PRIMARY_GROUP_WIDTH_PERCENT,
        MAX_PRIMARY_GROUP_WIDTH_PERCENT,
      );

      setEditorGroupsState((previous) => ({
        ...previous,
        primaryGroupWidthPercent: nextWidthPercent,
      }));
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const toggleEditorSplitLayout = () => {
    setEditorGroupsState((previous) => ({
      ...previous,
      isSplitLayout: !previous.isSplitLayout,
      activeGroupId: previous.isSplitLayout
        ? "primary"
        : previous.activeGroupId,
    }));
  };

  const setActiveEditorGroup = (groupId: EditorGroupId) => {
    setEditorGroupsState((previous) => ({
      ...previous,
      activeGroupId: groupId,
    }));
  };

  const createNoteWithTimeout = async (timeoutMs: number) => {
    const createPromise = notesDataRuntime.createOne(
      dispatch,
      createEmptyNoteInput(),
    );

    const timeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error("Timed out while creating note"));
      }, timeoutMs);
    });

    return Promise.race([createPromise, timeoutPromise]);
  };

  const handleCreateNote = async () => {
    if (isCreatingNote) {
      return;
    }

    setIsCreatingNote(true);
    try {
      const note = await createNoteWithTimeout(15000);
      openNoteTab({ id: note.id, activate: true });
      setSelectedNoteId(note.id);
      navigate("/notes");
    } catch (error) {
      console.error("Failed to create note:", error);
      window.alert(
        "Unable to create note right now. Please check your connection and Firestore rules, then try again.",
      );
    } finally {
      setIsCreatingNote(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppBar
          title={title}
          isRightSidebarOpen={isRightSidebarOpen}
          isBottomPanelOpen={isBottomPanelOpen}
          isEditorSplitLayout={editorGroupsState.isSplitLayout}
          onToggleRightSidebar={() => {
            setIsRightSidebarOpen((previous) => !previous);
          }}
          onToggleBottomPanel={() => {
            setIsBottomPanelOpen((previous) => !previous);
          }}
          onToggleEditorSplitLayout={toggleEditorSplitLayout}
        />
        <div className="relative flex min-h-0 flex-1">
          <div ref={centerWorkbenchRef} className="min-h-0 min-w-0 flex-1">
            {editorGroupsState.isSplitLayout ? (
              <div className="flex h-full min-h-0 min-w-0">
                <section
                  className="flex min-h-0 min-w-0 flex-col border-r"
                  style={{
                    width: `${editorGroupsState.primaryGroupWidthPercent}%`,
                  }}
                >
                  <button
                    type="button"
                    className="bg-muted/20 hover:bg-muted/30 flex h-7 items-center justify-between border-b px-2 text-xs"
                    onClick={() => {
                      setActiveEditorGroup("primary");
                    }}
                  >
                    <span>Group 1</span>
                    {editorGroupsState.activeGroupId === "primary" ? (
                      <span className="text-muted-foreground">Active</span>
                    ) : null}
                  </button>
                  <div className="min-h-0 min-w-0 flex-1">
                    {editorGroupsState.activeGroupId === "primary" ? (
                      <Outlet />
                    ) : (
                      <div className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-sm">
                        Group 1 is ready. Select this group to move the active
                        route here.
                      </div>
                    )}
                  </div>
                </section>

                <div
                  role="separator"
                  aria-orientation="vertical"
                  className="z-10 w-1 -translate-x-1/2 cursor-col-resize bg-transparent hover:bg-border"
                  onMouseDown={handleEditorGroupResizeStart}
                />

                <section className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <button
                    type="button"
                    className="bg-muted/20 hover:bg-muted/30 flex h-7 items-center justify-between border-b px-2 text-xs"
                    onClick={() => {
                      setActiveEditorGroup("secondary");
                    }}
                  >
                    <span>Group 2</span>
                    {editorGroupsState.activeGroupId === "secondary" ? (
                      <span className="text-muted-foreground">Active</span>
                    ) : null}
                  </button>
                  <div className="min-h-0 min-w-0 flex-1">
                    {editorGroupsState.activeGroupId === "secondary" ? (
                      <Outlet />
                    ) : (
                      <div className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-sm">
                        Group 2 is ready. Select this group to move the active
                        route here.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            ) : (
              <div className="min-h-0 min-w-0 h-full">
                <Outlet />
              </div>
            )}
          </div>

          {isRightSidebarOpen ? (
            <aside
              className="bg-sidebar relative border-l"
              style={{ width: `${workbenchLayoutState.rightSidebarWidth}px` }}
            >
              <div
                role="separator"
                aria-orientation="vertical"
                className="absolute top-0 left-0 z-30 h-full w-1 -translate-x-1/2 cursor-col-resize bg-transparent hover:bg-border"
                onMouseDown={handleRightSidebarResizeStart}
              />
              <div className="h-full overflow-y-auto py-2">
                <AppSidebarAssistantSection
                  conversations={sortedAssistantConversations}
                  activeConversationId={assistantState.activeConversationId}
                  renamingConversationId={renamingConversationId}
                  renameValue={renameValue}
                  onRenameValueChange={setRenameValue}
                  onCreateConversation={createConversation}
                  onSelectConversation={selectConversation}
                  onStartRename={startConversationRename}
                  onSaveRename={saveConversationRename}
                  onCancelRename={cancelConversationRename}
                  onTogglePinned={toggleConversationPinned}
                  onDeleteConversation={deleteConversation}
                />
              </div>
            </aside>
          ) : null}

          {isBottomPanelOpen ? (
            <section
              className="bg-background/95 absolute bottom-0 left-0 z-20 border-t backdrop-blur"
              style={{
                right: isRightSidebarOpen
                  ? `${workbenchLayoutState.rightSidebarWidth}px`
                  : "0px",
                height: `${workbenchLayoutState.bottomPanelHeight}px`,
              }}
            >
              <div
                role="separator"
                aria-orientation="horizontal"
                className="absolute top-0 left-0 z-30 h-1 w-full -translate-y-1/2 cursor-row-resize bg-transparent hover:bg-border"
                onMouseDown={handleBottomPanelResizeStart}
              />
              <div className="bg-muted/20 flex h-8 items-center justify-between border-b px-2">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="xs"
                    variant={
                      activeBottomPanelView === "route-timing"
                        ? "secondary"
                        : "ghost"
                    }
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setActiveBottomPanelView("route-timing");
                    }}
                  >
                    Route Timing
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant={
                      activeBottomPanelView === "output" ? "secondary" : "ghost"
                    }
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setActiveBottomPanelView("output");
                    }}
                  >
                    Output
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">Cmd/Ctrl+J</p>
              </div>
              <div className="h-[calc(100%-2rem)] min-h-0 overflow-hidden">
                {activeBottomPanelView === "route-timing" ? (
                  <DevRouteTimingPanel mode="docked" />
                ) : (
                  <DevOutputPanel />
                )}
              </div>
            </section>
          ) : null}
        </div>
        <Button
          type="button"
          size="icon"
          className="fixed right-6 bottom-6 z-50 size-12 rounded-full"
          onMouseEnter={() => {
            prefetchRouteModule("/notes");
          }}
          onFocus={() => {
            prefetchRouteModule("/notes");
          }}
          onClick={() => {
            void handleCreateNote();
          }}
          disabled={isCreatingNote}
          aria-label="Create new note"
        >
          <Plus className="size-5" />
        </Button>
        {import.meta.env.DEV && !isBottomPanelOpen ? (
          <DevRouteTimingPanel />
        ) : null}
      </SidebarInset>
    </SidebarProvider>
  );
}
