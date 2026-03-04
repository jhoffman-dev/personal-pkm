import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
  PanelBottom,
  PanelRight,
  Search,
} from "lucide-react";

export function AppBar({
  title,
  isRightSidebarOpen = false,
  isBottomPanelOpen = false,
  isEditorSplitLayout = false,
  onToggleRightSidebar,
  onToggleBottomPanel,
  onToggleEditorSplitLayout,
}: {
  title: string;
  isRightSidebarOpen?: boolean;
  isBottomPanelOpen?: boolean;
  isEditorSplitLayout?: boolean;
  onToggleRightSidebar?: () => void;
  onToggleBottomPanel?: () => void;
  onToggleEditorSplitLayout?: () => void;
}) {
  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoForward = () => {
    window.history.forward();
  };

  return (
    <header className="flex h-[41px] shrink-0 items-center border-b bg-background px-2">
      <div className="flex w-full min-w-0 items-center">
        <div className="flex min-w-0 shrink-0 items-center gap-1.5">
          <SidebarTrigger className="size-8" />
          <Separator
            orientation="vertical"
            className="mx-1 data-[orientation=vertical]:h-4"
          />

          <div className="hidden w-36 shrink-0 items-center md:flex">
            <p className="text-muted-foreground truncate text-xs">{title}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 justify-center px-2">
          <div className="flex w-full max-w-2xl items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleGoBack}
              aria-label="Go back"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleGoForward}
              aria-label="Go forward"
            >
              <ArrowRight className="size-4" />
            </Button>

            <div className="relative min-w-0 flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <Input
                className="h-8 border-muted pl-8 text-sm"
                placeholder="Search, commands, and files"
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant={isEditorSplitLayout ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label="Toggle split editor groups"
            title="Toggle split editor groups (Cmd/Ctrl+\\)"
            onClick={onToggleEditorSplitLayout}
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            type="button"
            variant={isBottomPanelOpen ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label="Toggle bottom panel"
            title="Toggle bottom panel"
            onClick={onToggleBottomPanel}
          >
            <PanelBottom className="size-4" />
          </Button>
          <Button
            type="button"
            variant={isRightSidebarOpen ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label="Toggle right sidebar"
            title="Toggle right sidebar"
            onClick={onToggleRightSidebar}
          >
            <PanelRight className="size-4" />
          </Button>

          <div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
