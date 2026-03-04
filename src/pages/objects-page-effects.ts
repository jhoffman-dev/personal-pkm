import type { ObjectRecord } from "@/lib/object-records-store";
import type { ObjectTypeDefinition } from "@/lib/object-types-store";
import type { ObjectsViewMode } from "@/pages/objects-page-helpers";
import { companiesDataRuntime } from "@/features/companies";
import { meetingsDataRuntime } from "@/features/meetings";
import { notesDataRuntime } from "@/features/notes";
import { peopleDataRuntime } from "@/features/people";
import { projectsDataRuntime } from "@/features/projects";
import { tasksDataRuntime } from "@/features/tasks";
import { type AppDispatch } from "@/store";
import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";

export { useResolveObjectsPagePictureUrls } from "@/pages/objects-page-picture-effects";

export function useObjectsPageDataLoaded(params: {
  dispatch: AppDispatch;
  peopleStatus: string;
  companiesStatus: string;
  projectsStatus: string;
  notesStatus: string;
  tasksStatus: string;
  meetingsStatus: string;
}) {
  const {
    dispatch,
    peopleStatus,
    companiesStatus,
    projectsStatus,
    notesStatus,
    tasksStatus,
    meetingsStatus,
  } = params;

  useEffect(() => {
    if (peopleStatus === "idle") {
      void peopleDataRuntime.fetchAll(dispatch);
    }

    if (companiesStatus === "idle") {
      void companiesDataRuntime.fetchAll(dispatch);
    }

    if (projectsStatus === "idle") {
      void projectsDataRuntime.fetchAll(dispatch);
    }

    if (notesStatus === "idle") {
      void notesDataRuntime.fetchAll(dispatch);
    }

    if (tasksStatus === "idle") {
      void tasksDataRuntime.fetchAll(dispatch);
    }

    if (meetingsStatus === "idle") {
      void meetingsDataRuntime.fetchAll(dispatch);
    }
  }, [
    companiesStatus,
    dispatch,
    meetingsStatus,
    notesStatus,
    peopleStatus,
    projectsStatus,
    tasksStatus,
  ]);
}

export function useObjectsPageRecordsForSelectedType(params: {
  selectedTypeId: string | null;
  selectedType: ObjectTypeDefinition | null;
  selectedRecordId: string | null;
  setRecords: Dispatch<SetStateAction<ObjectRecord[]>>;
  setSelectedRecordId: Dispatch<SetStateAction<string | null>>;
  getRecordsForType: (typeId: string) => ObjectRecord[];
  peopleEntities: unknown;
  peopleIds: unknown;
  companiesEntities: unknown;
  companiesIds: unknown;
  projectsEntities: unknown;
  projectsIds: unknown;
  notesEntities: unknown;
  notesIds: unknown;
  tasksEntities: unknown;
  tasksIds: unknown;
  meetingsEntities: unknown;
  meetingsIds: unknown;
}) {
  const {
    selectedTypeId,
    selectedType,
    selectedRecordId,
    setRecords,
    setSelectedRecordId,
    getRecordsForType,
    peopleEntities,
    peopleIds,
    companiesEntities,
    companiesIds,
    projectsEntities,
    projectsIds,
    notesEntities,
    notesIds,
    tasksEntities,
    tasksIds,
    meetingsEntities,
    meetingsIds,
  } = params;

  useEffect(() => {
    if (!selectedTypeId || !selectedType) {
      setRecords([]);
      setSelectedRecordId(null);
      return;
    }

    const nextRecords = getRecordsForType(selectedTypeId);

    setRecords(nextRecords);
    if (!nextRecords.some((record) => record.id === selectedRecordId)) {
      setSelectedRecordId(nextRecords[0]?.id ?? null);
    }
  }, [
    companiesEntities,
    companiesIds,
    getRecordsForType,
    meetingsEntities,
    meetingsIds,
    notesEntities,
    notesIds,
    peopleEntities,
    peopleIds,
    projectsEntities,
    projectsIds,
    selectedRecordId,
    selectedType,
    selectedTypeId,
    setRecords,
    setSelectedRecordId,
    tasksEntities,
    tasksIds,
  ]);
}

export function useObjectsPageRequestedTypeAndView(params: {
  requestedTypeId: string | null;
  requestedViewMode: string | null;
  selectableObjectTypes: ObjectTypeDefinition[];
  selectedTypeId: string | null;
  setSelectedTypeId: (nextTypeId: string) => void;
  setViewMode: (nextMode: ObjectsViewMode) => void;
}) {
  const {
    requestedTypeId,
    requestedViewMode,
    selectableObjectTypes,
    selectedTypeId,
    setSelectedTypeId,
    setViewMode,
  } = params;

  useEffect(() => {
    if (!requestedTypeId) {
      return;
    }

    if (!selectableObjectTypes.some((item) => item.id === requestedTypeId)) {
      return;
    }

    if (selectedTypeId !== requestedTypeId) {
      setSelectedTypeId(requestedTypeId);
      return;
    }

    if (
      requestedViewMode === "table" ||
      requestedViewMode === "list" ||
      requestedViewMode === "cards" ||
      requestedViewMode === "detail"
    ) {
      setViewMode(requestedViewMode);
    }
  }, [
    requestedTypeId,
    requestedViewMode,
    selectableObjectTypes,
    selectedTypeId,
    setSelectedTypeId,
    setViewMode,
  ]);
}

export function useObjectsPageRequestedRecordDetail(params: {
  requestedTypeId: string | null;
  requestedRecordId: string | null;
  selectedTypeId: string | null;
  records: ObjectRecord[];
  selectedRecordId: string | null;
  viewMode: ObjectsViewMode;
  setSelectedRecordId: (recordId: string) => void;
  setViewMode: (nextMode: ObjectsViewMode) => void;
}) {
  const {
    requestedTypeId,
    requestedRecordId,
    selectedTypeId,
    records,
    selectedRecordId,
    viewMode,
    setSelectedRecordId,
    setViewMode,
  } = params;

  useEffect(() => {
    if (!requestedTypeId || !requestedRecordId) {
      return;
    }

    if (selectedTypeId !== requestedTypeId) {
      return;
    }

    if (!records.some((record) => record.id === requestedRecordId)) {
      return;
    }

    if (selectedRecordId !== requestedRecordId) {
      setSelectedRecordId(requestedRecordId);
    }

    if (viewMode !== "detail") {
      setViewMode("detail");
    }
  }, [
    records,
    requestedRecordId,
    requestedTypeId,
    selectedRecordId,
    selectedTypeId,
    setSelectedRecordId,
    setViewMode,
    viewMode,
  ]);
}
