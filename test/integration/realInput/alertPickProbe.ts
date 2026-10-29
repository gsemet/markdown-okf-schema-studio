import { type Frame, type Page } from "playwright-core";

import {
  type AlertPickMode,
  type AlertPickProbeEvent,
  type AlertPickTraceEntry,
  alertPickApplied,
  formatAlertPickProbeLine,
} from "../../shared/alertPickProbe";
import { windowFocusReport } from "../windowFocus";
import { waitForNoBlockEditor, withSmokeDocument } from "./common";
import {
  bufferText,
  findCurrentFrame,
  MOD,
  openSidePreview,
  press,
  setEditMode,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./harness";

const PARAGRAPH = "Second paragraph.";
const TEXT_BOX = "[data-sphinx-preview-block-editor] textarea";
const TYPE_LIST = ".sphinx-preview-edit-palette-menu[data-edit-popover='alert']";

/** What the probe's listeners saw in the content frame (page clock), and the page trace. */
interface ProbeReading {
  events: AlertPickProbeEvent[];
  trace: AlertPickTraceEntry[];
}

/**
 * Listens on the open block editor's text box of the content frame: each blur (related target,
 * page focus) and the alert head after each input, on the page trace's clock
 * (`performance.now()`). Listeners only; nothing here moves the focus.
 */
function installProbeInPage(): void {
  const events: Array<{ at: number; kind: "blur" | "input" | "mark"; detail: string }> = [];
  (window as unknown as { __alertPickProbe?: unknown }).__alertPickProbe = events;
  const box = document.querySelector("[data-sphinx-preview-block-editor] textarea");
  if (!(box instanceof HTMLTextAreaElement)) {
    events.push({ at: performance.now(), kind: "mark", detail: "no text box to listen on" });
    return;
  }
  box.addEventListener("blur", (event) => {
    const related = event.relatedTarget as Element | null;
    events.push({
      at: performance.now(),
      kind: "blur",
      detail: `related=${related ? related.tagName.toLowerCase() : "none"} pageFocus=${document.hasFocus()}`,
    });
  });
  box.addEventListener("input", () => {
    events.push({ at: performance.now(), kind: "input", detail: box.value.split("\n")[0] ?? "" });
  });
}

/** Adds a scenario step to the probe's events and returns its time on the page clock. */
function markInPage(label: string): number {
  const at = performance.now();
  (window as unknown as { __alertPickProbe?: Array<{ at: number; kind: string; detail: string }> })
    .__alertPickProbe?.push({ at, kind: "mark", detail: label });
  return at;
}

function readProbeInPage(): ProbeReading {
  const holder = window as unknown as {
    __alertPickProbe?: AlertPickProbeEvent[];
    __studioDiagnostics?: { trace(): AlertPickTraceEntry[] };
  };
  return { events: holder.__alertPickProbe ?? [], trace: holder.__studioDiagnostics?.trace() ?? [] };
}

/** The probe's reading from the editor's frame, or from the current one if that frame is gone. */
async function readProbe(page: Page, frame: Frame): Promise<ProbeReading & { note?: string }> {
  for (const candidate of [frame, await findCurrentFrame(page).catch(() => undefined)]) {
    if (candidate === undefined) continue;
    try {
      return await candidate.evaluate(readProbeInPage);
    } catch {
      // A detached frame: try the current one.
    }
  }
  return { events: [], trace: [], note: "no frame to read" };
}

/**
 * One pick of the alert type after the Alert button wrote `> [!NOTE]`: `keyboard` presses
 * ArrowDown twice and Enter in the text box (TIP), `mouse` moves the real mouse onto the WARNING
 * option and presses and releases it there (CDP input on the workbench page at the option's
 * place, no Playwright actionability step in between). Then Cmd/Ctrl+Enter commits. The log line
 * says what happened; the assertion is that the chosen type is in the file.
 */
async function probeAlertPick(page: Page, mode: AlertPickMode): Promise<void> {
  const chosen = mode === "keyboard" ? "TIP" : "WARNING";
  await withSmokeDocument(`realinput-alert-pick-${mode}`, async (source) => {
    await openSidePreview(source);
    await waitForRender(source);
    await setEditMode(page, true);
    await withCurrentFrame(page, (frame) => frame.locator("p", { hasText: PARAGRAPH }).click());
    const frame = await waitForEditor(page, TEXT_BOX);
    await press(page, "End");
    await withCurrentFrame(page, (current) => current.locator("[data-edit-action='alert']").click());
    const textBoxValue = (): Promise<string | undefined> => frame.evaluate((selector) =>
      document.querySelector<HTMLTextAreaElement>(selector)?.value, TEXT_BOX);
    await waitFor("the Alert button to write > [!NOTE]", async () => await textBoxValue() === `> [!NOTE]\n> ${PARAGRAPH}`);
    await waitFor("the alert type list", async () => await frame.locator(TYPE_LIST).count() === 1);
    await frame.evaluate(installProbeInPage);

    let pickAt: number | undefined;
    let failure: unknown;
    try {
      pickAt = await frame.evaluate(markInPage, `${mode} pick`);
      if (mode === "keyboard") {
        await press(page, "ArrowDown");
        await press(page, "ArrowDown");
        await press(page, "Enter");
      } else {
        const option = frame.locator(`${TYPE_LIST} [data-edit-option='${chosen}']`);
        const box = await option.boundingBox();
        if (box === null) throw new Error(`the ${chosen} option has no box on screen`);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
        await page.mouse.down();
        await page.mouse.up();
      }
      await waitFor(`the ${mode} pick to write > [!${chosen}] in the text box`,
        async () => await textBoxValue() === `> [!${chosen}]\n> ${PARAGRAPH}`);
      await frame.evaluate(markInPage, "commit key");
      await press(page, `${MOD}+Enter`);
      await waitFor(`the ${chosen} alert to reach the file`, () => alertPickApplied(bufferText(source), chosen, PARAGRAPH));
      await waitForRender(source);
      await waitForNoBlockEditor(page, "the block editor to close after the commit");
    } catch (error) {
      failure = error;
    }
    const reading = await readProbe(page, frame);
    const line = formatAlertPickProbeLine({
      mode,
      chosen,
      pickAt,
      probeEvents: reading.events,
      trace: reading.trace,
      markdown: bufferText(source),
      paragraph: PARAGRAPH,
    }) + (reading.note ? ` (${reading.note})` : "");
    console.log(line);
    if (failure !== undefined) {
      throw new Error(`${failure instanceof Error ? failure.message : String(failure)} ${line} ${await windowFocusReport(page)}`);
    }
    if (!alertPickApplied(bufferText(source), chosen, PARAGRAPH)) {
      throw new Error(`The ${mode} pick did not put > [!${chosen}] in the file. ${line} ${await windowFocusReport(page)}`);
    }
  });
}

/**
 * Stress probe `alert-type-pick-probe`: does a user's pick in the alert type list reach the file,
 * with the keyboard and with a real mouse press? (See test/shared/alertPickProbe.ts.)
 */
export async function scenarioAlertTypePickProbe(page: Page): Promise<void> {
  await probeAlertPick(page, "keyboard");
  await probeAlertPick(page, "mouse");
}
