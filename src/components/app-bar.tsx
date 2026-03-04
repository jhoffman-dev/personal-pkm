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
    <header className="flex h-[41px] items-center border-b bg-background px-2">
      <div className="flex w-full items-center gap-1.5">
        <SidebarTrigger className="size-8" />
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
        <Separator
          orientation="vertical"
          className="mx-1 data-[orientation=vertical]:h-4"
        />

        <p className="text-muted-foreground hidden text-xs md:block">{title}</p>

        <div className="relative min-w-0 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            className="h-8 border-muted pl-8 text-sm"
            placeholder="Search, commands, and files"
          />
        </div>

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
    </header>
  );
}
