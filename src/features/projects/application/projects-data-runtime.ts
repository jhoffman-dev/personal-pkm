import { getDataModules } from "@/data";
import type { CreateProjectInput, UpdateProjectInput } from "@/data/entities";
import type { EntityId } from "@/data/types";
import { useProjectsStore } from "@/features/projects/state";
import { emitEntityMutationFulfilled } from "@/features/shared/application/entity-runtime-events";
import {
  createEntityRuntimeStateFromList,
  removeEntityFromRuntimeState,
  toErrorMessage,
  upsertEntityInRuntimeState,
} from "@/features/shared/application/entity-runtime-state";
import type { AppDispatch } from "@/store/store";

const FETCH_ERROR_MESSAGE = "Failed to fetch records";
const CREATE_ERROR_MESSAGE = "Failed to create record";
const UPDATE_ERROR_MESSAGE = "Failed to update record";
const DELETE_ERROR_MESSAGE = "Failed to delete record";

export const projectsDataRuntime = {
  async fetchAll(dispatch: AppDispatch) {
    void dispatch;
    useProjectsStore.setState((state) => ({
      projectsState: {
        ...state.projectsState,
        status: "loading",
        error: null,
      },
    }));

    try {
      const records = await getDataModules().projects.list();
      useProjectsStore.setState({
        projectsState: createEntityRuntimeStateFromList(records),
      });
      return records;
    } catch (error) {
      useProjectsStore.setState((state) => ({
        projectsState: {
          ...state.projectsState,
          status: "failed",
          error: toErrorMessage(error, FETCH_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async createOne(dispatch: AppDispatch, input: CreateProjectInput) {
    try {
      const created = await getDataModules().projects.create(input);
      useProjectsStore.setState((state) => ({
        projectsState: upsertEntityInRuntimeState(state.projectsState, created),
      }));
      emitEntityMutationFulfilled(dispatch, "projects", "createOne");
      return created;
    } catch (error) {
      useProjectsStore.setState((state) => ({
        projectsState: {
          ...state.projectsState,
          error: toErrorMessage(error, CREATE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async updateOne(
    dispatch: AppDispatch,
    params: { id: EntityId; input: UpdateProjectInput },
  ) {
    try {
      const updated = await getDataModules().projects.update(
        params.id,
        params.input,
      );

      if (!updated) {
        throw new Error(`projects ${params.id} not found`);
      }

      useProjectsStore.setState((state) => ({
        projectsState: upsertEntityInRuntimeState(state.projectsState, updated),
      }));
      emitEntityMutationFulfilled(dispatch, "projects", "updateOne");
      return updated;
    } catch (error) {
      useProjectsStore.setState((state) => ({
        projectsState: {
          ...state.projectsState,
          error: toErrorMessage(error, UPDATE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async deleteOne(dispatch: AppDispatch, id: EntityId) {
    try {
      const deleted = await getDataModules().projects.delete(id);
      if (!deleted) {
        throw new Error(`projects ${id} not found`);
      }

      useProjectsStore.setState((state) => ({
        projectsState: removeEntityFromRuntimeState(state.projectsState, id),
        selectedProjectId:
          state.selectedProjectId === id ? null : state.selectedProjectId,
      }));
      emitEntityMutationFulfilled(dispatch, "projects", "deleteOne");
      return id;
    } catch (error) {
      useProjectsStore.setState((state) => ({
        projectsState: {
          ...state.projectsState,
          error: toErrorMessage(error, DELETE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
};
