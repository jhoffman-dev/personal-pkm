import { companiesDataRuntime } from "@/features/companies/application/companies-data-runtime";
import { meetingsDataRuntime } from "@/features/meetings/application/meetings-data-runtime";
import { notesDataRuntime } from "@/features/notes/application/notes-data-runtime";
import { peopleDataRuntime } from "@/features/people/application/people-data-runtime";
import { projectsDataRuntime } from "@/features/projects/application/projects-data-runtime";
import { tasksDataRuntime } from "@/features/tasks/application/tasks-data-runtime";

const mutationFulfilledPattern =
  /\/(createOne|updateOne|deleteOne)\/fulfilled$/;

export interface RuntimeDispatchAction {
  type: string;
}

export type AppDispatch = (
  action: RuntimeDispatchAction,
) => RuntimeDispatchAction;

async function syncAllDomainRelations(dispatch: AppDispatch): Promise<void> {
  await Promise.all([
    projectsDataRuntime.fetchAll(dispatch),
    notesDataRuntime.fetchAll(dispatch),
    tasksDataRuntime.fetchAll(dispatch),
    meetingsDataRuntime.fetchAll(dispatch),
    companiesDataRuntime.fetchAll(dispatch),
    peopleDataRuntime.fetchAll(dispatch),
  ]);
}

const dispatch: AppDispatch = (action) => {
  if (mutationFulfilledPattern.test(action.type)) {
    void syncAllDomainRelations(dispatch);
  }

  return action;
};

export const store = {
  dispatch,
};
