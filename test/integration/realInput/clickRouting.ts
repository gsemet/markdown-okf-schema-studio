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
import * as vscode from "vscode";

import {
  formatHoverNeverReached,
  formatLandingRecords,
  formatListMarks,
  LANDING_RECORD_LIMIT,
  type LandingRecord,
  type LandingSource,
} from "../../shared/inputLandingProbe";

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
    // The webview iframe is mounted in an overlay of the workbench, not inside its editor group:
    // the group is the one whose box holds the iframe centre, and its editor area is what the
    // iframe must fill once the layout landed.
    const center = iframe === undefined ? undefined : (() => {
      const rect = iframe.getBoundingClientRect();
      return [rect.left + rect.width / 2, rect.top + rect.height / 2] as const;
    })();
    const group = center === undefined ? undefined : Array.from(document.querySelectorAll(".editor-group-container"))
      .filter((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return center[0] >= rect.left && center[0] <= rect.right && center[1] >= rect.top && center[1] <= rect.bottom;
      })
      .map((candidate) => candidate.querySelector(".editor-container") ?? candidate)[0];
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

/** The visible webview iframe box and the editor area of its group, from the workbench DOM. */
function readIframeAndGroup(): { iframe: number[]; group: number[] } | undefined {
  const boxOf = (element: Element): number[] => {
    const rect = element.getBoundingClientRect();
    return [rect.left, rect.top, rect.width, rect.height];
  };
  const iframe = Array.from(document.querySelectorAll("iframe.webview"))
    .find((frame) => frame.getBoundingClientRect().width > 0 && frame.getBoundingClientRect().height > 0);
  if (iframe === undefined) return undefined;
  const rect = iframe.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const group = Array.from(document.querySelectorAll(".editor-group-container")).find((candidate) => {
    const box = candidate.getBoundingClientRect();
    return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
  });
  if (group === undefined) return undefined;
  return { iframe: boxOf(iframe), group: boxOf(group.querySelector(".editor-container") ?? group) };
}

/** Whether the workbench side bar is shown, read from the workbench DOM. */
export async function readSideBarVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const side = document.getElementById("workbench.parts.sidebar");
    return side !== null && side.getBoundingClientRect().width > 0 && getComputedStyle(side).display !== "none";
  });
}

/**
 * Closes the side bar when it is open (never a blind toggle) and says whether it was. The caller
 * restores that state at its end with `restoreSideBar`. Waits for the DOM to show it hidden.
 */
export async function closeSideBarIfOpen(page: Page): Promise<boolean> {
  const wasOpen = await readSideBarVisible(page);
  if (wasOpen) {
    await vscode.commands.executeCommand("workbench.action.closeSidebar");
    await page.waitForFunction(() => {
      const side = document.getElementById("workbench.parts.sidebar");
      return side === null || side.getBoundingClientRect().width === 0 || getComputedStyle(side).display === "none";
    }, undefined, { timeout: 10_000 });
  }
  return wasOpen;
}

/** Reopens the side bar only when `closeSideBarIfOpen` found it open. */
export async function restoreSideBar(wasOpen: boolean): Promise<void> {
  if (wasOpen) await vscode.commands.executeCommand("workbench.action.toggleSidebarVisibility");
}

/**
 * Waits for a state proving the layout landed: the webview iframe fills the editor area of its
 * group (boxes equal within one pixel). Fails with the layout facts.
 */
export async function waitForLayoutLanded(page: Page): Promise<void> {
  const landed = (): boolean => {
    const boxes = (window as unknown as { studioReadIframeAndGroup: () => { iframe: number[]; group: number[] } | undefined })
      .studioReadIframeAndGroup();
    return boxes !== undefined && boxes.iframe.every((value, index) => Math.abs(value - boxes.group[index]!) <= 1);
  };
  try {
    await page.evaluate(`window.studioReadIframeAndGroup = ${readIframeAndGroup.toString()}`);
    await page.waitForFunction(landed, undefined, { timeout: 10_000 });
  } catch (error) {
    throw new Error(`the webview layout did not land: ${String(error).slice(0, 80)} ${await readLayoutFacts(page, undefined, undefined)}`);
  }
}

const LANDING_EVENTS = ["pointerdown", "mousedown", "focusin"] as const;

/**
 * Installs (once per document) capture-phase recorders of the landing events and returns the records.
 * Runs in a page: it must stay self-contained. Read-only: it never clicks, focuses or stops an event.
 */
function recordLanding([events, limit]: readonly [readonly string[], number]): LandingRecord[] {
  const scope = window as unknown as { studioLanding?: LandingRecord[] };
  if (scope.studioLanding === undefined) {
    const records: LandingRecord[] = [];
    scope.studioLanding = records;
    const describe = (target: EventTarget | null): string => {
      if (!(target instanceof Element)) return target === document ? "document" : String(target);
      const id = target.id === "" ? undefined : target.id;
      const text = target.tagName.toLowerCase() + (id === undefined ? "" : "#" + id)
        + Array.from(target.classList).slice(0, 3).map((name) => "." + name).join("");
      return text.length > 80 ? text.slice(0, 79) + "…" : text;
    };
    for (const type of events) {
      document.addEventListener(type, (event) => {
        const point = event as MouseEvent;
        const mouse = typeof point.clientX === "number";
        records.push({ at: Date.now(), type, target: describe(event.target), x: mouse ? point.clientX : undefined, y: mouse ? point.clientY : undefined });
        if (records.length > limit) records.splice(0, records.length - limit);
      }, true);
    }
  }
  return scope.studioLanding.slice();
}

/**
 * Installs the landing recorders in the workbench document and the webview host frame (idempotent).
 * Call it at the start of a real-window scenario; a failed install is ignored (the read says why).
 */
export async function installLandingProbe(page: Page, frame: Frame): Promise<void> {
  await page.evaluate(recordLanding, [LANDING_EVENTS, LANDING_RECORD_LIMIT] as const).catch(() => undefined);
  await frame.parentFrame()?.evaluate(recordLanding, [LANDING_EVENTS, LANDING_RECORD_LIMIT] as const).catch(() => undefined);
}

/** A text summary of the landing records since `since` (host `Date.now()`), times relative to `origin`. */
export async function readLandingSummary(page: Page, frame: Frame | undefined, origin: number, since: number): Promise<string> {
  const unreadable = (error: unknown): string => `unreadable: ${String(error).slice(0, 80)}`;
  const read = async (target: Page | Frame, name: string): Promise<LandingSource> => ({
    name,
    records: await (target as Page).evaluate(recordLanding, [LANDING_EVENTS, LANDING_RECORD_LIMIT] as const).catch(unreadable),
  });
  const host = frame?.parentFrame() ?? null;
  const sources: LandingSource[] = [await read(page, "workbench")];
  sources.push(host === null ? { name: "host", records: "no host frame" } : await read(host, "host"));
  return formatLandingRecords(sources, origin, since);
}

/** Page side of the list marks: the menu insertion and its transitionend, `Date.now()` stamped. */
function watchList(selector: string): void {
  const scope = window as unknown as { studioListMarks?: { at: number; mark: string }[] };
  if (scope.studioListMarks !== undefined) return;
  const marks: { at: number; mark: string }[] = [];
  scope.studioListMarks = marks;
  const seen = new WeakSet<Element>();
  const attach = (): void => {
    for (const menu of Array.from(document.querySelectorAll(selector))) {
      if (seen.has(menu)) continue;
      seen.add(menu);
      marks.push({ at: Date.now(), mark: "inserted" });
      menu.addEventListener("transitionend", (event) => {
        marks.push({ at: Date.now(), mark: "transitionend " + (event as TransitionEvent).propertyName });
      });
    }
  };
  new MutationObserver(attach).observe(document.documentElement, { childList: true, subtree: true });
  attach();
}

/** Starts recording the appearance of the palette lists in the content frame (idempotent, best-effort). */
export async function watchListAppearance(frame: Frame): Promise<void> {
  await frame.evaluate(watchList, ".sphinx-preview-edit-palette-menu").catch(() => undefined);
}

/** The list appearance marks of the content frame, on the clock of `origin`. */
export async function readListMarks(frame: Frame | undefined, origin: number): Promise<string> {
  if (frame === undefined) return formatListMarks("no content frame", origin);
  const marks = await frame.evaluate(() => (window as unknown as { studioListMarks?: { at: number; mark: string }[] }).studioListMarks?.slice())
    .catch((error: unknown) => `unreadable: ${String(error).slice(0, 80)}`);
  return formatListMarks(marks ?? "not watching", origin);
}

/** Page side of the hover recorder: the `data-edit-option` under the pointer, capture phase, never altering an event. */
function recordHover(): void {
  const scope = window as unknown as { studioHoveredOption?: string | null; studioHoverInstalled?: boolean };
  if (scope.studioHoverInstalled === true) return;
  scope.studioHoverInstalled = true;
  scope.studioHoveredOption = null;
  for (const type of ["mouseover", "pointerover"]) {
    document.addEventListener(type, (event) => {
      const option = (event.target as Element | null)?.closest?.("[data-edit-option]");
      scope.studioHoveredOption = option?.getAttribute("data-edit-option") ?? null;
    }, true);
  }
}

/**
 * Clicks an option of a list that has just opened, the way a real mouse does: hover first, wait
 * until the page reports the hover on that option, then press. A synthesized press with no
 * preceding hover can be routed by the host to the workbench instead of the webview process: in CI
 * stress run 43608210974 (round 17, palette) the press on the heading option landed on
 * `iframe.webview.ready` in the workbench document, the webview saw no mousedown and the block
 * editor committed on the blur; the earlier runs 43582068953 and 43576429177 lost the same click.
 * A real mouse always hovers before it presses, so the scenario does too. No sleep, no retry: the
 * wait is on a state the page reports. When the hover never arrives, the error says so and carries
 * the landing summary of the workbench and the host frame.
 */
export async function clickListOption(page: Page, frame: Frame, option: string, hoverTimeoutMs = 5_000): Promise<void> {
  const startedAt = Date.now();
  await frame.evaluate(recordHover);
  const target = frame.locator(`[data-edit-option='${option}']`);
  await target.hover();
  try {
    await frame.waitForFunction((wanted) =>
      (window as unknown as { studioHoveredOption?: string | null }).studioHoveredOption === wanted, option, { timeout: hoverTimeoutMs });
  } catch {
    throw new Error(formatHoverNeverReached(option, hoverTimeoutMs, await readLandingSummary(page, frame, startedAt, startedAt)));
  }
  await target.click();
}
