import { getDataModules } from "@/data";
import type { CreateTaskInput, UpdateTaskInput } from "@/data/entities";
import type { EntityId } from "@/data/types";
import { useTasksEntityStore } from "@/features/tasks/state";
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

export const tasksDataRuntime = {
  async fetchAll(dispatch: AppDispatch) {
    void dispatch;
    useTasksEntityStore.setState((state) => ({
      tasksState: {
        ...state.tasksState,
        status: "loading",
        error: null,
      },
    }));

    try {
      const records = await getDataModules().tasks.list();
      useTasksEntityStore.setState({
        tasksState: createEntityRuntimeStateFromList(records),
      });
      return records;
    } catch (error) {
      useTasksEntityStore.setState((state) => ({
        tasksState: {
          ...state.tasksState,
          status: "failed",
          error: toErrorMessage(error, FETCH_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async createOne(dispatch: AppDispatch, input: CreateTaskInput) {
    try {
      const created = await getDataModules().tasks.create(input);
      useTasksEntityStore.setState((state) => ({
        tasksState: upsertEntityInRuntimeState(state.tasksState, created),
      }));
      emitEntityMutationFulfilled(dispatch, "tasks", "createOne");
      return created;
    } catch (error) {
      useTasksEntityStore.setState((state) => ({
        tasksState: {
          ...state.tasksState,
          error: toErrorMessage(error, CREATE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async updateOne(
    dispatch: AppDispatch,
    params: { id: EntityId; input: UpdateTaskInput },
  ) {
    try {
      const updated = await getDataModules().tasks.update(
        params.id,
        params.input,
      );

      if (!updated) {
        throw new Error(`tasks ${params.id} not found`);
      }

      useTasksEntityStore.setState((state) => ({
        tasksState: upsertEntityInRuntimeState(state.tasksState, updated),
      }));
      emitEntityMutationFulfilled(dispatch, "tasks", "updateOne");
      return updated;
    } catch (error) {
      useTasksEntityStore.setState((state) => ({
        tasksState: {
          ...state.tasksState,
          error: toErrorMessage(error, UPDATE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async deleteOne(dispatch: AppDispatch, id: EntityId) {
    try {
      const deleted = await getDataModules().tasks.delete(id);
      if (!deleted) {
        throw new Error(`tasks ${id} not found`);
      }

      useTasksEntityStore.setState((state) => ({
        tasksState: removeEntityFromRuntimeState(state.tasksState, id),
        selectedTaskId:
          state.selectedTaskId === id ? null : state.selectedTaskId,
      }));
      emitEntityMutationFulfilled(dispatch, "tasks", "deleteOne");
      return id;
    } catch (error) {
      useTasksEntityStore.setState((state) => ({
        tasksState: {
          ...state.tasksState,
          error: toErrorMessage(error, DELETE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
};
