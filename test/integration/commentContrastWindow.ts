/**
 * Real-window contrast of an open review thread (CR 110, round 2). A REAL VS Code window runs a
 * dark and a light colour theme; the preview takes every preview theme (host, Dark, White, Cream);
 * the open popover (author, date, body, Resolve, Delete, Reply box, Reply) is measured on what
 * the webview actually paints (computed colours, opacity of every ancestor, backgrounds
 * composited), and each text reaches WCAG AA 4.5:1.
 *
 * `STUDIO_COMMENT_SHOTS=<folder>` also writes one PNG of the popover per host and preview theme.
 * The scenario leaves the window as it found it: no editor, settings restored, files removed.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Frame, Page } from "playwright-core";
import * as vscode from "vscode";

import { getActivePreviewForTests } from "./extensionApi";
import {
  closeAllEditors,
  connectWorkbench,
  createFixture,
  findCurrentFrame,
  openSidePreview,
  setEditMode,
  waitFor,
  withCurrentFrame,
} from "./realInput/harness";

export interface ContrastRow {
  name: string;
  foreground: string;
  background: string;
  ratio: number;
}

/**
 * Runs in the page. Measures every text of the open popover as painted: the foreground colour with
 * its own alpha and the opacity of the element and every ancestor, over the backgrounds below it.
 * Must stay self-contained (it is serialised into the webview).
 */
export function measurePopover(): ContrastRow[] {
  type Color = [number, number, number, number];
  const parse = (text: string): Color => {
    const rgb = /^rgba?\(([^)]+)\)$/u.exec(text);
    if (rgb) {
      const parts = rgb[1]!.split(/[\s,/]+/u).filter(Boolean).map(Number);
      return [parts[0]!, parts[1]!, parts[2]!, parts[3] ?? 1];
    }
    const srgb = /^color\(srgb ([^)]+)\)$/u.exec(text);
    if (srgb) {
      const parts = srgb[1]!.split(/[\s/]+/u).filter(Boolean).map(Number);
      return [parts[0]! * 255, parts[1]! * 255, parts[2]! * 255, parts[3] ?? 1];
    }
    throw new Error(`unreadable colour ${text}`);
  };
  const over = (top: Color, bottom: Color): Color => {
    const alpha = top[3] + bottom[3] * (1 - top[3]);
    if (alpha === 0) return [0, 0, 0, 0];
    const mix = (index: 0 | 1 | 2): number => (top[index] * top[3] + bottom[index] * bottom[3] * (1 - top[3])) / alpha;
    return [mix(0), mix(1), mix(2), alpha];
  };
  const luminance = (color: Color): number => {
    const channel = (value: number): number => {
      const unit = value / 255;
      return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(color[0]) + 0.7152 * channel(color[1]) + 0.0722 * channel(color[2]);
  };
  const ratioOf = (a: Color, b: Color): number => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
    return (high + 0.05) / (low + 0.05);
  };
  const opacityChain = (element: Element): number => {
    let value = 1;
    for (let node: Element | null = element; node; node = node.parentElement) {
      value *= Number(getComputedStyle(node).opacity);
    }
    return value;
  };
  // The backgrounds below `element` (its own included when `includeSelf`), painted bottom to top.
  const backdrop = (element: Element, includeSelf: boolean): Color => {
    const layers: Color[] = [];
    for (let node: Element | null = includeSelf ? element : element.parentElement; node; node = node.parentElement) {
      layers.push(parse(getComputedStyle(node).backgroundColor));
    }
    layers.push(parse(getComputedStyle(document.documentElement).backgroundColor));
    let result: Color = [255, 255, 255, 1];
    for (const layer of layers.reverse()) result = over(layer, result);
    return result;
  };
  const row = (name: string, element: Element | null, color: string, own: boolean, extraOpacity = 1): ContrastRow => {
    if (!element) throw new Error(`the popover has no ${name}`);
    const background = backdrop(element, own);
    const parsed = parse(color);
    parsed[3] *= opacityChain(element) * extraOpacity;
    const foreground = over(parsed, background);
    const hex = (c: Color): string => `rgb(${c.slice(0, 3).map((v) => Math.round(v)).join(", ")})`;
    return { name, foreground: hex(foreground), background: hex(background), ratio: ratioOf(foreground, background) };
  };
  const popover = document.querySelector("[data-okf-comment-popover]");
  if (!popover) throw new Error("no open popover");
  const text = (name: string, selector: string): ContrastRow => {
    const element = popover.querySelector(selector);
    return row(name, element, element ? getComputedStyle(element).color : "", false);
  };
  const button = (name: string, selector: string): ContrastRow => {
    const element = popover.querySelector(selector);
    return row(name, element, element ? getComputedStyle(element).color : "", true);
  };
  const textarea = popover.querySelector("[data-okf-comment-reply-input]");
  const placeholder = textarea ? getComputedStyle(textarea, "::placeholder") : undefined;
  return [
    text("author", "[data-okf-comment-head] strong"),
    text("date", "[data-okf-comment-head] span"),
    text("body", "[data-okf-comment-body]"),
    row("placeholder", textarea, placeholder?.color ?? "", true, Number(placeholder?.opacity ?? 1)),
    button("Resolve", "[data-okf-comment-resolve]"),
    button("Delete", "[data-okf-comment-delete]"),
    button("Reply", "[data-okf-comment-reply-send]"),
  ];
}

const HOSTS = ["Default Dark Modern", "Default Light Modern"] as const;
const MODES = ["current", "dark", "white", "cream"] as const;

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-002
/** review-annotations/r07: the open thread popover reads at 4.5:1 on every host and preview theme. */
export async function scenarioCommentContrast(page: Page): Promise<void> {
  const settings = vscode.workspace.getConfiguration("markdownOkfSchemaStudio.comments");
  const workbench = vscode.workspace.getConfiguration("workbench");
  const originalAuthor = settings.inspect<string>("authorName")?.globalValue;
  const originalTheme = workbench.inspect<string>("colorTheme")?.globalValue;
  const shots = process.env.STUDIO_COMMENT_SHOTS;
  const text = "# Normative behavior\n\nWhen a document holds a few words, the preview stays readable.\n\nThe second paragraph.\n";
  const now = "2026-10-26T16:38:52.000Z";
  const sidecar = {
    version: 1,
    document: "notes.md",
    threads: [{
      id: "t_00000001",
      anchor: { line: 3, endLine: 3, quote: "When a document", prefix: "", suffix: " holds" },
      resolved: false,
      createdAt: now,
      comments: [{ id: "c_00000001", author: "az02065", createdAt: now, body: "this is a comment" }],
    }],
  };
  await settings.update("authorName", "az02065", vscode.ConfigurationTarget.Global);
  const fixture = createFixture("realinput-contrast", {
    "notes.md": text,
    "notes.comments.json": JSON.stringify(sidecar, null, 2),
  });
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("notes.md")));
    try {
      await openSidePreview(document);
      await waitFor("the preview to be ready", () => {
        const preview = getActivePreviewForTests();
        return preview?.documentUri === document.uri.toString() && preview.phase === "ready" && preview.webviewReady;
      });
      await setEditMode(page, false);
      const failures: string[] = [];
      const summary: string[] = [];
      for (const host of HOSTS) {
        await workbench.update("colorTheme", host, vscode.ConfigurationTarget.Global);
        const kind = host.includes("Dark") ? "dark" : "light";
        await waitFor(`the ${host} host theme to reach the webview`, async () => {
          const current = await findCurrentFrame(page);
          return current !== undefined
            && await current.locator("body").evaluate((body, wanted) => body.classList.contains(`vscode-${wanted}`), kind);
        });
        for (const mode of MODES) {
          await withCurrentFrame(page, async (frame) => {
            const toggle = frame.locator("[data-sphinx-preview-theme-toggle]");
            for (let attempt = 0; attempt < 4; attempt += 1) {
              if (await toggle.getAttribute("data-theme-mode") === mode) break;
              await toggle.click();
            }
            await frame.locator("html:not([data-sphinx-preview-theme-switching])").waitFor();
            assert.equal(await frame.locator("html").getAttribute("data-sphinx-preview-theme-mode"), mode);
          });
          await openPopover(page);
          const rows = await withCurrentFrame(page, (frame) => frame.evaluate(measurePopover));
          if (shots !== undefined) await shootPopover(page, path.join(shots, `${kind}-host-${mode}.png`));
          const label = `${host}, ${mode} preview`;
          for (const entry of rows) {
            summary.push(`${label}: ${entry.name} ${entry.ratio.toFixed(2)} ${entry.foreground} on ${entry.background}`);
            if (entry.ratio < 4.5) failures.push(`${label}: ${entry.name} ${entry.ratio.toFixed(2)}`);
          }
        }
      }
      if (shots !== undefined) fs.writeFileSync(path.join(shots, "contrast.txt"), `${summary.join("\n")}\n`);
      assert.deepEqual(failures, [], "every text of the open thread reaches 4.5:1 on every host and preview theme");
    } finally {
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
    await workbench.update("colorTheme", originalTheme, vscode.ConfigurationTarget.Global);
    await settings.update("authorName", originalAuthor, vscode.ConfigurationTarget.Global);
  }
}

/** Opens the popover of the one thread (closing a popover left open by the previous step first). */
async function openPopover(page: Page): Promise<void> {
  await withCurrentFrame(page, async (frame) => {
    if (await frame.locator("[data-okf-comment-popover]").count() === 0) {
      await frame.locator("mark[data-okf-comment-thread]").click();
    }
  });
  await waitFor("the thread popover with its reply box", () => withCurrentFrame(page, async (frame) =>
    await frame.locator("[data-okf-comment-popover] [data-okf-comment-reply-send]").count() === 1
    && await frame.locator("[data-okf-comment-popover] [data-okf-comment-delete]").count() === 1));
  await page.mouse.move(2, 2);
}

/** A PNG of the quote and its popover, as the user sees them in the window. */
async function shootPopover(page: Page, file: string): Promise<void> {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const box = await withCurrentFrame(page, async (frame: Frame) => {
    const popover = await frame.locator("[data-okf-comment-popover]").boundingBox();
    const mark = await frame.locator("mark[data-okf-comment-thread]").boundingBox();
    if (!popover || !mark) throw new Error("no box for the popover or its quote");
    const left = Math.min(popover.x, mark.x) - 24;
    const top = Math.min(popover.y, mark.y) - 24;
    return { x: Math.max(0, left), y: Math.max(0, top),
      width: Math.max(popover.x + popover.width, mark.x + mark.width) + 24 - Math.max(0, left),
      height: popover.y + popover.height + 24 - Math.max(0, top) };
  });
  await page.screenshot({ path: file, clip: box });
}

/** Suite entry: the scenario in the window the trusted suite runs in. */
export async function run(): Promise<void> {
  const { browser, page } = await connectWorkbench();
  try {
    await page.setViewportSize({ width: 1400, height: 900 });
    await scenarioCommentContrast(page);
  } finally {
    await browser.close();
  }
}
