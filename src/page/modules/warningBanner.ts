/**
 * The warning banner of a rendered page (CR 050): when the render succeeded but the document uses
 * MyST syntax its `conf.py` does not enable, a discreet banner at the top of the preview says so
 * and offers the Problems view. The host already lists the warnings in the status region (visually
 * hidden on success); the banner counts its `myst-extension` lines. It is fixed, so opening or
 * closing it never moves the content, and it stays clear of the floating toolbar.
 *
 * Closing it hides it for that document until the set of warnings changes: the page keeps the key
 * of the closed set and tells the host, which hands it back on the next load of the document.
 */

export interface WarningBannerState {
  visible: boolean;
  /** Identifies the set of warnings (their messages, without the file and line prefix). */
  key: string;
  count: number;
}

/**
 * Whether the banner shows for this status and these `myst-extension` lines, and the key of the
 * set. Only a successful render shows it: every other status shows its region, warnings included.
 */
export function warningBannerState(
  status: string | null | undefined,
  warnings: readonly string[],
  dismissedKey?: string,
): WarningBannerState {
  if (status !== "success" || warnings.length === 0) return { visible: false, key: "", count: 0 };
  // `file:line: message` or `file:line:column: message`; a moved line is still the same warning.
  const messages = Array.from(new Set(warnings.map((text) =>
    String(text).replace(/^[\s\S]*?:\d+(?::\d+)?: /u, "").trim()))).sort();
  const joined = messages.join("\n");
  let hash = 0x811c9dc5;
  for (let index = 0; index < joined.length; index += 1) {
    hash ^= joined.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const key = messages.length.toString(36) + "-" + hash.toString(16).padStart(8, "0");
  return { visible: key !== dismissedKey, key, count: warnings.length };
}

/** The banner text for this many warnings: syntax of the page that its conf.py does not enable. */
export function warningBannerText(count: number): string {
  return count + (count === 1 ? " MyST syntax warning" : " MyST syntax warnings") + " from conf.py";
}

export interface WarningBannerContext {
  documentId: string;
  revision: number;
  requestId: number;
  /** The key of the set the user closed for this document in this session (from the host). */
  dismissedWarningBanner?: string;
  /** False when the Problems view does not list the warnings (Restricted Mode): no button. */
  warningsInProblems?: boolean;
}

export interface WarningBanner {
  /** Shows, keeps or removes the banner for the status region now in the page. */
  update(): void;
  state(): WarningBannerState;
}

/**
 * Installs the banner. `stateOf` and `textOf` are `warningBannerState` and `warningBannerText`,
 * passed in so the tests can replace them.
 */
export function installWarningBanner(
  document: any,
  vscode: { postMessage(message: unknown): void },
  context: WarningBannerContext,
  stateOf: typeof warningBannerState,
  textOf: typeof warningBannerText,
): WarningBanner {
  let dismissed = typeof context.dismissedWarningBanner === "string" ? context.dismissedWarningBanner : undefined;
  let banner: any;
  let shown = "";
  let current: WarningBannerState = { visible: false, key: "", count: 0 };

  const post = (type: string, extra: Record<string, unknown> = {}): void => {
    vscode.postMessage({
      type,
      documentId: context.documentId,
      revision: context.revision,
      requestId: context.requestId,
      ...extra,
    });
  };

  const remove = (): void => {
    if (banner) banner.remove?.();
    banner = undefined;
    shown = "";
  };

  const button = (attribute: string, label: string, text: string): any => {
    const element = document.createElement("button");
    element.setAttribute("type", "button");
    element.setAttribute(attribute, "");
    element.setAttribute("aria-label", label);
    element.setAttribute("title", label);
    element.textContent = text;
    return element;
  };

  // @implements_req SwRS-MDOKFSTUDIO-MYST-081
  const build = (state: WarningBannerState, texts: readonly string[]): any => {
    const element = document.createElement("div");
    element.setAttribute("data-sphinx-preview-warning-banner", "");
    element.setAttribute("data-warning-key", state.key);
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    const icon = document.createElement("span");
    icon.setAttribute("data-sphinx-preview-warning-icon", "");
    icon.setAttribute("aria-hidden", "true");
    element.appendChild(icon);
    const text = document.createElement("span");
    text.setAttribute("data-sphinx-preview-warning-text", "");
    text.textContent = textOf(state.count);
    element.appendChild(text);
    if (context.warningsInProblems === false) {
      // Restricted Mode publishes nothing to the Problems view: the lines are the banner's tooltip.
      element.setAttribute("title", texts.join("\n"));
    } else {
      const problems = button("data-sphinx-preview-warning-problems", "Open the Problems view to see the warnings", "Open Problems");
      problems.addEventListener("click", () => post("previewShowProblems"));
      element.appendChild(problems);
    }
    const close = button("data-sphinx-preview-warning-close", "Close the warning", "×");
    close.addEventListener("click", () => {
      dismissed = current.key;
      remove();
      post("previewWarningBannerClosed", { key: current.key });
    });
    element.appendChild(close);
    return element;
  };

  return {
    update() {
      const region = document.querySelector?.("[data-sphinx-preview-status]");
      const status = region?.getAttribute?.("data-sphinx-preview-status") ?? null;
      const texts = (region ? Array.from(region.querySelectorAll?.("li") ?? []) as any[] : [])
        .filter((item) => item.getAttribute?.("data-sphinx-preview-diagnostic-code") === "myst-extension")
        .map((item) => String(item.textContent ?? ""));
      current = stateOf(status, texts, dismissed);
      if (!current.visible) {
        remove();
        return;
      }
      if (banner && shown === current.key && banner.parentNode) return;
      remove();
      banner = build(current, texts);
      shown = current.key;
      const body = document.body;
      if (!body) return;
      // First in the Tab order, after the status region; it is fixed, so its place moves nothing.
      const after = region && region.parentNode === body ? region.nextSibling : body.firstChild;
      body.insertBefore(banner, after ?? null);
    },
    state: () => current,
  };
}
