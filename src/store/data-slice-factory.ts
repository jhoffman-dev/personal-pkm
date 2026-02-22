import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

import { getDataModules } from "@/data";
import type { DataModules } from "@/data/interfaces";
import type { EntityId } from "@/data/types";

export type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

type IdEntity = { id: EntityId };

type ModuleWithAssociated<TEntity, TCreate, TUpdate, TAssociated> = {
  list: () => Promise<TEntity[]>;
  create: (input: TCreate) => Promise<TEntity>;
  update: (id: EntityId, input: TUpdate) => Promise<TEntity | null>;
  delete: (id: EntityId) => Promise<boolean>;
  getAssociatedRecords: (id: EntityId) => Promise<TAssociated | null>;
};

export interface EntitySliceState<TEntity extends IdEntity, TAssociated> {
  ids: EntityId[];
  entities: Record<EntityId, TEntity>;
  status: AsyncStatus;
  error: string | null;
  selectedId: EntityId | null;
  associatedById: Record<EntityId, TAssociated>;
  associatedStatusById: Record<EntityId, AsyncStatus>;
  associatedErrorById: Record<EntityId, string | null>;
}

function createInitialState<
  TEntity extends IdEntity,
  TAssociated,
>(): EntitySliceState<TEntity, TAssociated> {
  return {
    ids: [],
    entities: {},
    status: "idle",
    error: null,
    selectedId: null,
    associatedById: {},
    associatedStatusById: {},
    associatedErrorById: {},
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
}

export function createDataModuleSlice<
  TEntity extends IdEntity,
  TCreate extends object,
  TUpdate extends object,
  TAssociated extends object,
>(name: string, moduleKey: keyof DataModules) {
  const resolveModule = (): ModuleWithAssociated<
    TEntity,
    TCreate,
    TUpdate,
    TAssociated
  > => {
    return getDataModules()[moduleKey] as unknown as ModuleWithAssociated<
      TEntity,
      TCreate,
      TUpdate,
      TAssociated
    >;
  };

  const fetchAll = createAsyncThunk(`${name}/fetchAll`, async () => {
    const module = resolveModule();
    return module.list();
  });

  const createOne = createAsyncThunk(
    `${name}/createOne`,
    async (input: TCreate) => {
      const module = resolveModule();
      return module.create(input);
    },
  );

  const updateOne = createAsyncThunk(
    `${name}/updateOne`,
    async ({ id, input }: { id: EntityId; input: TUpdate }) => {
      const module = resolveModule();
      const updated = await module.update(id, input);
      if (!updated) {
        throw new Error(`${name} ${id} not found`);
      }
      return updated;
    },
  );

  const deleteOne = createAsyncThunk(
    `${name}/deleteOne`,
    async (id: EntityId) => {
      const module = resolveModule();
      const deleted = await module.delete(id);
      if (!deleted) {
        throw new Error(`${name} ${id} not found`);
      }
      return id;
    },
  );

  const fetchAssociated = createAsyncThunk(
    `${name}/fetchAssociated`,
    async (id: EntityId) => {
      const module = resolveModule();
      const associated = await module.getAssociatedRecords(id);
      if (!associated) {
        throw new Error(`${name} ${id} not found`);
      }
      return { id, associated };
    },
  );

  const slice = createSlice({
    name,
    initialState: createInitialState<TEntity, TAssociated>(),
    reducers: {
      setSelectedId(state, action: PayloadAction<EntityId | null>) {
        state.selectedId = action.payload;
      },
      clearError(state) {
        state.error = null;
      },
      clearAssociated(state, action: PayloadAction<EntityId>) {
        const id = action.payload;
        delete state.associatedById[id];
        delete state.associatedStatusById[id];
        delete state.associatedErrorById[id];
      },
    },
    extraReducers: (builder) => {
      builder
        .addCase(fetchAll.pending, (state) => {
          state.status = "loading";
          state.error = null;
        })
        .addCase(fetchAll.fulfilled, (state, action) => {
          const mutableState = state as unknown as EntitySliceState<
            TEntity,
            TAssociated
          >;

          mutableState.status = "succeeded";
          mutableState.ids = action.payload.map((item) => item.id);
          mutableState.entities = action.payload.reduce<
            Record<EntityId, TEntity>
          >((acc, item) => {
            acc[item.id] = item;
            return acc;
          }, {});
        })
        .addCase(fetchAll.rejected, (state, action) => {
          state.status = "failed";
          state.error = action.error.message ?? "Failed to fetch records";
        });

      builder
        .addCase(createOne.fulfilled, (state, action) => {
          const mutableState = state as unknown as EntitySliceState<
            TEntity,
            TAssociated
          >;
          const item = action.payload;
          const exists = Boolean(mutableState.entities[item.id]);
          mutableState.entities[item.id] = item;
          if (!exists) {
            mutableState.ids.push(item.id);
          }
        })
        .addCase(createOne.rejected, (state, action) => {
          state.error = action.error.message ?? "Failed to create record";
        });

      builder
        .addCase(updateOne.fulfilled, (state, action) => {
          const mutableState = state as unknown as EntitySliceState<
            TEntity,
            TAssociated
          >;
          const item = action.payload;
          const exists = Boolean(mutableState.entities[item.id]);
          mutableState.entities[item.id] = item;
          if (!exists) {
            mutableState.ids.push(item.id);
          }
        })
        .addCase(updateOne.rejected, (state, action) => {
          state.error = action.error.message ?? "Failed to update record";
        });

      builder
        .addCase(deleteOne.fulfilled, (state, action) => {
          const mutableState = state as unknown as EntitySliceState<
            TEntity,
            TAssociated
          >;
          const id = action.payload;
          delete mutableState.entities[id];
          mutableState.ids = mutableState.ids.filter(
            (existingId) => existingId !== id,
          );
          if (mutableState.selectedId === id) {
            mutableState.selectedId = null;
          }
        })
        .addCase(deleteOne.rejected, (state, action) => {
          state.error = action.error.message ?? "Failed to delete record";
        });

      builder
        .addCase(fetchAssociated.pending, (state, action) => {
          const id = action.meta.arg;
          state.associatedStatusById[id] = "loading";
          state.associatedErrorById[id] = null;
        })
        .addCase(fetchAssociated.fulfilled, (state, action) => {
          const mutableState = state as unknown as EntitySliceState<
            TEntity,
            TAssociated
          >;
          const { id, associated } = action.payload;
          mutableState.associatedById[id] = associated as TAssociated;
          mutableState.associatedStatusById[id] = "succeeded";
          mutableState.associatedErrorById[id] = null;
        })
        .addCase(fetchAssociated.rejected, (state, action) => {
          const id = action.meta.arg;
          state.associatedStatusById[id] = "failed";
          state.associatedErrorById[id] =
            action.error.message ?? toErrorMessage(action.error);
        });
    },
  });

  return {
    reducer: slice.reducer,
    actions: slice.actions,
    thunks: {
      fetchAll,
      createOne,
      updateOne,
      deleteOne,
      fetchAssociated,
    },
  };
}
