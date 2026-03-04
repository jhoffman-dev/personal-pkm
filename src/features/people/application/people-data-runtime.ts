import { getDataModules } from "@/data";
import type { CreatePersonInput, UpdatePersonInput } from "@/data/entities";
import type { EntityId } from "@/data/types";
import { usePeopleStore } from "@/features/people/state";
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

export const peopleDataRuntime = {
  async fetchAll(dispatch: AppDispatch) {
    void dispatch;
    usePeopleStore.setState((state) => ({
      peopleState: {
        ...state.peopleState,
        status: "loading",
        error: null,
      },
    }));

    try {
      const records = await getDataModules().people.list();
      usePeopleStore.setState({
        peopleState: createEntityRuntimeStateFromList(records),
      });
      return records;
    } catch (error) {
      usePeopleStore.setState((state) => ({
        peopleState: {
          ...state.peopleState,
          status: "failed",
          error: toErrorMessage(error, FETCH_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async createOne(dispatch: AppDispatch, input: CreatePersonInput) {
    try {
      const created = await getDataModules().people.create(input);
      usePeopleStore.setState((state) => ({
        peopleState: upsertEntityInRuntimeState(state.peopleState, created),
      }));
      emitEntityMutationFulfilled(dispatch, "people", "createOne");
      return created;
    } catch (error) {
      usePeopleStore.setState((state) => ({
        peopleState: {
          ...state.peopleState,
          error: toErrorMessage(error, CREATE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async updateOne(
    dispatch: AppDispatch,
    params: { id: EntityId; input: UpdatePersonInput },
  ) {
    try {
      const updated = await getDataModules().people.update(
        params.id,
        params.input,
      );

      if (!updated) {
        throw new Error(`people ${params.id} not found`);
      }

      usePeopleStore.setState((state) => ({
        peopleState: upsertEntityInRuntimeState(state.peopleState, updated),
      }));
      emitEntityMutationFulfilled(dispatch, "people", "updateOne");
      return updated;
    } catch (error) {
      usePeopleStore.setState((state) => ({
        peopleState: {
          ...state.peopleState,
          error: toErrorMessage(error, UPDATE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async deleteOne(dispatch: AppDispatch, id: EntityId) {
    try {
      const deleted = await getDataModules().people.delete(id);
      if (!deleted) {
        throw new Error(`people ${id} not found`);
      }

      usePeopleStore.setState((state) => ({
        peopleState: removeEntityFromRuntimeState(state.peopleState, id),
        selectedPersonId:
          state.selectedPersonId === id ? null : state.selectedPersonId,
      }));
      emitEntityMutationFulfilled(dispatch, "people", "deleteOne");
      return id;
    } catch (error) {
      usePeopleStore.setState((state) => ({
        peopleState: {
          ...state.peopleState,
          error: toErrorMessage(error, DELETE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
};
