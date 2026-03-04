import avatarImage from "@/assets/Profile - Avatar - James Hoffman.png";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { navItems } from "@/routes/navigation";
import { prefetchRouteModule } from "@/routes/route-module-loaders";
import { isRouteActive } from "@/routes/navigation";

const user = {
  name: "James Hoffman",
  email: "software@jhoffman.dev",
  avatar: avatarImage,
};

export function AppSidebarIconRail(params: {
  activeRailRoute: string;
  onOpenSidebar: () => void;
  onSelectRailRoute: (routePath: string) => void;
}) {
  const { activeRailRoute, onOpenSidebar, onSelectRailRoute } = params;

  return (
    <Sidebar
      collapsible="none"
      className="w-[calc(var(--sidebar-width-icon)+1px)] border-r"
    >
      <SidebarHeader />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="px-1.5 md:px-0">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={{
                      children: item.title,
                      hidden: false,
                    }}
                    isActive={isRouteActive(activeRailRoute, item.to)}
                    className="px-2.5 md:px-2"
                    onMouseEnter={() => {
                      prefetchRouteModule(item.to);
                    }}
                    onFocus={() => {
                      prefetchRouteModule(item.to);
                    }}
                    onClick={() => {
                      onSelectRailRoute(item.to);
                      onOpenSidebar();
                    }}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
