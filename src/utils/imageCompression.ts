export const DEFAULT_MAX_IMAGE_SIZE = 7 * 1024 * 1024; // 7MB

export const canvasToPngBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob failed"));
      }, "image/png");
    } catch (err) {
      reject(err);
    }
  });
};

export const compressImage = async (
  file: File,
  opts: { maxDimension?: number; targetMaxBytes?: number; minDimension?: number } = {}
): Promise<File> => {
  const maxDimension = opts.maxDimension ?? 2048;
  const targetMaxBytes = opts.targetMaxBytes ?? DEFAULT_MAX_IMAGE_SIZE;
  const minDimension = opts.minDimension ?? 512;

  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;

  let scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  let canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  let ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);

  let blob = await canvasToPngBlob(canvas);

  while (blob.size > targetMaxBytes && Math.max(width, height) > minDimension) {
    const shrink = 0.85;
    const newW = Math.max(minDimension, Math.round(width * shrink));
    const newH = Math.max(minDimension, Math.round(height * shrink));

    const canvas2 = document.createElement("canvas");
    canvas2.width = newW;
    canvas2.height = newH;
    const ctx2 = canvas2.getContext("2d");
    if (!ctx2) throw new Error("Canvas 2D context unavailable (second stage)");
    ctx2.drawImage(canvas, 0, 0, width, height, 0, 0, newW, newH);

    canvas = canvas2;
    width = newW;
    height = newH;
    blob = await canvasToPngBlob(canvas);
  }

  const newName = file.name.replace(/\.[^.]+$/, "") + "-compressed.png";
  return new File([blob], newName, { type: "image/png" });
};
