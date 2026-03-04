import { getDataModules } from "@/data";
import type { CreateNoteInput, UpdateNoteInput } from "@/data/entities";
import type { EntityId } from "@/data/types";
import { useNotesEntityStore } from "@/features/notes/state";
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

export const notesDataRuntime = {
  async fetchAll(dispatch: AppDispatch) {
    void dispatch;
    useNotesEntityStore.setState((state) => ({
      notesState: {
        ...state.notesState,
        status: "loading",
        error: null,
      },
    }));

    try {
      const records = await getDataModules().notes.list();
      useNotesEntityStore.setState({
        notesState: createEntityRuntimeStateFromList(records),
      });
      return records;
    } catch (error) {
      useNotesEntityStore.setState((state) => ({
        notesState: {
          ...state.notesState,
          status: "failed",
          error: toErrorMessage(error, FETCH_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async createOne(dispatch: AppDispatch, input: CreateNoteInput) {
    try {
      const created = await getDataModules().notes.create(input);
      useNotesEntityStore.setState((state) => ({
        notesState: upsertEntityInRuntimeState(state.notesState, created),
      }));
      emitEntityMutationFulfilled(dispatch, "notes", "createOne");
      return created;
    } catch (error) {
      useNotesEntityStore.setState((state) => ({
        notesState: {
          ...state.notesState,
          error: toErrorMessage(error, CREATE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async updateOne(
    dispatch: AppDispatch,
    params: { id: EntityId; input: UpdateNoteInput },
  ) {
    try {
      const updated = await getDataModules().notes.update(
        params.id,
        params.input,
      );

      if (!updated) {
        throw new Error(`notes ${params.id} not found`);
      }

      useNotesEntityStore.setState((state) => ({
        notesState: upsertEntityInRuntimeState(state.notesState, updated),
      }));
      emitEntityMutationFulfilled(dispatch, "notes", "updateOne");
      return updated;
    } catch (error) {
      useNotesEntityStore.setState((state) => ({
        notesState: {
          ...state.notesState,
          error: toErrorMessage(error, UPDATE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async deleteOne(dispatch: AppDispatch, id: EntityId) {
    try {
      const deleted = await getDataModules().notes.delete(id);
      if (!deleted) {
        throw new Error(`notes ${id} not found`);
      }

      useNotesEntityStore.setState((state) => ({
        notesState: removeEntityFromRuntimeState(state.notesState, id),
        selectedNoteId:
          state.selectedNoteId === id ? null : state.selectedNoteId,
      }));
      emitEntityMutationFulfilled(dispatch, "notes", "deleteOne");
      return id;
    } catch (error) {
      useNotesEntityStore.setState((state) => ({
        notesState: {
          ...state.notesState,
          error: toErrorMessage(error, DELETE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
};
