import type { PreviewLinkTargetsMessage } from "../protocol/hostToPage";

export interface LinkRuntimeContext {
  documentId: string;
  revision: number;
  requestId: number;
}

export function installLinkNavigation(
  document: Document,
  window: Window & typeof globalThis,
  vscode: { postMessage(message: unknown): void },
  context: LinkRuntimeContext,
  beforeNavigate?: (navigate: () => void) => void,
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
    links.forEach(observe);
    window.addEventListener("unload", () => observer.disconnect(), { once: true });
  }
  const activate = (event: Event): void => {
    if (event.type === "auxclick" && (event as MouseEvent).button !== 1) return;
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
  // Called after the content was replaced: observes the links that are not observed yet and makes
  // the target hints apply to the links of the new content.
  return {
    rescan(): void {
      links = Array.from(document.querySelectorAll<HTMLAnchorElement>(selector));
      links.forEach(observe);
    },
    // The host's answer to a discovery (previewLinkTargets, routed by the page once the host
    // message filter has matched it to this render): a hint per link, never a new target.
    applyTargets(message): void {
      for (const target of message.targets) {
        for (const link of links) {
          if (link.getAttribute("data-sphinx-preview-navigation") !== target.request) continue;
          link.setAttribute("data-sphinx-preview-link-state", target.kind as string);
          link.setAttribute("title", target.path ?? target.reason ?? target.request);
        }
      }
    },
  };
}
