import type { Page } from "playwright-core";

import { type PixelSize, type RealSurface, viewportFitProblem, viewportGuardIsStrict } from "../shared/viewportGuard";

/*
 * Kept apart from realInput/harness.ts because the reload campaign runs in the launcher, where
 * `vscode` cannot be imported; the harness re-exports both functions.
 */

/**
 * The real window and screen sizes behind `page`: the browser window bounds (CDP
 * `Browser.getWindowForTarget`) and `screen.width/height`. A size that cannot be read is omitted.
 */
export async function realWindowBounds(page: Page): Promise<RealSurface & { windowState?: string }> {
  // Device-metrics emulation also changes what `screen` and the window report, so the first reading
  // of a page (taken before any emulation by the harness connect or by `setViewport`) is the real one.
  const known = realBoundsByPage.get(page);
  if (known !== undefined) return known;
  const result = await readRealWindowBounds(page);
  realBoundsByPage.set(page, result);
  return result;
}

const realBoundsByPage = new WeakMap<Page, RealSurface & { windowState?: string }>();

async function readRealWindowBounds(page: Page): Promise<RealSurface & { windowState?: string }> {
  const result: { window?: PixelSize; screen?: PixelSize; windowState?: string } = {};
  try {
    const session = await page.context().newCDPSession(page);
    try {
      const { bounds } = await session.send("Browser.getWindowForTarget") as {
        bounds: { width?: number; height?: number; windowState?: string };
      };
      if (bounds.width !== undefined && bounds.height !== undefined) result.window = { width: bounds.width, height: bounds.height };
      result.windowState = bounds.windowState;
    } finally {
      await session.detach().catch(() => undefined);
    }
  } catch {
    // Unreadable: reported as missing, never a failure of its own.
  }
  result.screen = await page.evaluate(() => ({ width: window.screen.width, height: window.screen.height }))
    .catch(() => undefined);
  return result;
}

/**
 * `page.setViewportSize` for the real-window tests, then a check that the emulated viewport fits
 * the real window and screen (see test/shared/viewportGuard.ts). A viewport that does not fit
 * logs a `VIEWPORT EXCEEDS WINDOW` line naming both sizes. It throws only when
 * `STUDIO_VIEWPORT_GUARD=strict` is set: CI sets it together with an X screen larger than every
 * emulated viewport (CR-326); before that, a 1280 px Xvfb screen would fail every 1400 px test.
 */
export async function setViewport(page: Page, size: PixelSize): Promise<void> {
  const real = await realWindowBounds(page); // before the emulation changes what the page reports
  await page.setViewportSize(size);
  const problem = viewportFitProblem(size, real);
  if (problem === undefined) return;
  console.log(problem);
  if (viewportGuardIsStrict()) throw new Error(problem);
}
