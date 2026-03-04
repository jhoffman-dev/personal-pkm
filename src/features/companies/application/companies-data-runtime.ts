import { getDataModules } from "@/data";
import type { CreateCompanyInput, UpdateCompanyInput } from "@/data/entities";
import type { EntityId } from "@/data/types";
import { useCompaniesStore } from "@/features/companies/state";
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

export const companiesDataRuntime = {
  async fetchAll(dispatch: AppDispatch) {
    void dispatch;
    useCompaniesStore.setState((state) => ({
      companiesState: {
        ...state.companiesState,
        status: "loading",
        error: null,
      },
    }));

    try {
      const records = await getDataModules().companies.list();
      useCompaniesStore.setState({
        companiesState: createEntityRuntimeStateFromList(records),
      });
      return records;
    } catch (error) {
      useCompaniesStore.setState((state) => ({
        companiesState: {
          ...state.companiesState,
          status: "failed",
          error: toErrorMessage(error, FETCH_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async createOne(dispatch: AppDispatch, input: CreateCompanyInput) {
    try {
      const created = await getDataModules().companies.create(input);
      useCompaniesStore.setState((state) => ({
        companiesState: upsertEntityInRuntimeState(
          state.companiesState,
          created,
        ),
      }));
      emitEntityMutationFulfilled(dispatch, "companies", "createOne");
      return created;
    } catch (error) {
      useCompaniesStore.setState((state) => ({
        companiesState: {
          ...state.companiesState,
          error: toErrorMessage(error, CREATE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async updateOne(
    dispatch: AppDispatch,
    params: { id: EntityId; input: UpdateCompanyInput },
  ) {
    try {
      const updated = await getDataModules().companies.update(
        params.id,
        params.input,
      );

      if (!updated) {
        throw new Error(`companies ${params.id} not found`);
      }

      useCompaniesStore.setState((state) => ({
        companiesState: upsertEntityInRuntimeState(
          state.companiesState,
          updated,
        ),
      }));
      emitEntityMutationFulfilled(dispatch, "companies", "updateOne");
      return updated;
    } catch (error) {
      useCompaniesStore.setState((state) => ({
        companiesState: {
          ...state.companiesState,
          error: toErrorMessage(error, UPDATE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
  async deleteOne(dispatch: AppDispatch, id: EntityId) {
    try {
      const deleted = await getDataModules().companies.delete(id);
      if (!deleted) {
        throw new Error(`companies ${id} not found`);
      }

      useCompaniesStore.setState((state) => ({
        companiesState: removeEntityFromRuntimeState(state.companiesState, id),
        selectedCompanyId:
          state.selectedCompanyId === id ? null : state.selectedCompanyId,
      }));
      emitEntityMutationFulfilled(dispatch, "companies", "deleteOne");
      return id;
    } catch (error) {
      useCompaniesStore.setState((state) => ({
        companiesState: {
          ...state.companiesState,
          error: toErrorMessage(error, DELETE_ERROR_MESSAGE),
        },
      }));
      throw error;
    }
  },
};
