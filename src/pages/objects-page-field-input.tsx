import { Input } from "@/components/ui/input";
import type {
  ObjectRecord,
  ObjectRecordValue,
} from "@/lib/object-records-store";
import type {
  ObjectTypeDefinition,
  ObjectTypeProperty,
} from "@/lib/object-types-store";
import type { ResolvedConnectionTarget } from "@/pages/objects-page-connections";
import { renderConnectionFieldInput } from "@/pages/objects-page-connection-field";
import { formatRecordValue } from "@/pages/objects-page-formatting";
import { renderPictureFieldInput } from "@/pages/objects-page-picture-field";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

export function renderObjectsPageFieldInput(params: {
  property: ObjectTypeProperty;
  selectedRecord: ObjectRecord | null;
  selectedType: ObjectTypeDefinition | null;
  fieldDraftValues: Record<string, string>;
  setFieldDraftValues: Dispatch<SetStateAction<Record<string, string>>>;
  commitFieldDraft: (
    objectRecordId: string,
    property: ObjectTypeProperty,
    nextValue: string,
  ) => void;
  scheduleFieldDraftCommit: (
    objectRecordId: string,
    property: ObjectTypeProperty,
    nextValue: string,
    delayMs?: number,
  ) => void;
  objectTypes: ObjectTypeDefinition[];
  getRecordsForType: (typeId: string) => ObjectRecord[];
  createRecordForType: (targetType: ObjectTypeDefinition) => Promise<string>;
  updateField: (
    objectRecordId: string,
    property: ObjectTypeProperty,
    value: unknown,
  ) => void;
  resolveConnectionTarget: (params: {
    connectionId: string;
    hintedTypeId?: string;
  }) => ResolvedConnectionTarget | null;
  resolveFallbackConnectionLabel: (connectionId: string) => string | null;
  navigateToConnectedRecord: (
    targetTypeId: string,
    targetRecordId: string,
  ) => void;
  getResolvedPictureUrl: (value: ObjectRecordValue | undefined) => string;
  uploadingPicturePropertyId: string | null;
  pictureFileInputRefs: MutableRefObject<
    Record<string, HTMLInputElement | null>
  >;
  setResolvedPictureUrls: Dispatch<SetStateAction<Record<string, string>>>;
  uploadPictureFile: (params: {
    objectRecordId: string;
    property: ObjectTypeProperty;
    file: File;
  }) => void;
}) {
  const {
    property,
    selectedRecord,
    selectedType,
    fieldDraftValues,
    setFieldDraftValues,
    commitFieldDraft,
    scheduleFieldDraftCommit,
    objectTypes,
    getRecordsForType,
    createRecordForType,
    updateField,
    resolveConnectionTarget,
    resolveFallbackConnectionLabel,
    navigateToConnectedRecord,
    getResolvedPictureUrl,
    uploadingPicturePropertyId,
    pictureFileInputRefs,
    setResolvedPictureUrls,
    uploadPictureFile,
  } = params;

  if (!selectedRecord || !selectedType) {
    return null;
  }

  const objectRecordId = selectedRecord.id;
  const value = selectedRecord.values[property.id];
  const storedValue = formatRecordValue(value);
  const draftValue = fieldDraftValues[property.id] ?? storedValue;

  if (property.type === "select") {
    return (
      <select
        value={draftValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          setFieldDraftValues((previous) => ({
            ...previous,
            [property.id]: nextValue,
          }));
          commitFieldDraft(objectRecordId, property, nextValue);
        }}
        className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
      >
        <option value="">Select option</option>
        {(property.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (property.type === "connection") {
    return renderConnectionFieldInput({
      property,
      value,
      draftValue,
      objectRecordId,
      objectTypes,
      getRecordsForType,
      createRecordForType,
      setFieldDraftValues,
      updateField,
      commitFieldDraft,
      resolveConnectionTarget,
      resolveFallbackConnectionLabel,
      navigateToConnectedRecord,
    });
  }

  if (property.type === "picture") {
    const previewUrl = getResolvedPictureUrl(value);

    return renderPictureFieldInput({
      objectRecordId,
      property,
      draftValue,
      previewUrl,
      uploadingPicturePropertyId,
      pictureFileInputRefs,
      setResolvedPictureUrls,
      setFieldDraftValues,
      commitFieldDraft,
      uploadPictureFile,
    });
  }

  const inputType =
    property.type === "email"
      ? "email"
      : property.type === "phone"
        ? "tel"
        : property.type === "number"
          ? "number"
          : property.type === "date"
            ? "date"
            : "text";

  return (
    <Input
      value={draftValue}
      type={inputType}
      onChange={(event) => {
        const nextValue = event.target.value;
        setFieldDraftValues((previous) => ({
          ...previous,
          [property.id]: nextValue,
        }));
        scheduleFieldDraftCommit(objectRecordId, property, nextValue);
      }}
      onBlur={(event) => {
        commitFieldDraft(objectRecordId, property, event.target.value);
      }}
      placeholder={property.name}
    />
  );
}
