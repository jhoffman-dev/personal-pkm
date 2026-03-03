import type { ObjectRecord } from "@/lib/object-records-store";
import type { ObjectTypeDefinition } from "@/lib/object-types-store";
import { resolvePictureUrlsForRecords } from "@/pages/objects-page-images";
import { useEffect } from "react";

export function useResolveObjectsPagePictureUrls(params: {
  selectedType: ObjectTypeDefinition | null;
  records: ObjectRecord[];
  resolvedPictureUrls: Record<string, string>;
  currentUserId: string | null;
  setResolvedPictureUrls: (
    update:
      | Record<string, string>
      | ((previous: Record<string, string>) => Record<string, string>),
  ) => void;
}) {
  const {
    selectedType,
    records,
    resolvedPictureUrls,
    currentUserId,
    setResolvedPictureUrls,
  } = params;

  useEffect(() => {
    let isCancelled = false;

    void resolvePictureUrlsForRecords({
      selectedType,
      records,
      resolvedPictureUrls,
      currentUserId,
    }).then((entries) => {
      if (isCancelled || entries.length === 0) {
        return;
      }

      setResolvedPictureUrls((previous) => {
        const next = { ...previous };
        entries.forEach(([value, resolvedValue]) => {
          next[value] = resolvedValue;
        });
        return next;
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [
    currentUserId,
    records,
    resolvedPictureUrls,
    selectedType,
    setResolvedPictureUrls,
  ]);
}
