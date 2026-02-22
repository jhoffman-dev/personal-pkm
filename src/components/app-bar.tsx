import { ThemeToggle } from "./theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppBar({ title }: { title: string }) {
  return (
    <header className="flex h-[41px] items-center border-b">
      <div className="flex w-full items-center gap-1 px-4 place-content-between">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
