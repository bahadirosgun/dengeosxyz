/**
 * Compress an image File entirely in the browser using canvas — no extra
 * dependency. Caps the largest dimension at `maxDim` (default 1600px) and
 * re-encodes as JPEG at the given quality. Returns a fresh File.
 */
export async function compressImage(
  file: File,
  opts: { maxDim?: number; quality?: number } = {},
): Promise<{ file: File; width: number; height: number }> {
  const maxDim = opts.maxDim ?? 1600;
  const quality = opts.quality ?? 0.82;

  const bitmap = await createImageBitmap(file).catch(() => null);
  let width: number;
  let height: number;
  let source: CanvasImageSource;

  if (bitmap) {
    width = bitmap.width;
    height = bitmap.height;
    source = bitmap;
  } else {
    // Safari fallback via <img>
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = URL.createObjectURL(file);
    });
    width = img.naturalWidth;
    height = img.naturalHeight;
    source = img;
  }

  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D desteklenmiyor.");
  ctx.drawImage(source, 0, 0, w, h);
  if (bitmap && "close" in bitmap) bitmap.close();

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Görsel sıkıştırılamadı."))),
      "image/jpeg",
      quality,
    ),
  );

  const out = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
  return { file: out, width: w, height: h };
}