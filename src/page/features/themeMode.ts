/**
 * The page's colours: the host theme kind (`themeChanged`) and the preview theme mode the toolbar
 * theme button cycles through (current, dark, white, cream). The stylesheet maps each mode to the
 * neutral `--studio-*` tokens (src/preview/themeTokens.ts).
 */

import type { PreviewRuntimeContext } from "../../protocol/bootContext";
import { DEFAULT_PREVIEW_THEME_MODE, type PreviewThemeMode } from "../../state/previewTheme";
import type { HostMessageRouter } from "../hostMessages";
import type { PageHostApi, PageSavedState } from "../pageHost";

/** The theme modes in the order the theme button cycles through them. */
export const PREVIEW_THEME_MODES: readonly PreviewThemeMode[] = ["current", "dark", "white", "cream"];

const THEME_LABELS: Readonly<Record<PreviewThemeMode, string>> = {
  current: "Current theme",
  dark: "Dark theme",
  white: "White theme",
  cream: "Cream theme",
};

/** What the theme feature needs from the page. */
export interface ThemeModeDeps {
  readonly host: PageHostApi;
  readonly context: PreviewRuntimeContext;
  /** The saved state the page started with. */
  readonly savedState: PageSavedState | undefined;
  /** Starts the colour transition of a theme switch (motion.ts). */
  themeSwitch(): void;
}

/** The theme feature of a page. */
export interface ThemeMode {
  /** The preview theme mode shown now. */
  mode(): PreviewThemeMode;
  /** Shows a theme mode (an unknown value shows the default) and labels the theme button. */
  applyPreviewThemeMode(mode: unknown): void;
  /** Lets the theme button cycle the modes. */
  bindButton(): void;
  /** Marks the page with the host's theme kind and the reduced-motion preference. */
  applyTheme(themeKind: number | undefined): void;
}

const isThemeMode = (mode: unknown): mode is PreviewThemeMode =>
  (PREVIEW_THEME_MODES as readonly unknown[]).includes(mode);

/**
 * The theme feature. The first mode is the host's stored choice, else the saved state's, else the
 * default; nothing is shown until {@link ThemeMode.applyPreviewThemeMode} runs. Handles
 * `themeChanged`.
 */
export function installThemeMode(
  document: Document,
  window: Window & typeof globalThis,
  router: HostMessageRouter,
  deps: ThemeModeDeps,
): ThemeMode {
  const { host, context, savedState } = deps;
  const themeButton = document.querySelector?.("[data-sphinx-preview-theme-toggle]");
  let previewThemeMode: PreviewThemeMode = isThemeMode(context.previewThemeMode)
    ? context.previewThemeMode
    : isThemeMode(savedState?.previewThemeMode)
      ? savedState.previewThemeMode
      : DEFAULT_PREVIEW_THEME_MODE;

  function applyTheme(themeKind: number | undefined): void {
    const target = document.documentElement ?? document.body;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    target?.setAttribute?.("data-sphinx-preview-theme", String(themeKind ?? "default"));
    target?.setAttribute?.("data-sphinx-preview-reduced-motion", reducedMotion ? "true" : "false");
  }

  function applyPreviewThemeMode(requested: unknown): void {
    const mode = isThemeMode(requested) ? requested : DEFAULT_PREVIEW_THEME_MODE;
    previewThemeMode = mode;
    document.documentElement?.setAttribute?.("data-sphinx-preview-theme-mode", mode);
    themeButton?.setAttribute?.("data-theme-mode", mode);
    const nextMode = PREVIEW_THEME_MODES[(PREVIEW_THEME_MODES.indexOf(mode) + 1) % PREVIEW_THEME_MODES.length]!;
    themeButton?.setAttribute?.("aria-label", "Preview theme: " + THEME_LABELS[mode]);
    const tooltip = THEME_LABELS[mode] + " (click for " + THEME_LABELS[nextMode].toLowerCase() + ")";
    themeButton?.setAttribute?.("title", tooltip);
    themeButton?.setAttribute?.("data-tooltip", tooltip);
  }

  function cyclePreviewThemeMode(): void {
    const currentIndex = PREVIEW_THEME_MODES.indexOf(previewThemeMode);
    deps.themeSwitch();
    applyPreviewThemeMode(PREVIEW_THEME_MODES[(currentIndex + 1) % PREVIEW_THEME_MODES.length]);
    const state = host.getState?.();
    host.setState?.({
      ...(state && typeof state === "object" ? state : {}),
      previewThemeMode,
    });
    host.postMessage({
      type: "previewThemeModeChanged",
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      previewThemeMode,
    });
  }

  router.on("themeChanged", (message) => {
    applyTheme(message.themeKind);
  });
  return {
    mode: () => previewThemeMode,
    applyPreviewThemeMode,
    bindButton: () => themeButton?.addEventListener?.("click", cyclePreviewThemeMode),
    applyTheme,
  };
}
