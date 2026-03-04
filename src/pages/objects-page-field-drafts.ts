import type {
  ObjectRecord,
  ObjectRecordValue,
} from "@/lib/object-records-store";
import type {
  ObjectTypeDefinition,
  ObjectTypeProperty,
} from "@/lib/object-types-store";
import { formatRecordValue } from "@/pages/objects-page-formatting";
import { useEffect, useRef, useState } from "react";

export function useObjectsPageFieldDrafts(params: {
  selectedRecord: ObjectRecord | null;
  selectedType: ObjectTypeDefinition | null;
  onCommit: (
    objectRecordId: string,
    property: ObjectTypeProperty,
    value: ObjectRecordValue | undefined,
  ) => void;
}) {
  const { selectedRecord, selectedType, onCommit } = params;
  const [fieldDraftValues, setFieldDraftValues] = useState<
    Record<string, string>
  >({});
  const pendingCommitTimeoutIdsRef = useRef<Record<string, number>>({});

  const clearPendingCommit = (propertyId: string) => {
    const timeoutId = pendingCommitTimeoutIdsRef.current[propertyId];
    if (timeoutId === undefined) {
      return;
    }

    window.clearTimeout(timeoutId);
    delete pendingCommitTimeoutIdsRef.current[propertyId];
  };

  const commitFieldDraft = (
    objectRecordId: string,
    property: ObjectTypeProperty,
    nextValue: string,
  ) => {
    clearPendingCommit(property.id);
    onCommit(objectRecordId, property, nextValue);
  };

  const scheduleFieldDraftCommit = (
    objectRecordId: string,
    property: ObjectTypeProperty,
    nextValue: string,
    delayMs = 300,
  ) => {
    clearPendingCommit(property.id);

    const timeoutId = window.setTimeout(() => {
      onCommit(objectRecordId, property, nextValue);
      delete pendingCommitTimeoutIdsRef.current[property.id];
    }, delayMs);

    pendingCommitTimeoutIdsRef.current[property.id] = timeoutId;
  };

  useEffect(() => {
    const pending = pendingCommitTimeoutIdsRef.current;
    Object.values(pending).forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    pendingCommitTimeoutIdsRef.current = {};

    if (!selectedRecord || !selectedType) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset draft inputs when selection context is cleared.
      setFieldDraftValues({});
      return;
    }

    const nextDraftValues = Object.fromEntries(
      selectedType.properties.map((property) => [
        property.id,
        formatRecordValue(selectedRecord.values[property.id]),
      ]),
    );

    setFieldDraftValues(nextDraftValues);
  }, [selectedRecord, selectedType]);

  useEffect(() => {
    return () => {
      const pending = pendingCommitTimeoutIdsRef.current;
      Object.values(pending).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      pendingCommitTimeoutIdsRef.current = {};
    };
  }, []);

  return {
    fieldDraftValues,
    setFieldDraftValues,
    commitFieldDraft,
    scheduleFieldDraftCommit,
  };
}
