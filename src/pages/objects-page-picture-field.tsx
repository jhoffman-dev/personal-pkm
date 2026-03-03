import { Button } from "@/components/ui/button";
import { firebaseAuth } from "@/lib/firebase";
import {
  deleteObjectImageForUser,
  isStoragePathValue,
} from "@/lib/object-images-storage";
import type { ObjectTypeProperty } from "@/lib/object-types-store";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

export function renderPictureFieldInput(params: {
  objectRecordId: string;
  property: ObjectTypeProperty;
  draftValue: string;
  previewUrl: string;
  uploadingPicturePropertyId: string | null;
  pictureFileInputRefs: MutableRefObject<
    Record<string, HTMLInputElement | null>
  >;
  setResolvedPictureUrls: Dispatch<SetStateAction<Record<string, string>>>;
  setFieldDraftValues: Dispatch<SetStateAction<Record<string, string>>>;
  commitFieldDraft: (
    objectRecordId: string,
    property: ObjectTypeProperty,
    nextValue: string,
  ) => void;
  uploadPictureFile: (params: {
    objectRecordId: string;
    property: ObjectTypeProperty;
    file: File;
  }) => void;
}): JSX.Element {
  const {
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
  } = params;

  return (
    <div className="space-y-2">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={`${property.name} preview`}
          className="h-28 w-28 rounded-md border object-cover"
        />
      ) : null}

      <div
        tabIndex={0}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          const droppedFile = Array.from(event.dataTransfer.files).find(
            (file) => file.type.startsWith("image/"),
          );

          if (!droppedFile || uploadingPicturePropertyId === property.id) {
            return;
          }

          uploadPictureFile({
            objectRecordId,
            property,
            file: droppedFile,
          });
        }}
        onPaste={(event) => {
          const pastedFile = Array.from(event.clipboardData.items)
            .map((item) => item.getAsFile())
            .find(
              (file): file is File =>
                file instanceof File && file.type.startsWith("image/"),
            );

          if (!pastedFile || uploadingPicturePropertyId === property.id) {
            return;
          }

          event.preventDefault();
          uploadPictureFile({
            objectRecordId,
            property,
            file: pastedFile,
          });
        }}
        className="border-input bg-background rounded-md border border-dashed p-3 text-sm"
      >
        <p className="text-muted-foreground text-xs">
          Drag & drop or paste an image here.
        </p>

        <div className="mt-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploadingPicturePropertyId === property.id}
            onClick={() => {
              pictureFileInputRefs.current[property.id]?.click();
            }}
          >
            Pick image
          </Button>
        </div>

        <input
          ref={(element) => {
            pictureFileInputRefs.current[property.id] = element;
          }}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file || uploadingPicturePropertyId === property.id) {
              event.currentTarget.value = "";
              return;
            }

            uploadPictureFile({
              objectRecordId,
              property,
              file,
            });

            event.currentTarget.value = "";
          }}
        />
      </div>

      {uploadingPicturePropertyId === property.id ? (
        <p className="text-muted-foreground text-xs">Uploading image...</p>
      ) : null}

      {draftValue ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const valueToDelete = draftValue.trim();
            const userId = firebaseAuth.currentUser?.uid;

            if (userId && isStoragePathValue(valueToDelete)) {
              void deleteObjectImageForUser({
                userId,
                value: valueToDelete,
              }).catch(() => {
                window.alert("Unable to delete image from storage.");
              });
            }

            setResolvedPictureUrls((previous) => {
              if (!(valueToDelete in previous)) {
                return previous;
              }

              const next = { ...previous };
              delete next[valueToDelete];
              return next;
            });

            setFieldDraftValues((previous) => ({
              ...previous,
              [property.id]: "",
            }));
            commitFieldDraft(objectRecordId, property, "");
          }}
        >
          Clear image
        </Button>
      ) : null}
    </div>
  );
}
