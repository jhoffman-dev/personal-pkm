import { getDataModules } from "@/data";
import type { CreateMeetingInput, UpdateMeetingInput } from "@/data/entities";
import type { EntityId } from "@/data/types";
import { useMeetingsStore } from "@/features/meetings/state";
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

export const meetingsDataRuntime = {
  async fetchAll(dispatch: AppDispatch) {
    void dispatch;
    useMeetingsStore.setState((state) => ({
      meetingsState: {
        ...state.meetingsState,
        status: "loading",
        error: null,
      },
    }));

    try {
      const records = await getDataModules().meetings.list();
      useMeetingsStore.setState({
        meetingsState: createEntityRuntimeStateFromList(records),
      });
      return records;
    } catch (error) {
      useMeetingsStore.setState((state) => ({
        meetingsState: {
          ...state.meetingsState,
          status: "failed",
          error: toErrorMessage(error, FETCH_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async createOne(dispatch: AppDispatch, input: CreateMeetingInput) {
    try {
      const created = await getDataModules().meetings.create(input);
      useMeetingsStore.setState((state) => ({
        meetingsState: upsertEntityInRuntimeState(state.meetingsState, created),
      }));
      emitEntityMutationFulfilled(dispatch, "meetings", "createOne");
      return created;
    } catch (error) {
      useMeetingsStore.setState((state) => ({
        meetingsState: {
          ...state.meetingsState,
          error: toErrorMessage(error, CREATE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async updateOne(
    dispatch: AppDispatch,
    params: { id: EntityId; input: UpdateMeetingInput },
  ) {
    try {
      const updated = await getDataModules().meetings.update(
        params.id,
        params.input,
      );

      if (!updated) {
        throw new Error(`meetings ${params.id} not found`);
      }

      useMeetingsStore.setState((state) => ({
        meetingsState: upsertEntityInRuntimeState(state.meetingsState, updated),
      }));
      emitEntityMutationFulfilled(dispatch, "meetings", "updateOne");
      return updated;
    } catch (error) {
      useMeetingsStore.setState((state) => ({
        meetingsState: {
          ...state.meetingsState,
          error: toErrorMessage(error, UPDATE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async deleteOne(dispatch: AppDispatch, id: EntityId) {
    try {
      const deleted = await getDataModules().meetings.delete(id);
      if (!deleted) {
        throw new Error(`meetings ${id} not found`);
      }

      useMeetingsStore.setState((state) => ({
        meetingsState: removeEntityFromRuntimeState(state.meetingsState, id),
        selectedMeetingId:
          state.selectedMeetingId === id ? null : state.selectedMeetingId,
      }));
      emitEntityMutationFulfilled(dispatch, "meetings", "deleteOne");
      return id;
    } catch (error) {
      useMeetingsStore.setState((state) => ({
        meetingsState: {
          ...state.meetingsState,
          error: toErrorMessage(error, DELETE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
};
