import { firebaseStorage } from "@/lib/firebase";
import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  uploadString,
} from "firebase/storage";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "image";
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType.includes("png")) {
    return "png";
  }

  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    return "jpg";
  }

  if (mimeType.includes("gif")) {
    return "gif";
  }

  if (mimeType.includes("webp")) {
    return "webp";
  }

  if (mimeType.includes("svg")) {
    return "svg";
  }

  return "img";
}

function mimeTypeFromDataUrl(dataUrl: string): string {
  const match = /^data:([^;,]+)[;,]/.exec(dataUrl);
  return match?.[1] ?? "image/png";
}

function createStoragePath(params: {
  userId: string;
  noteId: string;
  fileName: string;
}): string {
  const { userId, noteId, fileName } = params;
  const safeName = sanitizeFileName(fileName);
  const timestamp = Date.now();

  return `users/${userId}/note-images/${noteId}/${timestamp}-${safeName}`;
}

export async function uploadNoteImageFileForUser(params: {
  userId: string;
  noteId: string;
  file: File;
  onProgress?: (event: { progress: number }) => void;
  abortSignal?: AbortSignal;
}): Promise<{ storagePath: string; downloadUrl: string }> {
  const { userId, noteId, file, onProgress, abortSignal } = params;
  const storagePath = createStoragePath({
    userId,
    noteId,
    fileName: file.name,
  });
  const imageRef = ref(firebaseStorage, storagePath);

  const uploadTask = uploadBytesResumable(imageRef, file, {
    contentType: file.type || undefined,
    cacheControl: "public,max-age=31536000,immutable",
  });

  const abortHandler = () => {
    uploadTask.cancel();
  };

  if (abortSignal) {
    if (abortSignal.aborted) {
      uploadTask.cancel();
      throw new Error("Upload cancelled");
    }

    abortSignal.addEventListener("abort", abortHandler, { once: true });
  }

  const snapshot = await new Promise<
    import("firebase/storage").UploadTaskSnapshot
  >((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (nextSnapshot) => {
        if (!onProgress) {
          return;
        }

        const totalBytes = nextSnapshot.totalBytes || 1;
        const progress = Math.round(
          (nextSnapshot.bytesTransferred / totalBytes) * 100,
        );
        onProgress({ progress });
      },
      () => {
        reject(new Error("Failed to upload image."));
      },
      () => {
        resolve(uploadTask.snapshot);
      },
    );
  });

  if (abortSignal) {
    abortSignal.removeEventListener("abort", abortHandler);
  }

  const downloadUrl = await getDownloadURL(snapshot.ref);

  return {
    storagePath,
    downloadUrl,
  };
}

export async function uploadNoteImageDataUrlForUser(params: {
  userId: string;
  noteId: string;
  dataUrl: string;
  fileName?: string;
}): Promise<{ storagePath: string; downloadUrl: string }> {
  const { userId, noteId, dataUrl, fileName } = params;
  const mimeType = mimeTypeFromDataUrl(dataUrl);
  const defaultFileName = `embedded-image.${extensionFromMimeType(mimeType)}`;

  const storagePath = createStoragePath({
    userId,
    noteId,
    fileName: fileName ?? defaultFileName,
  });

  const imageRef = ref(firebaseStorage, storagePath);
  await uploadString(imageRef, dataUrl, "data_url", {
    contentType: mimeType,
    cacheControl: "public,max-age=31536000,immutable",
  });

  const downloadUrl = await getDownloadURL(imageRef);

  return {
    storagePath,
    downloadUrl,
  };
}

export async function migrateEmbeddedNoteImagesToStorage(params: {
  userId: string;
  noteId: string;
  html: string;
}): Promise<{ html: string; migratedCount: number }> {
  const { userId, noteId, html } = params;

  if (!html.includes("data:image")) {
    return { html, migratedCount: 0 };
  }

  if (typeof window === "undefined") {
    return { html, migratedCount: 0 };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const images = [...doc.querySelectorAll("img")];

  const embeddedImages = images.filter((image) => {
    const source = image.getAttribute("src") ?? "";
    return source.startsWith("data:image");
  });

  if (embeddedImages.length === 0) {
    return { html, migratedCount: 0 };
  }

  let migratedCount = 0;

  for (let index = 0; index < embeddedImages.length; index += 1) {
    const image = embeddedImages[index];
    const source = image.getAttribute("src") ?? "";

    if (!source.startsWith("data:image")) {
      continue;
    }

    try {
      const alt = image.getAttribute("alt")?.trim();
      const fileName = alt ? `${sanitizeFileName(alt)}.img` : undefined;
      const { downloadUrl } = await uploadNoteImageDataUrlForUser({
        userId,
        noteId,
        dataUrl: source,
        fileName,
      });

      image.setAttribute("src", downloadUrl);
      migratedCount += 1;
    } catch (error) {
      void error;
    }
  }

  return {
    html: doc.body.innerHTML,
    migratedCount,
  };
}
