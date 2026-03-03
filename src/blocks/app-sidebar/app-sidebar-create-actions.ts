import { dataActions, dataThunks, type AppDispatch } from "@/store";

export function buildAppSidebarCreateActions(dispatch: AppDispatch) {
  const createCompany = async () => {
    const created = await dispatch(
      dataThunks.companies.createOne({
        name: "New Company",
        tags: [],
        website: "",
        personIds: [],
        projectIds: [],
        noteIds: [],
        taskIds: [],
        meetingIds: [],
      }),
    ).unwrap();

    dispatch(dataActions.companies.setSelectedId(created.id));
  };

  const createPerson = async () => {
    const created = await dispatch(
      dataThunks.people.createOne({
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
      }),
    ).unwrap();

    dispatch(dataActions.people.setSelectedId(created.id));
  };

  const createMeeting = async () => {
    const created = await dispatch(
      dataThunks.meetings.createOne({
        title: "New meeting",
        tags: [],
        scheduledFor: new Date().toISOString(),
        location: "",
        personIds: [],
        companyIds: [],
        projectIds: [],
        noteIds: [],
        taskIds: [],
      }),
    ).unwrap();

    dispatch(dataActions.meetings.setSelectedId(created.id));
  };

  return {
    createCompany,
    createPerson,
    createMeeting,
  };
}
