import { getSystemCollectionForObjectType } from "@/pages/objects-page-helpers";
import {
  dataActions,
  notesTabsActions,
  tasksViewActions,
  type AppDispatch,
} from "@/store";

export function navigateToConnectedRecord(params: {
  targetTypeId: string;
  targetRecordId: string;
  dispatch: AppDispatch;
  navigate: (to: string) => void;
}): void {
  const { targetTypeId, targetRecordId, dispatch, navigate } = params;
  const targetSystemCollection = getSystemCollectionForObjectType(targetTypeId);

  if (targetSystemCollection === "notes") {
    dispatch(
      notesTabsActions.openNoteTab({ id: targetRecordId, activate: true }),
    );
    dispatch(dataActions.notes.setSelectedId(targetRecordId));
    navigate("/notes");
    return;
  }

  if (targetSystemCollection === "tasks") {
    dispatch(dataActions.tasks.setSelectedId(targetRecordId));
    dispatch(tasksViewActions.setExpandedTaskId(targetRecordId));
    navigate("/tasks");
    return;
  }

  if (targetSystemCollection === "projects") {
    dispatch(dataActions.projects.setSelectedId(targetRecordId));
    navigate("/projects");
    return;
  }

  if (targetSystemCollection === "people") {
    dispatch(dataActions.people.setSelectedId(targetRecordId));
    navigate("/people");
    return;
  }

  if (targetSystemCollection === "companies") {
    dispatch(dataActions.companies.setSelectedId(targetRecordId));
    navigate("/companies");
    return;
  }

  if (targetSystemCollection === "meetings") {
    dispatch(dataActions.meetings.setSelectedId(targetRecordId));
    navigate("/meetings");
    return;
  }

  const queryParams = new URLSearchParams();
  queryParams.set("typeId", targetTypeId);
  queryParams.set("recordId", targetRecordId);
  queryParams.set("view", "detail");
  navigate(`/objects?${queryParams.toString()}`);
}
