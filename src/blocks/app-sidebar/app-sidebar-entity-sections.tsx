import { Button } from "@/components/ui/button";
import {
  getSidebarOpenTargetFromModifierKeys,
  type AppSidebarOpenTarget,
} from "@/blocks/app-sidebar/app-sidebar-open-target";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Plus } from "lucide-react";

export function AppSidebarMeetingsSection(params: {
  meetings: Array<{ id: string; title: string }>;
  selectedMeetingId: string | null;
  onCreateMeeting: () => void;
  onSelectMeeting: (
    meetingId: string,
    openTarget: AppSidebarOpenTarget,
  ) => void;
}) {
  const { meetings, selectedMeetingId, onCreateMeeting, onSelectMeeting } =
    params;

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between pr-2">
        <span>Meetings</span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onCreateMeeting}
          aria-label="Create meeting"
        >
          <Plus />
        </Button>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        {meetings.length === 0 ? (
          <p className="text-sidebar-foreground/70 px-2 py-1 text-xs">
            No meetings yet.
          </p>
        ) : (
          <SidebarMenu>
            {meetings.map((meeting) => (
              <SidebarMenuItem key={meeting.id}>
                <SidebarMenuButton
                  isActive={selectedMeetingId === meeting.id}
                  onClick={(event) => {
                    onSelectMeeting(
                      meeting.id,
                      getSidebarOpenTargetFromModifierKeys({
                        altKey: event.altKey,
                        metaKey: event.metaKey,
                        ctrlKey: event.ctrlKey,
                      }),
                    );
                  }}
                  onAuxClick={(event) => {
                    if (event.button !== 1) {
                      return;
                    }

                    onSelectMeeting(meeting.id, "active-pane-new-tab");
                  }}
                >
                  <span>{meeting.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebarCompaniesSection(params: {
  companies: Array<{ id: string; name: string }>;
  selectedCompanyId: string | null;
  onCreateCompany: () => void;
  onSelectCompany: (
    companyId: string,
    openTarget: AppSidebarOpenTarget,
  ) => void;
}) {
  const { companies, selectedCompanyId, onCreateCompany, onSelectCompany } =
    params;

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between pr-2">
        <span>Companies</span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onCreateCompany}
          aria-label="Create company"
        >
          <Plus />
        </Button>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        {companies.length === 0 ? (
          <p className="text-sidebar-foreground/70 px-2 py-1 text-xs">
            No companies yet.
          </p>
        ) : (
          <SidebarMenu>
            {companies.map((company) => (
              <SidebarMenuItem key={company.id}>
                <SidebarMenuButton
                  isActive={selectedCompanyId === company.id}
                  onClick={(event) => {
                    onSelectCompany(
                      company.id,
                      getSidebarOpenTargetFromModifierKeys({
                        altKey: event.altKey,
                        metaKey: event.metaKey,
                        ctrlKey: event.ctrlKey,
                      }),
                    );
                  }}
                  onAuxClick={(event) => {
                    if (event.button !== 1) {
                      return;
                    }

                    onSelectCompany(company.id, "active-pane-new-tab");
                  }}
                >
                  <span>{company.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebarPeopleSection(params: {
  people: Array<{ id: string; firstName?: string; lastName?: string }>;
  selectedPersonId: string | null;
  onCreatePerson: () => void;
  onSelectPerson: (personId: string, openTarget: AppSidebarOpenTarget) => void;
}) {
  const { people, selectedPersonId, onCreatePerson, onSelectPerson } = params;

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between pr-2">
        <span>People</span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onCreatePerson}
          aria-label="Create person"
        >
          <Plus />
        </Button>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        {people.length === 0 ? (
          <p className="text-sidebar-foreground/70 px-2 py-1 text-xs">
            No people yet.
          </p>
        ) : (
          <SidebarMenu>
            {people.map((person) => {
              const fullName =
                `${person.lastName ?? ""}, ${person.firstName ?? ""}`
                  .replace(/^\s*,\s*|\s*,\s*$/g, "")
                  .trim() || "Unnamed person";

              return (
                <SidebarMenuItem key={person.id}>
                  <SidebarMenuButton
                    isActive={selectedPersonId === person.id}
                    onClick={(event) => {
                      onSelectPerson(
                        person.id,
                        getSidebarOpenTargetFromModifierKeys({
                          altKey: event.altKey,
                          metaKey: event.metaKey,
                          ctrlKey: event.ctrlKey,
                        }),
                      );
                    }}
                    onAuxClick={(event) => {
                      if (event.button !== 1) {
                        return;
                      }

                      onSelectPerson(person.id, "active-pane-new-tab");
                    }}
                  >
                    <span>{fullName}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
