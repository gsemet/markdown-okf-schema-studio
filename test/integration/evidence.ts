/**
 * The shared real-window evidence writer. Every real-window suite takes its screenshots through
 * `RealWindowEvidence.shoot` and records the notes through `record` (or both with `capture`):
 * ids come from `test/shared/captureRegistry.ts`, files land in `<run folder>/<group>/`, and the
 * run `manifest.json` lists them. Unknown ids throw; a complete suite fails if a registered
 * capture was not taken (`assertComplete`).
 */
import type { Frame, Locator, Page } from "playwright-core";

import { E2E_SCREENSHOT_ROOT } from "../reportPaths";
import type { CaptureSuite } from "../shared/captureRegistry";
import { EvidenceStore, resolveClip, type CaptureRecord, type EvidenceStoreOptions, type RecordInput } from "../shared/evidenceStore";

/** Pixels kept around an `element` region. */
const REGION_MARGIN = 12;

export class RealWindowEvidence extends EvidenceStore {
  constructor(suite: CaptureSuite, options: Partial<EvidenceStoreOptions> = {}) {
    super({ screenshotRoot: E2E_SCREENSHOT_ROOT, ...options, suite });
  }

  /**
   * Takes the screenshot of `id` and returns its bytes; `undefined` for an assertion-only entry.
   * `clip: "preview"` crops to the webview `frame`; `clip: "element"` crops to `region` (with a small
   * margin). Either falls back to the next larger area (preview, then the whole window) when its
   * rectangle cannot be resolved.
   */
  async shoot(page: Page, frame: Frame | undefined, id: string, region?: Locator): Promise<Buffer | undefined> {
    const target = this.paths(id);
    if (target.png === null) return undefined;
    const viewport = page.viewportSize();
    let clip: ReturnType<typeof resolveClip>;
    if (target.entry.clip === "element" && region !== undefined) {
      try {
        const box = await region.boundingBox();
        clip = box === null ? undefined
          : resolveClip({ x: box.x - REGION_MARGIN, y: box.y - REGION_MARGIN,
            width: box.width + 2 * REGION_MARGIN, height: box.height + 2 * REGION_MARGIN }, viewport);
      } catch {
        clip = undefined;
      }
    }
    if (clip === undefined && target.entry.clip !== "window" && frame !== undefined) {
      try {
        clip = resolveClip(await (await frame.frameElement()).boundingBox(), viewport);
      } catch {
        clip = undefined;
      }
    }
    return page.screenshot({ path: target.png, ...(clip === undefined ? {} : { clip }) });
  }

  /** `shoot` + `record`. */
  async capture(
    page: Page, frame: Frame | undefined, id: string, input: RecordInput, region?: Locator,
  ): Promise<CaptureRecord> {
    await this.shoot(page, frame, id, region);
    return this.record(id, input);
  }
}
