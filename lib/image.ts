/**
 * Browser-only photo preparation. Re-drawing the photo on a canvas:
 *  - strips EXIF metadata (phone photos often carry the GPS location),
 *  - applies the camera's rotation,
 *  - shrinks large phone photos (often 5–15 MB) to a web-friendly JPEG.
 * GIFs are passed through untouched so animations survive.
 */

const MAX_SIDE = 1600;
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export async function preparePhoto(file: File): Promise<File> {
  if (file.type === "image/gif") return file;

  const bitmap = await createImageBitmap(file); // honours EXIF orientation by default
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Could not encode the photo.");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
