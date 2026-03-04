import { Card, CardContent } from "@/components/ui/card";
import { useCompaniesStateFacade } from "@/features/companies";
import { useMeetingsStateFacade } from "@/features/meetings";
import { useNotesEntityStateFacade } from "@/features/notes";
import { usePeopleStateFacade } from "@/features/people";
import { useProjectsStateFacade } from "@/features/projects";
import { useTasksEntityStateFacade } from "@/features/tasks";
import { firebaseAuth } from "@/lib/firebase";
import {
  listObjectRecordsByType,
  type ObjectRecord,
  type ObjectRecordValue,
} from "@/lib/object-records-store";
import {
  listObjectTypes,
  type ObjectTypeProperty,
} from "@/lib/object-types-store";
import {
  getSystemCollectionForObjectType,
  loadObjectViewPreferences,
  type ObjectsViewMode,
} from "@/pages/objects-page-helpers";
import { buildObjectsPageCallbacks } from "@/pages/objects-page-callbacks";
import { syncBidirectionalConnection as syncBidirectionalConnectionFromConnections } from "@/pages/objects-page-connections";
import {
  useObjectsPageDataLoaded,
  useObjectsPageRecordsForSelectedType,
  useObjectsPageRequestedRecordDetail,
  useObjectsPageRequestedTypeAndView,
  useResolveObjectsPagePictureUrls,
} from "@/pages/objects-page-effects";
import { renderObjectsPageFieldInput } from "@/pages/objects-page-field-input";
import { useObjectsPageFieldDrafts } from "@/pages/objects-page-field-drafts";
import { ObjectsPageMainPanel } from "@/pages/objects-page-main-panel";
import { ObjectsPageSidebar } from "@/pages/objects-page-sidebar";
import { updateRecordField } from "@/pages/objects-page-mutations";
import { buildRecordsForType } from "@/pages/objects-page-records";
import { useAppDispatch } from "@/store";
import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export function ObjectsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { peopleState } = usePeopleStateFacade();
  const { companiesState } = useCompaniesStateFacade();
  const { projectsState } = useProjectsStateFacade();
  const { notesState } = useNotesEntityStateFacade();
  const { tasksState } = useTasksEntityStateFacade();
  const { meetingsState } = useMeetingsStateFacade();
  const objectTypes = useMemo(() => listObjectTypes(), []);
  const selectableObjectTypes = useMemo(
    () => objectTypes.filter((item) => !item.isSystem),
    [objectTypes],
  );
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(
    selectableObjectTypes[0]?.id ?? null,
  );
  const [records, setRecords] = useState<ObjectRecord[]>(() =>
    selectableObjectTypes[0]?.id
      ? listObjectRecordsByType(selectableObjectTypes[0].id)
      : [],
  );
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [viewPreferencesByTypeId, setViewPreferencesByTypeId] = useState(() =>
    loadObjectViewPreferences(),
  );
  const [viewMode, setViewMode] = useState<ObjectsViewMode>(() => {
    const firstTypeId = selectableObjectTypes[0]?.id;
    if (!firstTypeId) {
      return "table";
    }

    return loadObjectViewPreferences()[firstTypeId] ?? "table";
  });
  const [resolvedPictureUrls, setResolvedPictureUrls] = useState<
    Record<string, string>
  >({});
  const [uploadingPicturePropertyId, setUploadingPicturePropertyId] = useState<
    string | null
  >(null);
  const pictureFileInputRefs = useRef<Record<string, HTMLInputElement | null>>(
    {},
  );

  const selectedType = useMemo(
    () =>
      selectableObjectTypes.find((item) => item.id === selectedTypeId) ?? null,
    [selectableObjectTypes, selectedTypeId],
  );

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) ?? null,
    [records, selectedRecordId],
  );

  const currentUserId = firebaseAuth.currentUser?.uid ?? null;
  const selectedSystemCollection = getSystemCollectionForObjectType(
    selectedType?.id ?? null,
  );
  const requestedTypeId = searchParams.get("typeId");
  const requestedRecordId = searchParams.get("recordId");
  const requestedViewMode = searchParams.get("view");

  const getRecordsForType = useCallback(
    (typeId: string): ObjectRecord[] => {
      return buildRecordsForType({
        typeId,
        objectTypes,
        peopleState,
        companiesState,
        projectsState,
        notesState,
        tasksState,
        meetingsState,
      });
    },
    [
      companiesState,
      meetingsState,
      notesState,
      objectTypes,
      peopleState,
      projectsState,
      tasksState,
    ],
  );

  useObjectsPageDataLoaded({
    dispatch,
    peopleStatus: peopleState.status,
    companiesStatus: companiesState.status,
    projectsStatus: projectsState.status,
    notesStatus: notesState.status,
    tasksStatus: tasksState.status,
    meetingsStatus: meetingsState.status,
  });

  useObjectsPageRecordsForSelectedType({
    selectedTypeId,
    selectedType,
    selectedRecordId,
    setRecords,
    setSelectedRecordId,
    getRecordsForType,
    peopleEntities: peopleState.entities,
    peopleIds: peopleState.ids,
    companiesEntities: companiesState.entities,
    companiesIds: companiesState.ids,
    projectsEntities: projectsState.entities,
    projectsIds: projectsState.ids,
    notesEntities: notesState.entities,
    notesIds: notesState.ids,
    tasksEntities: tasksState.entities,
    tasksIds: tasksState.ids,
    meetingsEntities: meetingsState.entities,
    meetingsIds: meetingsState.ids,
  });

  useObjectsPageRequestedTypeAndView({
    requestedTypeId,
    requestedViewMode,
    selectableObjectTypes,
    selectedTypeId,
    setSelectedTypeId,
    setViewMode,
  });

  useObjectsPageRequestedRecordDetail({
    requestedTypeId,
    requestedRecordId,
    selectedTypeId,
    records,
    selectedRecordId,
    viewMode,
    setSelectedRecordId,
    setViewMode,
  });

  useResolveObjectsPagePictureUrls({
    selectedType,
    records,
    resolvedPictureUrls,
    currentUserId,
    setResolvedPictureUrls,
  });

  const handleUpdateField = (
    objectRecordId: string,
    property: ObjectTypeProperty,
    value: unknown,
  ) => {
    updateRecordField({
      selectedType,
      selectedSystemCollection,
      objectRecordId,
      property,
      value,
      records,
      dispatch,
      setRecords,
      syncBidirectionalConnection,
    });
  };

  const syncBidirectionalConnection = (params: {
    sourceRecordId: string;
    property: ObjectTypeProperty;
    previousValue: ObjectRecordValue | undefined;
    nextValue: ObjectRecordValue | undefined;
  }) => {
    syncBidirectionalConnectionFromConnections({
      selectedType,
      objectTypes,
      sourceRecordId: params.sourceRecordId,
      property: params.property,
      previousValue: params.previousValue,
      nextValue: params.nextValue,
      getRecordsForType,
      updateField: handleUpdateField,
    });
  };

  const {
    fieldDraftValues,
    setFieldDraftValues,
    commitFieldDraft,
    scheduleFieldDraftCommit,
  } = useObjectsPageFieldDrafts({
    selectedRecord,
    selectedType,
    onCommit: handleUpdateField,
  });

  const callbacks = buildObjectsPageCallbacks({
    dispatch,
    navigate,
    selectedType,
    selectedTypeId,
    selectedRecord,
    selectedSystemCollection,
    objectTypes,
    resolvedPictureUrls,
    setSelectedTypeId,
    setSelectedRecordId,
    setViewMode,
    setViewPreferencesByTypeId,
    setResolvedPictureUrls,
    setUploadingPicturePropertyId,
    setFieldDraftValues,
    commitFieldDraft,
    getRecordsForType,
    viewPreferencesByTypeId,
  });

  const renderFieldInput = (property: ObjectTypeProperty) => {
    return renderObjectsPageFieldInput({
      property,
      selectedRecord,
      selectedType,
      fieldDraftValues,
      setFieldDraftValues,
      commitFieldDraft,
      scheduleFieldDraftCommit,
      objectTypes,
      getRecordsForType,
      createRecordForType: callbacks.createRecordForType,
      updateField: handleUpdateField,
      resolveConnectionTarget: callbacks.resolveConnectionTarget,
      resolveFallbackConnectionLabel: callbacks.resolveFallbackConnectionLabel,
      navigateToConnectedRecord: callbacks.navigateToConnectedRecord,
      getResolvedPictureUrl: callbacks.getResolvedPictureUrl,
      uploadingPicturePropertyId,
      pictureFileInputRefs,
      setResolvedPictureUrls,
      uploadPictureFile: callbacks.uploadPictureFile,
    });
  };

  return (
    <section className="h-[calc(100svh-41px)] p-6">
      <Card className="h-full gap-0 py-0">
        <CardContent className="flex h-full min-h-0 p-0">
          <ObjectsPageSidebar
            selectableObjectTypes={selectableObjectTypes}
            selectedTypeId={selectedTypeId}
            selectedType={selectedType}
            selectedRecordId={selectedRecordId}
            records={records}
            onSelectType={callbacks.handleSelectType}
            onSelectRecord={callbacks.openRecordDetail}
            onCreateRecord={callbacks.handleCreateRecord}
          />

          <ObjectsPageMainPanel
            viewMode={viewMode}
            selectedType={selectedType}
            selectedRecord={selectedRecord}
            records={records}
            onSetPreferredViewMode={callbacks.setPreferredViewMode}
            onDeleteRecord={callbacks.handleDeleteRecord}
            onSelectRecordAndOpenDetail={callbacks.openRecordDetail}
            renderReadonlyPropertyValue={callbacks.renderReadonlyPropertyValue}
            getResolvedPictureUrl={callbacks.getResolvedPictureUrl}
            renderFieldInput={renderFieldInput}
          />
        </CardContent>
      </Card>
    </section>
  );
}
