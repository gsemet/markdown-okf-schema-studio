/**
 * Where a real click on the edit toggle went (CR 328, rule 12 of the CI guidelines). The content
 * frame's own counter says whether the click reached the toggle; this file adds the two documents
 * above it, so a lost click names its place: the workbench (routed outside the webview), the host
 * frame `index.html` (the webview shell) or no document at all. It also reads the layout the click
 * met (the webview iframe box against its editor group container box), the side bar visibility and
 * the focused workbench part. Everything here only records: no listener stops or changes an event,
 * and a failed read is reported as text, never thrown.
 */
import type { Frame, Page } from "playwright-core";

/** Event counts of one document since its counters were installed (capture phase, at `document`). */
interface RoutingCounts {
  pointerdown: number;
  mousedown: number;
  click: number;
}

const COUNTED_EVENTS = ["pointerdown", "mousedown", "click"] as const;

/** Installs (once) and reads the capture-phase counters of the document it runs in. */
function countEvents(events: readonly string[]): RoutingCounts {
  const scope = window as unknown as { studioRoutingCounts?: RoutingCounts };
  let counts = scope.studioRoutingCounts;
  if (counts === undefined) {
    const created: RoutingCounts = { pointerdown: 0, mousedown: 0, click: 0 };
    for (const type of events) {
      document.addEventListener(type, () => { created[type as keyof RoutingCounts] += 1; }, true);
    }
    scope.studioRoutingCounts = created;
    counts = created;
  }
  return { ...counts };
}

function format(counts: RoutingCounts | string): string {
  return typeof counts === "string" ? counts : `pointerdown ${counts.pointerdown}, mousedown ${counts.mousedown}, click ${counts.click}`;
}

/** Counters of the content frame, the host frame and the workbench, read (and installed on first read). */
export async function readRoutingCounts(page: Page, frame: Frame): Promise<string> {
  const unreadable = (error: unknown): string => `unreadable: ${String(error).slice(0, 80)}`;
  const content = await frame.evaluate(countEvents, COUNTED_EVENTS).catch(unreadable);
  const host = frame.parentFrame();
  const shell = host === null ? "no parent frame" : await host.evaluate(countEvents, COUNTED_EVENTS).catch(unreadable);
  const workbench = await page.evaluate(countEvents, COUNTED_EVENTS).catch(unreadable);
  return `counts content [${format(content)}] host [${format(shell)}] workbench [${format(workbench)}]`;
}

/**
 * The webview iframe at the click point (workbench coordinates) against its editor group
 * container, the side bar visibility and the part holding the focus.
 */
export async function readLayoutFacts(page: Page, x: number | undefined, y: number | undefined): Promise<string> {
  return page.evaluate(([px, py]) => {
    const box = (element: Element | null | undefined): string => {
      if (!element) return "none";
      const rect = element.getBoundingClientRect();
      return [rect.left, rect.top, rect.width, rect.height].map((value) => Math.round(value)).join(",");
    };
    const iframes = Array.from(document.querySelectorAll("iframe.webview")).filter((frame) => {
      const rect = frame.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const atPoint = px === undefined || py === undefined ? undefined : iframes.find((frame) => {
      const rect = frame.getBoundingClientRect();
      return px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom;
    });
    const iframe = atPoint ?? iframes[0];
    const group = iframe?.closest(".editor-group-container") ?? undefined;
    const side = document.getElementById("workbench.parts.sidebar");
    const sideVisible = side !== null && side.getBoundingClientRect().width > 0 && getComputedStyle(side).display !== "none";
    const part = document.activeElement?.closest("[id^='workbench.parts.']")?.id.slice("workbench.parts.".length) ?? "none";
    const iframeBox = box(iframe);
    const groupBox = box(group);
    return `layout iframe ${iframeBox}${atPoint ? "" : " (not at the click point)"}, group ${groupBox}, `
      + `same ${String(iframeBox === groupBox)}, side bar ${sideVisible ? "visible" : "hidden"}, focused part ${part}`;
  }, [x, y] as const).catch((error: unknown) => `layout unreadable: ${String(error).slice(0, 80)}`);
}

/** Logs the side bar state at the start of a step: the adjacency the CR 328 loop looks at. */
export async function logSideBarState(page: Page, step: string): Promise<void> {
  const facts = await readLayoutFacts(page, undefined, undefined);
  console.log(`${step}: at the start, ${facts.slice(facts.indexOf("side bar"))}`);
}
