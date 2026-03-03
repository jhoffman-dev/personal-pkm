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
import { NavLink } from "react-router-dom";

const user = {
  name: "James Hoffman",
  email: "software@jhoffman.dev",
  avatar: avatarImage,
};

export function AppSidebarIconRail(params: {
  pathname: string;
  onOpenSidebar: () => void;
}) {
  const { pathname, onOpenSidebar } = params;

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
                    asChild
                    tooltip={{
                      children: item.title,
                      hidden: false,
                    }}
                    isActive={isRouteActive(pathname, item.to)}
                    className="px-2.5 md:px-2"
                  >
                    <NavLink
                      to={item.to}
                      onMouseEnter={() => {
                        prefetchRouteModule(item.to);
                      }}
                      onFocus={() => {
                        prefetchRouteModule(item.to);
                      }}
                      onClick={onOpenSidebar}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
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
