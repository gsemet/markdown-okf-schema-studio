import type { PreviewLinkTargetsMessage } from "../../core/protocol/hostToPage";

export interface LinkRuntimeContext {
  documentId: string;
  revision: number;
  requestId: number;
}

const WARNING_CLASS = "sphinx-preview-link-warning";
let warningCounter = 0;

/** The second tooltip line a link carries in edit mode, and the title it had without it. */
const FOLLOW_HINT = "data-sphinx-preview-follow-hint";
const BASE_TITLE = "data-sphinx-preview-link-title";

const withHint = (base: string, hint: string): string => base ? `${base}\n${hint}` : hint;

/**
 * The title of a link without its edit-mode follow hint: the tooltip the host gave it. A content
 * render saves this one, so the rebuilt link does not get the hint line twice.
 */
export function linkBaseTitle(link: Element): string | null {
  const title = link.getAttribute("title");
  const hint = link.getAttribute(FOLLOW_HINT);
  if (!hint) return title;
  const stored = link.getAttribute(BASE_TITLE) ?? "";
  return title === withHint(stored, hint) ? stored || null : title;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-014
/**
 * Sets (`hint`) or removes (undefined) the second line of a link's tooltip, keeping the first line:
 * the title the link has without the hint. A title rewritten since the hint was set (a later
 * `applyLinkHint`, a render) becomes the new first line. Safe to call again.
 */
export function setLinkFollowHint(link: Element, hint: string | undefined): void {
  const previousHint = link.getAttribute(FOLLOW_HINT);
  const title = link.getAttribute("title");
  let base = title ?? "";
  if (previousHint) {
    const stored = link.getAttribute(BASE_TITLE) ?? "";
    if (title === withHint(stored, previousHint)) base = stored;
  }
  if (hint === undefined) {
    if (!previousHint) return;
    link.removeAttribute(FOLLOW_HINT);
    link.removeAttribute(BASE_TITLE);
    if (base) link.setAttribute("title", base);
    else link.removeAttribute("title");
    return;
  }
  link.setAttribute(FOLLOW_HINT, hint);
  link.setAttribute(BASE_TITLE, base);
  link.setAttribute("title", withHint(base, hint));
}

/**
 * Marks a link with what the host found at its target: the kind and the tooltip. A blocked target
 * (missing, outside the workspace, refused) also gets a small warning icon right after the link,
 * with the reason as its tooltip and as the description of the link; the link itself keeps its
 * text and colour. Safe to call again for the same link.
 */
export function applyLinkHint(document: Document, link: Element, kind: string, title: string): void {
  link.setAttribute("data-sphinx-preview-link-state", kind);
  link.setAttribute("title", title);
  // In edit mode the tooltip keeps its "Cmd/Ctrl+click to follow" line under the new title.
  const followHint = link.getAttribute(FOLLOW_HINT);
  if (followHint) setLinkFollowHint(link, followHint);
  const following = link.nextSibling as Element | null;
  const existing = following && typeof following.getAttribute === "function"
    && (following.getAttribute("class") ?? "").split(/\s+/u).includes(WARNING_CLASS)
    ? following
    : undefined;
  if (kind !== "blocked") {
    existing?.remove();
    if (existing) link.removeAttribute("aria-describedby");
    return;
  }
  const icon = existing ?? document.createElement("span");
  if (!existing) {
    warningCounter += 1;
    icon.setAttribute("class", WARNING_CLASS);
    icon.setAttribute("id", `${WARNING_CLASS}-${warningCounter}`);
    // Decorative for screen readers: the reason is the description of the link.
    icon.setAttribute("aria-hidden", "true");
    link.parentNode?.insertBefore(icon, link.nextSibling);
  }
  icon.setAttribute("title", title);
  icon.setAttribute("aria-label", title);
  link.setAttribute("aria-describedby", icon.getAttribute("id") as string);
}

export function installLinkNavigation(
  document: Document,
  window: Window & typeof globalThis,
  vscode: { postMessage(message: unknown): void },
  context: LinkRuntimeContext,
  beforeNavigate?: (navigate: () => void) => void,
  editsInstead?: (event: Event) => boolean,
): { rescan(): void; applyTargets(message: Pick<PreviewLinkTargetsMessage, "targets">): void } {
  const selector = "a[data-sphinx-preview-navigation]";
  let links = Array.from(document.querySelectorAll<HTMLAnchorElement>(selector));
  const discovered = new Set<string>();
  const pending = new Set<string>();
  let scheduled = false;
  const flush = (): void => {
    scheduled = false;
    const requests = [...pending].slice(0, 64);
    requests.forEach((request) => pending.delete(request));
    if (requests.length) vscode.postMessage({ type: "previewLinkDiscover", ...context, requests });
    if (pending.size) {
      scheduled = true;
      window.queueMicrotask(flush);
    }
  };
  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-079
  const discover = (link: Element): void => {
    const request = link.getAttribute("data-sphinx-preview-navigation");
    if (!request || request.startsWith("#") || request.startsWith("okf-link:")
      || /^(?:https?:|mailto:)/iu.test(request)
      || discovered.has(request)) return;
    discovered.add(request);
    pending.add(request);
    if (!scheduled) {
      scheduled = true;
      window.queueMicrotask(flush);
    }
  };
  const observed = new WeakSet<Element>();
  let observe = (_link: Element): void => undefined;
  let unobserve = (_link: Element): void => undefined;
  if (typeof window.IntersectionObserver === "function") {
    const observer = new window.IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        discover(entry.target);
        observer.unobserve(entry.target);
      }
    });
    observe = (link: Element): void => {
      if (observed.has(link)) return;
      observed.add(link);
      observer.observe(link);
    };
    unobserve = (link: Element): void => {
      observer.unobserve(link);
      observed.delete(link);
    };
    links.forEach(observe);
    window.addEventListener("unload", () => observer.disconnect(), { once: true });
    // Files may have been created or deleted while the reader was elsewhere: when the preview
    // comes back, the links forget their target and the ones in view are asked again.
    const refresh = (): void => {
      discovered.clear();
      links = Array.from(document.querySelectorAll<HTMLAnchorElement>(selector));
      for (const link of links) {
        unobserve(link);
        observe(link);
      }
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refresh();
    });
  }
  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-077
  const activate = (event: Event): void => {
    if (event.type === "auxclick" && (event as MouseEvent).button !== 1) return;
    // Edit mode: a plain click, Enter or Space on a link edits its block (CR 217); the page input
    // opens the editor and keeps the browser from following the link.
    if (editsInstead?.(event)) return;
    const link = event.target instanceof Element ? event.target.closest(selector) : undefined;
    const request = link?.getAttribute("data-sphinx-preview-navigation");
    if (!request) return;
    event.preventDefault();
    const navigate = (): void => vscode.postMessage({ type: "previewLink", ...context, request });
    // A link to another file replaces this page: save what the open editor holds first (CR 025);
    // the flush calls navigate once its saves are posted. Same-page anchors keep the page and its
    // editor.
    if (beforeNavigate && !request.startsWith("#")) beforeNavigate(navigate);
    else navigate();
  };
  document.addEventListener("click", activate);
  document.addEventListener("auxclick", activate);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") activate(event);
  });
  // Called after the content was replaced: observes the links that are not observed yet, releases
  // the ones the content no longer holds and makes the target hints apply to the new links.
  return {
    // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-079
    rescan(): void {
      const next = Array.from(document.querySelectorAll<HTMLAnchorElement>(selector));
      const kept = new Set<Element>(next);
      // Links of the replaced content are detached: the observer must not keep them alive.
      for (const link of links) if (!kept.has(link)) unobserve(link);
      links = next;
      links.forEach(observe);
    },
    // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-085
    // The host's answer to a discovery (previewLinkTargets, routed by the page once the host
    // message filter has matched it to this render): a hint per link, never a new target.
    applyTargets(message): void {
      for (const target of message.targets) {
        for (const link of links) {
          if (link.getAttribute("data-sphinx-preview-navigation") !== target.request) continue;
          applyLinkHint(document, link, target.kind as string, target.path ?? target.reason ?? target.request);
        }
      }
    },
  };
}
