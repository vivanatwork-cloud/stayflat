// Loaded only when a member chooses an image. All recognition runs on-device.
export async function readScreenshot(
  file: File,
  progress: (message: string) => void,
  signal: AbortSignal,
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  if (signal.aborted) throw new Error("Reading cancelled.");
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    signal.addEventListener(
      "abort",
      () => reject(new Error("Reading cancelled.")),
      { once: true },
    );
  });
  let fail: (reason: Error) => void = () => {};
  const failed = new Promise<never>((_, reject) => {
    fail = reject;
  });
  const start = createWorker("eng", 1, {
    workerPath: "/ocr-assets/worker.min.js",
    corePath: "/ocr-assets",
    langPath: "/ocr-assets",
    workerBlobURL: false,
    cacheMethod: "none",
    errorHandler: (message) => fail(new Error(String(message))),
    logger: (m) => {
      if (!signal.aborted)
        progress(
          m.status === "recognizing text"
            ? `Reading screenshot… ${Math.round(m.progress * 100)}%`
            : "Preparing screenshot reader…",
        );
    },
  });
  // If initialization completes after cancellation, still release the worker.
  void start.then(
    (w) => {
      if (signal.aborted) void w.terminate();
    },
    () => {},
  );
  try {
    worker = await Promise.race([start, cancelled, failed]);
    const result = await Promise.race([
      worker.recognize(file),
      cancelled,
      failed,
    ]);
    return result.data.text;
  } finally {
    if (worker) await worker.terminate();
  }
}
