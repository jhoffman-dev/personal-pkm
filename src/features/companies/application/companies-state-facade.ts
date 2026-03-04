import { useCompaniesStore } from "@/features/companies/state";
import { useMemo } from "react";

export function useCompaniesStateFacade() {
  const runtimeCompaniesState = useCompaniesStore(
    (state) => state.companiesState,
  );
  const selectedCompanyId = useCompaniesStore(
    (state) => state.selectedCompanyId,
  );
  const setSelectedCompanyIdInStore = useCompaniesStore(
    (state) => state.setSelectedCompanyId,
  );

  const companiesState = useMemo(
    () => ({
      ...runtimeCompaniesState,
      selectedId: selectedCompanyId,
    }),
    [runtimeCompaniesState, selectedCompanyId],
  );

  const setSelectedCompanyId = (companyId: string | null) => {
    setSelectedCompanyIdInStore(companyId);
  };

  return {
    companiesState,
    setSelectedCompanyId,
  };
}

export const companiesStateFacade = {
  setSelectedCompanyId(companyId: string | null) {
    useCompaniesStore.getState().setSelectedCompanyId(companyId);
  },
};
