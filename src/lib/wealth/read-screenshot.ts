import { screenshotLines, type ScreenshotReading } from "./crypto-screenshot";
import { prepareScreenshot } from "./prepare-screenshot";
// Loaded only when a member chooses an image. All recognition runs on-device.
export async function readScreenshot(
  file: File,
  progress: (message: string) => void,
  signal: AbortSignal,
): Promise<ScreenshotReading> {
  const { createWorker, PSM } = await import("tesseract.js");
  if (signal.aborted) throw new Error("Reading cancelled.");
  let readingPass = 1;
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
            ? `${readingPass === 1 ? "Reading screenshot" : "Checking table layout"}… ${Math.round(m.progress * 100)}%`
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
    const prepared = await prepareScreenshot(file);
    if (signal.aborted) throw new Error("Reading cancelled.");
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const result = await Promise.race([
      worker.recognize(prepared, {}, { text: true, blocks: true }),
      cancelled,
      failed,
    ]);
    // A second layout pass recovers short ticker labels that sparse-text reading can omit.
    readingPass = 2;
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    const second = await Promise.race([
      worker.recognize(prepared, {}, { text: true, blocks: true }),
      cancelled,
      failed,
    ]);
    const flatten = (page: typeof result.data) =>
      page.blocks?.flatMap((b) =>
        b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)),
      ) ?? [];
    const words = flatten(result.data);
    for (const candidate of flatten(second.data)) {
      const b = candidate.bbox;
      const overlaps = words.some((word) => {
        const a = word.bbox;
        const intersection =
          Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) *
          Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
        return (
          intersection >
          Math.min(
            (a.x1 - a.x0) * (a.y1 - a.y0),
            (b.x1 - b.x0) * (b.y1 - b.y0),
          ) *
            0.4
        );
      });
      if (!overlaps) words.push(candidate);
    }
    const lines = screenshotLines(words);
    return {
      text: lines.length
        ? lines.map((l) => l.text).join("\n")
        : result.data.text,
      lines,
    };
  } finally {
    if (worker) await worker.terminate();
  }
}
