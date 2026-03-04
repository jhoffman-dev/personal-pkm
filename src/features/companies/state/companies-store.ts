import type { Company } from "@/data/entities";
import type { EntityId } from "@/data/types";
import {
  createInitialEntityRuntimeState,
  type EntityRuntimeState,
} from "@/features/shared/application/entity-runtime-state";
import { create } from "zustand";

export interface CompaniesStoreState {
  selectedCompanyId: EntityId | null;
  companiesState: EntityRuntimeState<Company>;
  setSelectedCompanyId: (id: EntityId | null) => void;
}

export const useCompaniesStore = create<CompaniesStoreState>((set) => ({
  selectedCompanyId: null,
  companiesState: createInitialEntityRuntimeState<Company>(),
  setSelectedCompanyId: (id) => {
    set({ selectedCompanyId: id });
  },
}));
