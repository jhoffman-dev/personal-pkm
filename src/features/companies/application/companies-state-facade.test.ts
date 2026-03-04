import { companiesStateFacade, useCompaniesStore } from "@/features/companies";
import { beforeEach, describe, expect, it } from "vitest";

describe("companies state facade", () => {
  beforeEach(() => {
    companiesStateFacade.setSelectedCompanyId(null);
  });

  it("sets selected company id through facade command", () => {
    companiesStateFacade.setSelectedCompanyId("company-1");

    expect(useCompaniesStore.getState().selectedCompanyId).toBe("company-1");
  });
});
