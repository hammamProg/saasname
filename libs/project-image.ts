export const PROJECT_IMAGE_BUCKET = "project-images";

export const PROJECT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export const PROJECT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export const PROJECT_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function projectImageStoragePath(
  userId: string,
  projectId: string,
  mimeType: string
): string {
  const ext =
    mimeType === "image/jpeg"
      ? "jpg"
      : mimeType === "image/png"
        ? "png"
        : mimeType === "image/webp"
          ? "webp"
          : mimeType === "image/gif"
            ? "gif"
            : "bin";
  return `${userId}/${projectId}/icon.${ext}`;
}

export function validateProjectImageFile(file: File): string | null {
  if (!PROJECT_IMAGE_MIME_TYPES.has(file.type)) {
    return "Use a JPEG, PNG, WebP, or GIF image.";
  }
  if (file.size > PROJECT_IMAGE_MAX_BYTES) {
    return "Image must be 2 MB or smaller.";
  }
  return null;
}
