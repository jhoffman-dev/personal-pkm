import { getSystemCollectionForObjectType } from "@/pages/objects-page-helpers";
import { companiesStateFacade } from "@/features/companies";
import { meetingsStateFacade } from "@/features/meetings";
import { notesEntityStateFacade } from "@/features/notes";
import { peopleStateFacade } from "@/features/people";
import { notesTabsFacade } from "@/features/notes";
import { projectsStateFacade } from "@/features/projects";
import { tasksEntityStateFacade, tasksViewFacade } from "@/features/tasks";

export function navigateToConnectedRecord(params: {
  targetTypeId: string;
  targetRecordId: string;
  navigate: (to: string) => void;
}): void {
  const { targetTypeId, targetRecordId, navigate } = params;
  const targetSystemCollection = getSystemCollectionForObjectType(targetTypeId);

  if (targetSystemCollection === "notes") {
    notesTabsFacade.openNoteTab({ id: targetRecordId, activate: true });
    notesEntityStateFacade.setSelectedNoteId(targetRecordId);
    navigate("/notes");
    return;
  }

  if (targetSystemCollection === "tasks") {
    tasksEntityStateFacade.setSelectedTaskId(targetRecordId);
    tasksViewFacade.setExpandedTaskId(targetRecordId);
    navigate("/tasks");
    return;
  }

  if (targetSystemCollection === "projects") {
    projectsStateFacade.setSelectedProjectId(targetRecordId);
    navigate("/projects");
    return;
  }

  if (targetSystemCollection === "people") {
    peopleStateFacade.setSelectedPersonId(targetRecordId);
    navigate("/people");
    return;
  }

  if (targetSystemCollection === "companies") {
    companiesStateFacade.setSelectedCompanyId(targetRecordId);
    navigate("/companies");
    return;
  }

  if (targetSystemCollection === "meetings") {
    meetingsStateFacade.setSelectedMeetingId(targetRecordId);
    navigate("/meetings");
    return;
  }

  const queryParams = new URLSearchParams();
  queryParams.set("typeId", targetTypeId);
  queryParams.set("recordId", targetRecordId);
  queryParams.set("view", "detail");
  navigate(`/objects?${queryParams.toString()}`);
}
