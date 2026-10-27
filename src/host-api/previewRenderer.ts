/**
 * The preview renderer port: where a host runs the source render of a preview (MyST to HTML).
 * The VS Code host runs it in a worker thread (`src/node-services/renderWorker.ts`), so a long
 * render leaves the extension host free and an aborted render stops at once. A host without one
 * renders in-process (`renderPreviewSource`).
 */

import type { SourceRenderer } from "../core/render/renderPipeline";

/** Runs source renders for the previews of one activation. */
export interface PreviewRenderer {
  /** Renders one source; an abort of `signal` stops the render and rejects it as canceled. */
  readonly render: SourceRenderer;
  /** Gets ready for the first render (a thread with its engine loaded) without rendering. */
  warm(): void;
  /** Stops the renders in flight and releases the threads. */
  dispose(): void;
}
