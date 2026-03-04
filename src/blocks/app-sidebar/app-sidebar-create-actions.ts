import {
  companiesDataRuntime,
  companiesStateFacade,
} from "@/features/companies";
import { meetingsDataRuntime, meetingsStateFacade } from "@/features/meetings";
import { peopleDataRuntime, peopleStateFacade } from "@/features/people";
import { type AppDispatch } from "@/store";

export function buildAppSidebarCreateActions(dispatch: AppDispatch) {
  const createCompany = async () => {
    const created = await companiesDataRuntime.createOne(dispatch, {
      name: "New Company",
      tags: [],
      website: "",
      personIds: [],
      projectIds: [],
      noteIds: [],
      taskIds: [],
      meetingIds: [],
    });

    companiesStateFacade.setSelectedCompanyId(created.id);
  };

  const createPerson = async () => {
    const created = await peopleDataRuntime.createOne(dispatch, {
      firstName: "New",
      lastName: "Person",
      tags: [],
      email: "",
      phone: "",
      address: "",
      companyIds: [],
      projectIds: [],
      noteIds: [],
      taskIds: [],
      meetingIds: [],
    });

    peopleStateFacade.setSelectedPersonId(created.id);
  };

  const createMeeting = async () => {
    const created = await meetingsDataRuntime.createOne(dispatch, {
      title: "New meeting",
      tags: [],
      scheduledFor: new Date().toISOString(),
      location: "",
      personIds: [],
      companyIds: [],
      projectIds: [],
      noteIds: [],
      taskIds: [],
    });

    meetingsStateFacade.setSelectedMeetingId(created.id);
  };

  return {
    createCompany,
    createPerson,
    createMeeting,
  };
}
