import { firebaseStorage } from "@/lib/firebase";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

const OBJECT_IMAGE_URL_CACHE_KEY = "pkm.object-image-url-cache.v1";

type ObjectImageUrlCache = Record<string, string>;

function createCacheKey(userId: string, storagePath: string): string {
  return `${userId}::${storagePath}`;
}

function loadUrlCache(): ObjectImageUrlCache {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(OBJECT_IMAGE_URL_CACHE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.entries(
      parsed as Record<string, unknown>,
    ).reduce<ObjectImageUrlCache>((accumulator, [key, value]) => {
      if (typeof value === "string" && value.length > 0) {
        accumulator[key] = value;
      }

      return accumulator;
    }, {});
  } catch {
    return {};
  }
}

function persistUrlCache(cache: ObjectImageUrlCache): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    OBJECT_IMAGE_URL_CACHE_KEY,
    JSON.stringify(cache),
  );
}

function cacheDownloadUrl(
  userId: string,
  storagePath: string,
  downloadUrl: string,
): void {
  const key = createCacheKey(userId, storagePath);
  const next = {
    ...loadUrlCache(),
    [key]: downloadUrl,
  };

  persistUrlCache(next);
}

function getCachedDownloadUrl(
  userId: string,
  storagePath: string,
): string | null {
  const cache = loadUrlCache();
  const key = createCacheKey(userId, storagePath);
  return cache[key] ?? null;
}

function clearCachedDownloadUrl(userId: string, storagePath: string): void {
  const cache = loadUrlCache();
  const key = createCacheKey(userId, storagePath);

  if (!(key in cache)) {
    return;
  }

  const next = { ...cache };
  delete next[key];
  persistUrlCache(next);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64) || "image";
}

export function isRemoteImageUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function isDataImageUrl(value: string): boolean {
  return value.startsWith("data:");
}

export function isStoragePathValue(value: string): boolean {
  if (!value.trim()) {
    return false;
  }

  return !isRemoteImageUrl(value) && !isDataImageUrl(value);
}

export async function uploadObjectImageForUser(params: {
  userId: string;
  objectTypeId: string;
  objectRecordId: string;
  propertyId: string;
  file: File;
}): Promise<{ storagePath: string; downloadUrl: string }> {
  const { userId, objectTypeId, objectRecordId, propertyId, file } = params;
  const timestamp = Date.now();
  const safeName = sanitizeFileName(file.name);
  const storagePath = `users/${userId}/object-images/${objectTypeId}/${objectRecordId}/${propertyId}/${timestamp}-${safeName}`;

  const objectRef = ref(firebaseStorage, storagePath);
  await uploadBytes(objectRef, file, {
    contentType: file.type || undefined,
    cacheControl: "public,max-age=31536000,immutable",
  });

  const downloadUrl = await getDownloadURL(objectRef);
  cacheDownloadUrl(userId, storagePath, downloadUrl);

  return {
    storagePath,
    downloadUrl,
  };
}

export async function resolveObjectImageUrl(params: {
  userId: string;
  value: string;
}): Promise<string> {
  const { userId, value } = params;

  if (!value.trim()) {
    return "";
  }

  if (isRemoteImageUrl(value) || isDataImageUrl(value)) {
    return value;
  }

  const cached = getCachedDownloadUrl(userId, value);
  if (cached) {
    return cached;
  }

  const downloadUrl = await getDownloadURL(ref(firebaseStorage, value));
  cacheDownloadUrl(userId, value, downloadUrl);
  return downloadUrl;
}

export async function deleteObjectImageForUser(params: {
  userId: string;
  value: string;
}): Promise<void> {
  const { userId, value } = params;

  if (!isStoragePathValue(value)) {
    return;
  }

  await deleteObject(ref(firebaseStorage, value));
  clearCachedDownloadUrl(userId, value);
}
