import { firebaseStorage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "image";
}

export async function uploadEntityImageForUser(params: {
  userId: string;
  entityCollection: "people" | "companies";
  entityId: string;
  file: File;
}): Promise<string> {
  const { userId, entityCollection, entityId, file } = params;

  const storagePath = `users/${userId}/entity-images/${entityCollection}/${entityId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const imageRef = ref(firebaseStorage, storagePath);

  await uploadBytes(imageRef, file, {
    contentType: file.type || undefined,
    cacheControl: "public,max-age=31536000,immutable",
  });

  return getDownloadURL(imageRef);
}
