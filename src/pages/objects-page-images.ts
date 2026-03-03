import {
  isDataImageUrl,
  isRemoteImageUrl,
  resolveObjectImageUrl,
} from "@/lib/object-images-storage";
import type {
  ObjectRecordValue,
  ObjectRecord,
} from "@/lib/object-records-store";
import type { ObjectTypeDefinition } from "@/lib/object-types-store";
import { formatRecordValue } from "@/pages/objects-page-formatting";

export async function resolvePictureUrlsForRecords(params: {
  selectedType: ObjectTypeDefinition | null;
  records: ObjectRecord[];
  resolvedPictureUrls: Record<string, string>;
  currentUserId: string | null;
}): Promise<Array<[string, string]>> {
  const { selectedType, records, resolvedPictureUrls, currentUserId } = params;
  if (!selectedType) {
    return [];
  }

  const pictureProperties = selectedType.properties.filter(
    (property) => property.type === "picture",
  );

  if (pictureProperties.length === 0) {
    return [];
  }

  const valuesToResolve = new Set<string>();

  records.forEach((record) => {
    pictureProperties.forEach((property) => {
      const value = formatRecordValue(record.values[property.id]).trim();
      if (value) {
        valuesToResolve.add(value);
      }
    });
  });

  const unresolvedValues = [...valuesToResolve].filter(
    (value) => resolvedPictureUrls[value] === undefined,
  );

  if (unresolvedValues.length === 0) {
    return [];
  }

  return Promise.all(
    unresolvedValues.map(async (value) => {
      if (isRemoteImageUrl(value) || isDataImageUrl(value)) {
        return [value, value] as const;
      }

      if (!currentUserId) {
        return [value, ""] as const;
      }

      try {
        const downloadUrl = await resolveObjectImageUrl({
          userId: currentUserId,
          value,
        });
        return [value, downloadUrl] as const;
      } catch {
        return [value, ""] as const;
      }
    }),
  );
}

export function getResolvedPictureUrl(params: {
  value: ObjectRecordValue | undefined;
  resolvedPictureUrls: Record<string, string>;
}): string {
  const formatted = formatRecordValue(params.value).trim();

  if (!formatted) {
    return "";
  }

  if (isRemoteImageUrl(formatted) || isDataImageUrl(formatted)) {
    return formatted;
  }

  return params.resolvedPictureUrls[formatted] ?? "";
}
