// Keep images on-device; enlarging text and normalising dark backgrounds helps OCR.
export async function prepareScreenshot(
  file: File,
): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 20_000_000)
      throw new Error("Crop the screenshot to your holdings before uploading.");
    const scale = Math.min(
      2,
      3000 / Math.max(bitmap.width, bitmap.height),
      Math.sqrt(8_000_000 / (bitmap.width * bitmap.height)),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context)
      throw new Error("This browser could not open the screenshot.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    let dark = 0,
      samples = 0;
    for (let i = 0; i < pixels.data.length; i += 400) {
      const light =
        (pixels.data[i] + pixels.data[i + 1] + pixels.data[i + 2]) / 3;
      if (light < 128) dark++;
      samples++;
    }
    const invert = dark > samples * 0.6;
    for (let i = 0; i < pixels.data.length; i += 4) {
      let light =
        pixels.data[i] * 0.299 +
        pixels.data[i + 1] * 0.587 +
        pixels.data[i + 2] * 0.114;
      if (invert) light = 255 - light;
      light = Math.max(0, Math.min(255, (light - 128) * 1.3 + 128));
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = light;
    }
    context.putImageData(pixels, 0, 0);
    return canvas;
  } finally {
    bitmap.close();
  }
}
