/**
 * Viewport guard of the real-window tests (CI guideline rules 9 and 12, CR-326).
 *
 * `page.setViewportSize` is CDP device-metrics emulation: it changes the layout viewport, not the
 * real window. When the emulated viewport is wider or taller than the real window or the X screen,
 * a point of the layout can lie outside the surface that receives input, and the mouse events
 * dispatched there can be dropped (the `toc` edit toggle that "missed 3 clicks" on a 1280 px
 * Xvfb screen with a 1400 px viewport). This module holds the pure decision, so it is unit
 * testable; the harness reads the real sizes and calls it.
 *
 * No vscode, no playwright.
 */

export interface PixelSize {
  readonly width: number;
  readonly height: number;
}

/** The real sizes the viewport must fit in; a size that could not be read is undefined. */
export interface RealSurface {
  /** Bounds of the browser window (CDP `Browser.getWindowForTarget`). */
  readonly window?: PixelSize;
  /** `screen.width` and `screen.height` of the page. */
  readonly screen?: PixelSize;
}

const label = (size: PixelSize): string => `${size.width}x${size.height}`;

/**
 * The message of a viewport that does not fit the real window or screen, naming both sizes, or
 * undefined when it fits (or when no real size could be read: the guard cannot tell).
 */
export function viewportFitProblem(viewport: PixelSize, real: RealSurface): string | undefined {
  const exceeded: string[] = [];
  const check = (name: string, size: PixelSize | undefined): void => {
    if (size === undefined || size.width <= 0 || size.height <= 0) return;
    if (viewport.width > size.width || viewport.height > size.height) exceeded.push(`${name} ${label(size)}`);
  };
  check("window", real.window);
  check("screen", real.screen);
  if (exceeded.length === 0) return undefined;
  return `VIEWPORT EXCEEDS WINDOW: the emulated viewport ${label(viewport)} does not fit the real `
    + `${exceeded.join(" and ")}; a click past the real edge can be dropped before it reaches the page`;
}

/** True when `STUDIO_VIEWPORT_GUARD=strict`: an oversize viewport then fails the test instead of only being logged. */
export function viewportGuardIsStrict(environment: { STUDIO_VIEWPORT_GUARD?: string } = process.env): boolean {
  return environment.STUDIO_VIEWPORT_GUARD?.trim() === "strict";
}
