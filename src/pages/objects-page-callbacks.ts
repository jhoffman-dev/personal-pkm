import { firebaseAuth } from "@/lib/firebase";
import { uploadObjectImageForUser } from "@/lib/object-images-storage";
import type {
  ObjectRecord,
  ObjectRecordValue,
} from "@/lib/object-records-store";
import type {
  ObjectTypeDefinition,
  ObjectTypeProperty,
} from "@/lib/object-types-store";
import {
  resolveConnectionTarget as resolveConnectionTargetFromConnections,
  resolveFallbackConnectionLabel as resolveFallbackConnectionLabelFromConnections,
  type ResolvedConnectionTarget,
} from "@/pages/objects-page-connections";
import { getResolvedPictureUrl as getResolvedPictureUrlFromImages } from "@/pages/objects-page-images";
import {
  createRecordForType as createRecordForTypeFromMutations,
  deleteRecord,
} from "@/pages/objects-page-mutations";
import { navigateToConnectedRecord as navigateToConnectedRecordFromNavigation } from "@/pages/objects-page-navigation";
import { renderReadonlyPropertyValue as renderReadonlyPropertyValueFromReadonly } from "@/pages/objects-page-readonly-property-value";
import {
  saveObjectViewPreferences,
  type ObjectsViewMode,
} from "@/pages/objects-page-helpers";
import type { AppDispatch } from "@/store";
import type { Dispatch, SetStateAction } from "react";
import type { NavigateFunction } from "react-router-dom";

export function buildObjectsPageCallbacks(params: {
  dispatch: AppDispatch;
  navigate: NavigateFunction;
  selectedType: ObjectTypeDefinition | null;
  selectedTypeId: string | null;
  selectedRecord: ObjectRecord | null;
  selectedSystemCollection: string | null;
  objectTypes: ObjectTypeDefinition[];
  resolvedPictureUrls: Record<string, string>;
  setSelectedTypeId: Dispatch<SetStateAction<string | null>>;
  setSelectedRecordId: Dispatch<SetStateAction<string | null>>;
  setViewMode: Dispatch<SetStateAction<ObjectsViewMode>>;
  setViewPreferencesByTypeId: Dispatch<
    SetStateAction<Record<string, ObjectsViewMode>>
  >;
  setResolvedPictureUrls: Dispatch<SetStateAction<Record<string, string>>>;
  setUploadingPicturePropertyId: Dispatch<SetStateAction<string | null>>;
  setFieldDraftValues: Dispatch<SetStateAction<Record<string, string>>>;
  commitFieldDraft: (
    objectRecordId: string,
    property: ObjectTypeProperty,
    nextValue: string,
  ) => void;
  getRecordsForType: (typeId: string) => ObjectRecord[];
  viewPreferencesByTypeId: Record<string, ObjectsViewMode>;
}) {
  const {
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
  } = params;

  const getResolvedPictureUrl = (
    value: ObjectRecordValue | undefined,
  ): string => {
    return getResolvedPictureUrlFromImages({
      value,
      resolvedPictureUrls,
    });
  };

  const createRecordForType = async (targetType: ObjectTypeDefinition) => {
    return createRecordForTypeFromMutations({
      targetType,
      dispatch,
    });
  };

  const handleCreateRecord = () => {
    if (!selectedType) {
      return;
    }

    void createRecordForType(selectedType).then((createdId) => {
      setSelectedRecordId(createdId);
      setViewMode("detail");
    });
  };

  const setPreferredViewMode = (nextMode: ObjectsViewMode) => {
    setViewMode(nextMode);

    if (!selectedTypeId) {
      return;
    }

    setViewPreferencesByTypeId((previous) => {
      const next = {
        ...previous,
        [selectedTypeId]: nextMode,
      };

      saveObjectViewPreferences(next);
      return next;
    });
  };

  const handleDeleteRecord = () => {
    if (!selectedRecord || !selectedType) {
      return;
    }

    if (!window.confirm("Delete this record?")) {
      return;
    }

    deleteRecord({
      selectedSystemCollection,
      selectedRecordId: selectedRecord.id,
      dispatch,
    });
  };

  const navigateToConnectedRecord = (
    targetTypeId: string,
    targetRecordId: string,
  ) => {
    navigateToConnectedRecordFromNavigation({
      targetTypeId,
      targetRecordId,
      navigate,
    });
  };

  const resolveConnectionTarget = (params: {
    connectionId: string;
    hintedTypeId?: string;
  }): ResolvedConnectionTarget | null => {
    return resolveConnectionTargetFromConnections({
      ...params,
      objectTypes,
      getRecordsForType,
    });
  };

  const resolveFallbackConnectionLabel = (
    connectionId: string,
  ): string | null => {
    return resolveFallbackConnectionLabelFromConnections({
      connectionId,
      objectTypes,
    });
  };

  const renderReadonlyPropertyValue = (
    record: ObjectRecord,
    property: ObjectTypeProperty,
  ) => {
    return renderReadonlyPropertyValueFromReadonly({
      record,
      property,
      resolveConnectionTarget,
      resolveFallbackConnectionLabel,
      navigateToConnectedRecord,
    });
  };

  const uploadPictureFile = (params: {
    objectRecordId: string;
    property: ObjectTypeProperty;
    file: File;
  }) => {
    const { objectRecordId, property, file } = params;

    if (!selectedType) {
      return;
    }

    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) {
      window.alert("Sign in is required to upload images.");
      return;
    }

    setUploadingPicturePropertyId(property.id);

    void uploadObjectImageForUser({
      userId,
      objectTypeId: selectedType.id,
      objectRecordId,
      propertyId: property.id,
      file,
    })
      .then(({ storagePath, downloadUrl }) => {
        setResolvedPictureUrls((previous) => ({
          ...previous,
          [storagePath]: downloadUrl,
        }));

        setFieldDraftValues((previous) => ({
          ...previous,
          [property.id]: storagePath,
        }));
        commitFieldDraft(objectRecordId, property, storagePath);
      })
      .catch(() => {
        window.alert("Unable to upload image.");
      })
      .finally(() => {
        setUploadingPicturePropertyId((current) =>
          current === property.id ? null : current,
        );
      });
  };

  const openRecordDetail = (recordId: string) => {
    setSelectedRecordId(recordId);
    setViewMode("detail");
  };

  const handleSelectType = (nextTypeId: string | null) => {
    setSelectedTypeId(nextTypeId);
    setSelectedRecordId(null);
    setViewMode(
      nextTypeId ? (viewPreferencesByTypeId[nextTypeId] ?? "table") : "table",
    );
  };

  return {
    getResolvedPictureUrl,
    handleCreateRecord,
    setPreferredViewMode,
    handleDeleteRecord,
    uploadPictureFile,
    createRecordForType,
    navigateToConnectedRecord,
    resolveConnectionTarget,
    resolveFallbackConnectionLabel,
    renderReadonlyPropertyValue,
    openRecordDetail,
    handleSelectType,
  };
}
