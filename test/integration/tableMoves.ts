import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import type { Page } from "playwright-core";

import {
  bufferText,
  closeAllEditors,
  createFixture,
  findCurrentFrame,
  openSidePreview,
  press,
  setEditMode,
  typeText,
  waitFor,
  waitForEditor,
  waitForRender,
  withCurrentFrame,
} from "./realInput/harness";

/**
 * Real-window scenarios of the table editing of CR 115: the conversion of a pipe table to a
 * `{list-table}` and back, the click on a cell of each, the move of a body row and of a column by
 * a real mouse drag and by key, on both syntaxes, with and without a cell editor open.
 */

const PIPE = [
  "# Tables", "", "| H1 | H2 | H3 |", "| --- | --- | --- |", "| a1 | a2 | a3 |", "| b1 |  | b3 |",
  "| c1 | c2 | c3 |", "",
].join("\n");

const LIST = [
  "# Tables", "", "```{list-table}", ":header-rows: 1", "", "* - H1", "  - H2", "  - H3",
  "* - a1", "  - a2", "  - a3", "* - b1", "  -", "  - b3", "* - c1", "  - c2", "  - c3", "```", "",
].join("\n");

/** The table of `PIPE` or `LIST` with the first column moved to the end. */
const COLUMN_TO_END = {
  pipe: [
    "# Tables", "", "| H2 | H3 | H1 |", "| --- | --- | --- |", "| a2 | a3 | a1 |", "|  | b3 | b1 |",
    "| c2 | c3 | c1 |", "",
  ].join("\n"),
  "list-table": [
    "# Tables", "", "```{list-table}", ":header-rows: 1", "", "* - H2", "  - H3", "  - H1",
    "* - a2", "  - a3", "  - a1", "* -", "  - b3", "  - b1", "* - c2", "  - c3", "  - c1", "```", "",
  ].join("\n"),
};

/** `COLUMN_TO_END` after Alt+Left on the moved column: the order H2 H1 H3. */
const COLUMN_BACK_ONE = {
  pipe: [
    "# Tables", "", "| H2 | H1 | H3 |", "| --- | --- | --- |", "| a2 | a1 | a3 |", "|  | b1 | b3 |",
    "| c2 | c1 | c3 |", "",
  ].join("\n"),
  "list-table": [
    "# Tables", "", "```{list-table}", ":header-rows: 1", "", "* - H2", "  - H1", "  - H3",
    "* - a2", "  - a1", "  - a3", "* -", "  - b1", "  - b3", "* - c2", "  - c1", "  - c3", "```", "",
  ].join("\n"),
};

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs `scenario` on a document of `content` shown in the preview with edit mode on. */
async function withTable(
  page: Page, prefix: string, content: string, scenario: (document: vscode.TextDocument) => Promise<void>,
): Promise<void> {
  const fixture = createFixture(prefix, { "tables.md": content });
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture.path("tables.md")));
    try {
      await openSidePreview(document);
      await waitForRender(document);
      await setEditMode(page, true);
      await scenario(document);
    } finally {
      try {
        const frame = await findCurrentFrame(page);
        if (frame !== undefined && await frame.locator("html").getAttribute("data-sphinx-preview-edit-mode") === "on") {
          await setEditMode(page, false);
          await wait(250);
        }
      } catch {
        // Best effort: it must not hide the scenario's own result.
      }
      await closeAllEditors();
    }
  } finally {
    fixture.dispose();
  }
}

/** Waits for the buffer to equal `expected`, the preview to show it and the handles to be rebuilt. */
async function expectBuffer(page: Page, document: vscode.TextDocument, expected: string, what: string): Promise<void> {
  try {
    await waitFor(what, () => bufferText(document) === expected);
  } catch (error) {
    throw new Error(`${String(error)} The buffer holds ${JSON.stringify(bufferText(document))}.`, { cause: error });
  }
  await waitForRender(document);
  await waitFor("the table handles after the render", async () => {
    const current = await findCurrentFrame(page);
    return current !== undefined && await current.locator(".okf-table-col-handle").count() > 0;
  });
}

/**
 * A real mouse drag from the centre of `handle` to the point of `target` at the given fractions of
 * its box (the half of a row or a column decides before or after).
 *
 * The point is one the reader can reach. A table wider than the pane scrolls sideways (an open cell
 * editor widens its column): the box of a row then runs past what the table shows, and a header cell
 * can sit partly out of view. A cell target is scrolled into view far enough for its point; the point
 * on a row stays inside the visible part of the table (a row's half is read on the vertical axis).
 */
async function dragTo(page: Page, handle: string, target: string, at: { x: number; y: number }): Promise<void> {
  await withCurrentFrame(page, (frame) => frame.locator(target).first().evaluate((element, fraction) => {
    const table = element.closest("table");
    if (!table || element.tagName === "TR") return;
    const box = element.getBoundingClientRect();
    const shown = table.getBoundingClientRect();
    const x = box.left + box.width * fraction;
    const left = Math.max(shown.left, 0) + 4;
    const right = Math.min(shown.right, element.ownerDocument.documentElement.clientWidth) - 4;
    if (x > right) table.scrollLeft += x - right;
    else if (x < left) table.scrollLeft -= left - x;
  }, at.x));
  // The handles follow the table through a ResizeObserver, a scroll listener and a frame: after a
  // cell editor opened or grew (toolbar above the table, taller row) or the table scrolled, a handle
  // sits where its row or column was until then. Drag only once the handle is centred on its row or
  // column (a column partly scrolled out keeps its handle inside the visible box of the table).
  await waitFor(`the handle ${handle} is centred on its row or column`, () => withCurrentFrame(page, (frame) =>
    frame.locator(handle).first().evaluate((element) => {
      const row = element.getAttribute("data-okf-row");
      const column = element.getAttribute("data-okf-col");
      const table = element.ownerDocument.querySelector("#sphinx-myst-preview-content table");
      const own = element.getBoundingClientRect();
      if (row !== null) {
        const box = (table?.querySelectorAll("tr")[Number(row)])?.getBoundingClientRect();
        return box !== undefined && Math.abs((own.top + own.bottom) / 2 - (box.top + box.bottom) / 2) <= 2;
      }
      const cell = table?.querySelector("tr")?.children[Number(column)];
      const box = cell?.getBoundingClientRect();
      const shown = table?.getBoundingClientRect();
      if (box === undefined || shown === undefined) return false;
      const centre = Math.max(shown.left + 11, Math.min((box.left + box.right) / 2, shown.right - 11));
      return Math.abs((own.left + own.right) / 2 - centre) <= 2 && own.bottom <= box.top + 1;
    })));
  // The fractions of the target's box that land on its visible part.
  const point = await withCurrentFrame(page, (frame) => frame.locator(target).first().evaluate((element, wanted) => {
    const box = element.getBoundingClientRect();
    const shown = element.closest("table")?.getBoundingClientRect() ?? box;
    const left = Math.max(box.left, shown.left, 0) + 4;
    const right = Math.min(box.right, shown.right, element.ownerDocument.documentElement.clientWidth) - 4;
    const x = Math.max(left, Math.min(box.left + box.width * wanted.x, right));
    return { x: box.width > 0 ? (x - box.left) / box.width : wanted.x, y: wanted.y };
  }, at));
  const boxes = await withCurrentFrame(page, async (frame) => ({
    from: await frame.locator(handle).first().boundingBox(),
    to: await frame.locator(target).first().boundingBox(),
  }));
  assert.ok(boxes.from, `the handle ${handle} has a box`);
  assert.ok(boxes.to, `the drop target ${target} has a box`);
  const fromX = boxes.from.x + boxes.from.width / 2;
  const fromY = boxes.from.y + boxes.from.height / 2;
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(fromX + 4, fromY + 8, { steps: 3 });
  await page.mouse.move(boxes.to.x + boxes.to.width * point.x, boxes.to.y + boxes.to.height * point.y, { steps: 12 });
  await wait(150);
  await page.mouse.up();
}

const TABLE = "#sphinx-myst-preview-content table";
const ROW_HANDLE = (row: number): string => `.okf-table-row-handle[data-okf-row="${row}"]`;
const COLUMN_HANDLE = (column: number): string => `.okf-table-col-handle[data-okf-col="${column}"]`;

/** The first characters of each data row of the table in `source`, in order. */
function bodyRows(source: string, syntax: "pipe" | "list-table"): string[] {
  const rows = syntax === "pipe"
    ? source.split("\n").filter((line) => line.startsWith("|")).slice(2).map((line) => line.slice(2))
    : source.split("\n").filter((line) => line.startsWith("* - ")).map((line) => line.slice(4)).slice(1);
  return rows.map((row) => row.slice(0, 2));
}

async function activeHandle(page: Page, selector: string): Promise<boolean> {
  return withCurrentFrame(page, (frame) =>
    frame.locator(selector).evaluate((element) => element === element.ownerDocument.activeElement));
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-001
// @tests_req SwRS-MDOKFSTUDIO-TABLE-070
// @tests_req SwRS-MDOKFSTUDIO-TABLE-080
/** The pipe table becomes a list-table with every cell, stays in view, and comes back as a pipe table. */
async function scenarioConversionRoundTrip(page: Page): Promise<void> {
  await withTable(page, "tablemoves-convert", PIPE, async (document) => {
    await withCurrentFrame(page, (frame) => frame.locator("th").filter({ hasText: /^H2$/u }).click());
    await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
    await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-table-operation='Convert to list-table']").click());
    await waitFor("the table converted to a list-table in the buffer", () => bufferText(document).includes("```{list-table}"));
    await waitForRender(document);
    const text = bufferText(document);
    // Every cell survives, the header row included; the empty cell stays an empty item.
    for (const cell of ["H1", "H2", "H3", "a1", "a2", "a3", "b1", "b3", "c1", "c2", "c3"]) {
      assert.ok(text.includes(`- ${cell}\n`), `the cell ${cell} is in the list-table: ${JSON.stringify(text)}`);
    }
    assert.ok(text.includes(":header-rows: 1"), "the header row is declared");
    // The rendered table is still there, visible, with its header cells.
    const shown = await withCurrentFrame(page, async (frame) => ({
      tables: await frame.locator(TABLE).count(),
      visible: await frame.locator(TABLE).first().isVisible(),
      headers: await frame.locator(`${TABLE} th`).allTextContents(),
    }));
    assert.equal(shown.tables, 1);
    assert.ok(shown.visible, "the converted table is visible");
    assert.deepEqual(shown.headers.map((header) => header.trim()), ["H1", "H2", "H3"]);

    // A click on a cell of the plain list-table opens the cell editor, in view (it used to vanish).
    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^c2$/u }).click());
    await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
    const editor = await withCurrentFrame(page, async (frame) => ({
      box: await frame.locator("[data-sphinx-preview-table-cell-editor]").first().boundingBox(),
      text: await frame.locator("[data-sphinx-preview-table-cell-editor] textarea").inputValue(),
    }));
    assert.ok(editor.box && editor.box.height > 20 && editor.box.width > 100,
      `the cell editor of the list-table is in view: ${JSON.stringify(editor.box)}`);
    assert.equal(editor.text, "c2", "the cell editor holds the clicked cell");

    // Back to a pipe table from the cell editor's bar: the same pipe table.
    await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-table-operation='Convert to pipe table']").click());
    await expectBuffer(page, document, PIPE, "the pipe table back in the buffer");
    const back = await withCurrentFrame(page, (frame) => frame.locator(`${TABLE} th`).allTextContents());
    assert.deepEqual(back.map((header) => header.trim()), ["H1", "H2", "H3"]);
  });
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-001
/** A list-table the cell editor cannot model (an extra option) opens its whole directive as raw text, in view. */
async function scenarioRawListTable(page: Page): Promise<void> {
  const raw = LIST.replace(":header-rows: 1\n", ":header-rows: 1\n:class: wide\n");
  await withTable(page, "tablemoves-raw", raw, async () => {
    await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^c2$/u }).click());
    await waitForEditor(page, "[data-sphinx-preview-block-editor] textarea");
    const editor = await withCurrentFrame(page, async (frame) => ({
      box: await frame.locator("[data-sphinx-preview-block-editor]").first().boundingBox(),
      text: await frame.locator("[data-sphinx-preview-block-editor] textarea").inputValue(),
    }));
    assert.ok(editor.box && editor.box.height > 20 && editor.box.width > 100,
      `the raw editor of the list-table is in view: ${JSON.stringify(editor.box)}`);
    assert.ok(editor.text.includes("{list-table}") && editor.text.includes("H1"),
      "the raw editor holds the whole directive, header included");
  });
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
/** A body row moves by mouse and by key, with and without a cell editor open. */
async function scenarioRowMoves(page: Page, syntax: "pipe" | "list-table"): Promise<void> {
  await withTable(page, `tablemoves-rows-${syntax}`, syntax === "pipe" ? PIPE : LIST, async (document) => {
    const order = (): string => bodyRows(bufferText(document), syntax).join();
    // Mouse: the first body row dropped on the lower half of the last one.
    await dragTo(page, ROW_HANDLE(1), `${TABLE} tbody tr:last-child`, { x: 0.5, y: 0.8 });
    await waitFor("the first row moved to the end by the drag", () => order() === "b1,c1,a1");
    await waitForRender(document);
    // Key: the focused handle of the moved row, Alt+Up.
    await waitFor("the handle of the moved row has the focus", () => activeHandle(page, ROW_HANDLE(3)));
    await press(page, "Alt+ArrowUp");
    await waitFor("the row moved up by the key", () => order() === "b1,a1,c1");
    await waitForRender(document);
    if (syntax === "pipe") {
      // With a cell editor open on the table: the text typed in the cell moves with its row.
      await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^c2$/u }).click());
      await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
      await typeText(page, "X");
      await dragTo(page, ROW_HANDLE(1), `${TABLE} tbody tr:last-child`, { x: 0.9, y: 0.8 });
      try {
        await waitFor("the row moved while the cell editor was open", () =>
          order() === "a1,c1,b1" && bufferText(document).includes("| c2X |"));
      } catch (error) {
        const editor = await withCurrentFrame(page, async (frame) => ({
          editors: await frame.locator("[data-sphinx-preview-table-cell-editor]").count(),
          textarea: await frame.locator("[data-sphinx-preview-table-cell-editor] textarea").evaluateAll(
            (areas) => areas.map((area) => (area as HTMLTextAreaElement).value)),
          handles: await frame.locator(".okf-table-row-handle").evaluateAll((handles) =>
            handles.map((handle) => JSON.stringify(handle.getBoundingClientRect().toJSON()))),
          rows: await frame.locator(`${TABLE} tr`).evaluateAll((rows) =>
            rows.map((row) => JSON.stringify(row.getBoundingClientRect().toJSON()))),
        }));
        throw new Error(`${String(error)} The buffer holds ${JSON.stringify(bufferText(document))}; `
          + `the page holds ${JSON.stringify(editor)}.`, { cause: error });
      }
      await waitForRender(document);
      await waitFor("the cell editor closed with the saved move", async () =>
        await withCurrentFrame(page, (frame) => frame.locator("[data-sphinx-preview-table-cell-editor]").count()) === 0);
    }
    assert.ok(bufferText(document).startsWith("# Tables\n\n"), "the rest of the document is untouched");
  });
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
/** A column moves by mouse and by key, with and without a cell editor open. */
async function scenarioColumnMoves(page: Page, syntax: "pipe" | "list-table"): Promise<void> {
  await withTable(page, `tablemoves-columns-${syntax}`, syntax === "pipe" ? PIPE : LIST, async (document) => {
    // The handles are above the table, outside its cells, centred on their columns.
    const geometry = await withCurrentFrame(page, async (frame) => ({
      handles: await frame.locator(".okf-table-col-handle").evaluateAll((handles) =>
        handles.map((handle) => handle.getBoundingClientRect().toJSON() as { bottom: number; left: number; right: number })),
      headers: await frame.locator(`${TABLE} th`).evaluateAll((cells) =>
        cells.map((cell) => cell.getBoundingClientRect().toJSON() as { top: number; left: number; right: number })),
      inTable: await frame.locator(`${TABLE} .okf-table-col-handle`).count(),
    }));
    assert.equal(geometry.handles.length, 3, "one handle per column");
    assert.equal(geometry.inTable, 0, "no handle inside the table");
    geometry.handles.forEach((handle, index) => {
      const header = geometry.headers[index]!;
      assert.ok(handle.bottom <= header.top + 1, `handle ${index} is above the header: ${handle.bottom} vs ${header.top}`);
      assert.ok(Math.abs((handle.left + handle.right) / 2 - (header.left + header.right) / 2) <= 2,
        `handle ${index} is centred on its column`);
    });
    // Mouse: the first column dropped on the right half of the last header cell.
    await dragTo(page, COLUMN_HANDLE(0), `${TABLE} th:nth-child(3)`, { x: 0.8, y: 0.5 });
    await expectBuffer(page, document, COLUMN_TO_END[syntax], "the first column moved to the end by the drag");
    // Key: the focused handle of the moved column, Alt+Left.
    await waitFor("the handle of the moved column has the focus", () => activeHandle(page, COLUMN_HANDLE(2)));
    await press(page, "Alt+ArrowLeft");
    await expectBuffer(page, document, COLUMN_BACK_ONE[syntax], "the column moved left by the key");
    if (syntax === "pipe") {
      // With a cell editor open: the typed text moves with its column.
      await withCurrentFrame(page, (frame) => frame.locator("td").filter({ hasText: /^c1$/u }).click());
      await waitForEditor(page, "[data-sphinx-preview-table-cell-editor] textarea");
      await typeText(page, "X");
      await dragTo(page, COLUMN_HANDLE(0), `${TABLE} th:nth-child(3)`, { x: 0.8, y: 0.5 });
      await waitFor("the column moved while the cell editor was open", () => {
        const text = bufferText(document);
        return text.includes("| H1 | H3 | H2 |") && text.includes("| c1X | c3 | c2 |");
      });
    }
  });
}

/** Where the drop marker of the running drag shows: the column or row and the side of its gap. */
interface DropMarker { index: number; side: string }

/** The marker of the drag of `axis` on the page, or undefined when none shows. */
async function dropMarker(page: Page, axis: "row" | "column"): Promise<DropMarker | undefined> {
  const attribute = axis === "row" ? "data-okf-row-drop" : "data-okf-col-drop";
  return withCurrentFrame(page, (frame) => frame.locator(`${TABLE} [${attribute}], ${TABLE} tr[${attribute}]`).evaluateAll(
    (elements, name) => {
      const first = elements[0] as (HTMLTableCellElement | HTMLTableRowElement | undefined);
      if (first === undefined) return undefined;
      const index = first.tagName === "TR" ? (first as HTMLTableRowElement).rowIndex : (first as HTMLTableCellElement).cellIndex;
      return { index, side: first.getAttribute(name) ?? "" };
    }, attribute));
}

/** Presses the mouse on `handle` and starts the drag; the pointer stays down. */
async function startHandleDrag(page: Page, handle: string): Promise<void> {
  const box = await withCurrentFrame(page, (frame) => frame.locator(handle).first().boundingBox());
  assert.ok(box, `the handle ${handle} has a box`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 4, y + 8, { steps: 3 });
}

/**
 * Moves the held pointer to `point` and lets the page react. A drag reports its `dragover` a little
 * behind the pointer: a last small move makes the page see the point itself, not the way to it.
 */
async function holdAt(page: Page, point: { x: number; y: number }): Promise<void> {
  await page.mouse.move(point.x, point.y, { steps: 12 });
  await wait(100);
  await page.mouse.move(point.x + 1, point.y);
  await page.mouse.move(point.x, point.y);
  await wait(150);
}

/** The point at the given fractions of the box of `selector`. */
async function pointIn(page: Page, selector: string, at: { x: number; y: number }): Promise<{ x: number; y: number }> {
  const box = await withCurrentFrame(page, (frame) => frame.locator(selector).first().boundingBox());
  assert.ok(box, `${selector} has a box`);
  return { x: box.x + box.width * at.x, y: box.y + box.height * at.y };
}

/**
 * The geometry around `point` (workbench coordinates), for an assertion message: the preview frame,
 * the floating toolbar, the table, the column handles and the element under the point.
 */
async function dropGeometry(page: Page, point: { x: number; y: number }): Promise<string> {
  try {
    return await withCurrentFrame(page, async (frame) => {
      const frameBox = await (await frame.frameElement()).boundingBox();
      const local = { x: point.x - (frameBox?.x ?? 0), y: point.y - (frameBox?.y ?? 0) };
      const inside = await frame.locator("html").evaluate((root, at) => {
        const rect = (element: Element | null): string => {
          if (!element) return "none";
          const box = element.getBoundingClientRect();
          return `${Math.round(box.left)},${Math.round(box.top)} ${Math.round(box.width)}x${Math.round(box.height)}`;
        };
        const doc = root.ownerDocument;
        const hit = doc.elementFromPoint(at.x, at.y);
        const path: string[] = [];
        for (let element = hit; element && path.length < 4; element = element.parentElement) {
          const attributes = Array.from(element.attributes).map((attribute) => attribute.name)
            .filter((name) => name.startsWith("data-")).slice(0, 2).join(",");
          path.push(`${element.tagName.toLowerCase()}${element.className ? "." + String(element.className).split(" ").join(".") : ""}${attributes ? `[${attributes}]` : ""}`);
        }
        const handles = Array.from(doc.querySelectorAll(".okf-table-col-handle")).map(rect).join(" | ");
        return `viewport ${doc.documentElement.clientWidth}x${doc.documentElement.clientHeight}, scroll ${Math.round(window.scrollY)}; `
          + `toolbar ${rect(doc.querySelector("[data-sphinx-preview-toolbar]"))}; `
          + `table ${rect(doc.querySelector("#sphinx-myst-preview-content table"))}; column handles ${handles}; `
          + `under the pointer ${path.join(" < ") || "nothing"}`;
      }, local);
      return `pointer ${Math.round(local.x)},${Math.round(local.y)} in the frame at ${Math.round(frameBox?.x ?? 0)},${Math.round(frameBox?.y ?? 0)}; ${inside}`;
    });
  } catch (error) {
    return `geometry unavailable: ${String(error)}`;
  }
}

/** Whether the element the page finds at `point` (workbench coordinates) is in the floating toolbar. */
async function underToolbar(page: Page, point: { x: number; y: number }): Promise<boolean> {
  return withCurrentFrame(page, async (frame) => {
    const frameBox = await (await frame.frameElement()).boundingBox();
    assert.ok(frameBox, "the preview frame has a box");
    return frame.locator("html").evaluate((root, at) =>
      root.ownerDocument.elementFromPoint(at.x, at.y)?.closest("[data-sphinx-preview-toolbar]") != null,
    { x: point.x - frameBox.x, y: point.y - frameBox.y });
  });
}

/** Saves a screenshot of the drag for the PR when STUDIO_T128_SHOTS names a folder. */
async function dropShot(page: Page, name: string): Promise<void> {
  const folder = process.env.STUDIO_T128_SHOTS;
  if (folder === undefined || folder === "") return;
  fs.mkdirSync(folder, { recursive: true });
  const phase = process.env.STUDIO_T128_PHASE ?? "after";
  await page.screenshot({ path: path.join(folder, `${phase}-${name}.png`) });
}

/** Switches the preview theme (the toolbar toggle cycles host, dark, white, cream) to `mode`. */
async function setPreviewTheme(page: Page, mode: "dark" | "cream"): Promise<void> {
  await withCurrentFrame(page, async (frame) => {
    const toggle = frame.locator("[data-sphinx-preview-theme-toggle]");
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (await toggle.getAttribute("data-theme-mode") === mode) break;
      await toggle.click();
    }
  });
  await page.mouse.move(10, 10);
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-007
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-001
/**
 * CR 128: while a column handle is held, the strip of the handles above the table and every cell
 * of a column are a drop zone (the marker shows on the nearest gap and follows the pointer); a
 * release outside the table cancels, a release in the strip moves.
 */
async function scenarioColumnDropZone(page: Page, syntax: "pipe" | "list-table"): Promise<void> {
  const source = syntax === "pipe" ? PIPE : LIST;
  await withTable(page, `tablemoves-colzone-${syntax}`, source, async (document) => {
    const theme = process.env.STUDIO_T128_THEME === "dark" ? "dark" : "cream";
    if (process.env.STUDIO_T128_SHOTS !== undefined) await setPreviewTheme(page, theme);
    await startHandleDrag(page, COLUMN_HANDLE(0));
    // Over the handle strip above the third column, on its right half.
    const handleBox = await withCurrentFrame(page, (frame) => frame.locator(COLUMN_HANDLE(2)).first().boundingBox());
    const header = await pointIn(page, `${TABLE} th:nth-child(3)`, { x: 0.8, y: 0.5 });
    assert.ok(handleBox, "the handle of the third column has a box");
    const stripPoint = { x: header.x, y: handleBox.y + handleBox.height / 2 };
    await holdAt(page, stripPoint);
    await dropShot(page, `${syntax}-${theme}-column-strip`);
    // At the 1400x900 window the floating toolbar, three buttons wide (102 px), ends right of the strip point.
    const geometry = await dropGeometry(page, stripPoint);
    console.log(`table moves: ${syntax} column strip geometry: ${geometry}`);
    assert.equal(await underToolbar(page, stripPoint), false,
      `the floating toolbar does not cover the handle strip (${geometry})`);
    assert.deepEqual(await dropMarker(page, "column"), { index: 2, side: "after" },
      `the marker shows after the third column while the pointer is in the handle strip (${await dropGeometry(page, stripPoint)})`);
    // Over a body cell in the middle of the second column, on its right half.
    await holdAt(page, await pointIn(page, `${TABLE} tbody tr:nth-child(2) td:nth-child(2)`, { x: 0.75, y: 0.5 }));
    await dropShot(page, `${syntax}-${theme}-column-middle`);
    assert.deepEqual(await dropMarker(page, "column"), { index: 1, side: "after" },
      "the marker follows the pointer to the second column");
    // Moved far below the table and released: the drag is cancelled and no marker is left.
    const below = await withCurrentFrame(page, (frame) => frame.locator(TABLE).first().boundingBox());
    assert.ok(below, "the table has a box");
    await holdAt(page, { x: below.x + below.width / 2, y: Math.min(below.y + below.height + 120, 880) });
    assert.equal(await dropMarker(page, "column"), undefined, "no marker outside the table");
    await page.mouse.up();
    await wait(400);
    assert.equal(bufferText(document), source, "a release outside the table leaves the document as it was");
    assert.equal(await dropMarker(page, "column"), undefined, "no marker after the drag ended");
    // Released in the strip above the last column: the column moves there.
    await dragToPoint(page, COLUMN_HANDLE(0), async () => {
      const box = await withCurrentFrame(page, (frame) => frame.locator(COLUMN_HANDLE(2)).first().boundingBox());
      const cell = await pointIn(page, `${TABLE} th:nth-child(3)`, { x: 0.8, y: 0.5 });
      assert.ok(box, "the handle of the third column has a box");
      return { x: cell.x, y: box.y + box.height / 2 };
    });
    await expectBuffer(page, document, COLUMN_TO_END[syntax], "the column dropped in the handle strip moved to the end");
  });
}

/** A drag from `handle` to the point `where` returns, released there. */
async function dragToPoint(page: Page, handle: string, where: () => Promise<{ x: number; y: number }>): Promise<void> {
  await startHandleDrag(page, handle);
  await holdAt(page, await where());
  await page.mouse.up();
}

// @tests_req SwRS-MDOKFSTUDIO-TABLE-002
/**
 * CR 128: while a row handle is held, the strip of the handles left of the table and every cell
 * of a row are a drop zone (the marker shows on the nearest gap and follows the pointer); a
 * release outside the table cancels, a release in the strip moves.
 */
async function scenarioRowDropZone(page: Page, syntax: "pipe" | "list-table"): Promise<void> {
  const source = syntax === "pipe" ? PIPE : LIST;
  await withTable(page, `tablemoves-rowzone-${syntax}`, source, async (document) => {
    const theme = process.env.STUDIO_T128_THEME === "dark" ? "dark" : "cream";
    if (process.env.STUDIO_T128_SHOTS !== undefined) await setPreviewTheme(page, theme);
    const order = (): string => bodyRows(bufferText(document), syntax).join();
    const stripPoint = async (row: number, fraction: number): Promise<{ x: number; y: number }> => {
      const handle = await withCurrentFrame(page, (frame) => frame.locator(ROW_HANDLE(row)).first().boundingBox());
      const body = await pointIn(page, `${TABLE} tbody tr:nth-child(${row})`, { x: 0, y: fraction });
      assert.ok(handle, `the handle of row ${row} has a box`);
      return { x: handle.x + handle.width / 2, y: body.y };
    };
    await startHandleDrag(page, ROW_HANDLE(1));
    // Over the handle strip left of the last row, on its lower half.
    await holdAt(page, await stripPoint(3, 0.8));
    await dropShot(page, `${syntax}-${theme}-row-strip`);
    assert.deepEqual(await dropMarker(page, "row"), { index: 3, side: "after" },
      "the marker shows after the last row while the pointer is in the handle strip");
    // Over the middle of the second body row, on its lower half.
    await holdAt(page, await pointIn(page, `${TABLE} tbody tr:nth-child(2) td:nth-child(2)`, { x: 0.5, y: 0.8 }));
    await dropShot(page, `${syntax}-${theme}-row-middle`);
    assert.deepEqual(await dropMarker(page, "row"), { index: 2, side: "after" },
      "the marker follows the pointer to the second body row");
    // Released far to the right of the table: the drag is cancelled and no marker is left.
    const box = await withCurrentFrame(page, (frame) => frame.locator(TABLE).first().boundingBox());
    assert.ok(box, "the table has a box");
    await holdAt(page, { x: Math.min(box.x + box.width + 150, 1380), y: box.y + box.height + 120 });
    assert.equal(await dropMarker(page, "row"), undefined, "no marker outside the table");
    await page.mouse.up();
    await wait(400);
    assert.equal(bufferText(document), source, "a release outside the table leaves the document as it was");
    assert.equal(await dropMarker(page, "row"), undefined, "no marker after the drag ended");
    // Released in the strip left of the last row: the row moves there.
    await dragToPoint(page, ROW_HANDLE(1), () => stripPoint(3, 0.8));
    await waitFor("the first row moved to the end by a drop in the handle strip", () => order() === "b1,c1,a1");
  });
}

/** The table scenarios of CR 115, in one window. */
export async function scenarioTableMoves(page: Page): Promise<void> {
  // STUDIO_T128_ZONE=column|row runs only that drop zone scenario (for the screenshots of CR 128).
  const zone = process.env.STUDIO_T128_ZONE;
  if (zone === "column" || zone === "row") {
    for (const syntax of ["pipe", "list-table"] as const) {
      await (zone === "column" ? scenarioColumnDropZone : scenarioRowDropZone)(page, syntax);
    }
    return;
  }
  await scenarioConversionRoundTrip(page);
  console.log("PASS table moves: conversion round trip and the click on a list-table cell");
  await scenarioRawListTable(page);
  console.log("PASS table moves: a list-table the cell editor cannot model opens as raw text");
  for (const syntax of ["pipe", "list-table"] as const) {
    await scenarioRowMoves(page, syntax);
    console.log(`PASS table moves: rows of a ${syntax} (mouse, key, cell editor open)`);
    await scenarioColumnMoves(page, syntax);
    console.log(`PASS table moves: columns of a ${syntax} (mouse, key, cell editor open)`);
    await scenarioColumnDropZone(page, syntax);
    console.log(`PASS table moves: column drop zone of a ${syntax} (handle strip, mid-column, outside)`);
    await scenarioRowDropZone(page, syntax);
    console.log(`PASS table moves: row drop zone of a ${syntax} (handle strip, mid-row, outside)`);
  }
}
