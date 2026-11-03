import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

import { PALETTE_MODES } from "../../../src/core/configuration/settingsRegistry";
import { createEditActions } from "../../../src/page/modules/editActions";
import type { EditActionMode } from "../../../src/page/modules/editActions";
import { createEditPalette } from "../../../src/page/modules/editPalette";
import { createMarkdownTableTools } from "../../../src/page/modules/markdownTable";
import { FakeDocument } from "./fakeDom";

/**
 * Syntax coverage of the `/` menu: every syntax the extension renders (the writing skill's "What
 * renders" table, which a test renders in full) has a slash entry in the palette mode that offers
 * it, or a documented exception. The slash menu and the palette are built from one registry, so
 * the entry also stands for the toolbar button, except the two list entries that are menu-only.
 */

/** The text box the palette acts on: only its selection matters to build the menu. */
class Box {
  public selectionStart = 0;
  public selectionEnd = 0;
  public readonly value = "";
  public focus(): void {}
  public setAttribute(): void {}
  public removeAttribute(): void {}
  public getBoundingClientRect() { return { left: 0, top: 0, bottom: 0 }; }
}

function slashKeys(mode: EditActionMode): Set<string> {
  const palette = createEditPalette(new FakeDocument() as unknown as Document, {
    actions: createEditActions(["python"], createMarkdownTableTools()),
    getControl: () => new Box(),
    applyTextEdit: () => undefined,
    openPanel: () => undefined,
    pickHost: () => undefined,
    mode,
    scope: "block",
  });
  return new Set(palette.menuEntries().map((entry) => entry.key));
}

const keysByMode = Object.fromEntries(PALETTE_MODES.map((mode) => [mode, slashKeys(mode)])) as Record<EditActionMode, Set<string>>;

interface Covered {
  /** The syntax, as the skill or the renderer names it. */
  syntax: string;
  /** The `/` menu entry key (`action` or `action:argument`) and the first palette mode listing it. */
  slash: string;
  mode: EditActionMode;
}

interface Exempt {
  syntax: string;
  /** Why the syntax has no slash entry of its own. */
  exception: string;
}

type Row = Covered | Exempt;

/** Every rendered syntax and its way in. Add the syntax here when the renderer or the skill gains one. */
const SYNTAXES: Row[] = [
  // GFM
  { syntax: "headings", slash: "heading:2", mode: "strict" },
  { syntax: "tables", slash: "table", mode: "strict" },
  { syntax: "column alignment :-- --:", slash: "columnAlign", mode: "gfm" },
  { syntax: "task lists - [ ]", slash: "checkbox", mode: "gfm" },
  { syntax: "footnotes [^1]", slash: "footnote", mode: "gfm" },
  { syntax: "alerts > [!NOTE]", slash: "alert:NOTE", mode: "gfm" },
  { syntax: "~~strike~~", slash: "strikethrough", mode: "strict" },
  { syntax: "bold, italic, links, images, quotes, rules, lists", slash: "bold", mode: "strict" },
  { syntax: "autolinks", exception: "A bare URL becomes a link by itself when typed; the Link action covers an explicit one." },
  // Code
  { syntax: "fenced code with a language", slash: "codeFence", mode: "strict" },
  { syntax: "{code-block}", slash: "codeBlock", mode: "myst" },
  // Math
  { syntax: "$x$, $$ $$, {math}", slash: "math", mode: "myst" },
  // Admonitions
  { syntax: ":::{note}", slash: "admonition:note", mode: "myst" },
  { syntax: ":::{tip}", slash: "admonition:tip", mode: "myst" },
  { syntax: ":::{warning}", slash: "admonition:warning", mode: "myst" },
  { syntax: ":::{important}", slash: "admonition:important", mode: "myst" },
  { syntax: ":::{danger}", slash: "admonition:danger", mode: "myst" },
  { syntax: ":::{versionadded}", slash: "admonition:versionadded", mode: "myst" },
  { syntax: ":::{versionchanged}", slash: "admonition:versionchanged", mode: "myst" },
  { syntax: ":::{deprecated}", slash: "admonition:deprecated", mode: "myst" },
  { syntax: ":class: dropdown", slash: "dropdown", mode: "myst" },
  // Layout
  { syntax: "{card}", slash: "card", mode: "myst" },
  { syntax: "{grid} and {grid-item-card}", slash: "grid", mode: "myst" },
  { syntax: "{tab-set} and {tab-item}", slash: "tabs", mode: "myst" },
  { syntax: "{figure}", slash: "figure", mode: "myst" },
  { syntax: "{list-table}", exception: "Made from a pipe or HTML table with the List table action, which the slash menu lists only with the caret in a table." },
  { syntax: "{toctree}", exception: "Project navigation written by hand; not in the writing skill (it needs the project's document names)." },
  // Inline
  { syntax: "{kbd}", slash: "roleKbd", mode: "myst" },
  { syntax: "{ref} and (name)= labels", slash: "ref", mode: "myst" },
  { syntax: "definition lists", slash: "deflist", mode: "myst" },
  // Diagrams
  { syntax: "mermaid fence", slash: "mermaid", mode: "gfm" },
  { syntax: "plantuml fence", slash: "plantuml", mode: "full" },
  { syntax: "{uml} file.puml", exception: "Includes a .puml file the writer names; the image picker lists images only, so a file entry needs its own picker." },
  // Charts
  { syntax: "vega-lite fence", slash: "vegaLite", mode: "full" },
  { syntax: "vega fence", slash: "vega", mode: "full" },
  // Images, navigation, HTML, choices, metadata, review
  { syntax: "![alt](path)", slash: "image", mode: "strict" },
  { syntax: "[TOC]", slash: "toc", mode: "strict" },
  { syntax: "{contents}", exception: "Same table of contents as [TOC], which the Table of contents action writes; a second form is not worth an entry." },
  { syntax: "<details>", slash: "details", mode: "gfm" },
  { syntax: "<kbd>", slash: "kbd", mode: "gfm" },
  { syntax: "<sub> and <sup>", slash: "sub", mode: "myst" },
  { syntax: "<div align>, <p align>, <img width>, <picture>", exception: "Presentation HTML for README files, written by hand; no insert form is defined for it." },
  { syntax: "radio group ( ) (x)", slash: "option", mode: "gfm" },
  { syntax: "YAML front matter", exception: "Edited in the properties table (schema aware), not inserted from the text box." },
  { syntax: "<!-- TODO: text -->", slash: "todo", mode: "strict" },
  { syntax: "<!-- THREAD ... -->", slash: "thread", mode: "strict" },
];

const isCovered = (row: Row): row is Covered => "slash" in row;

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-275
test("CR 248: every covered syntax has a slash entry in its mode and in the modes above, not below", () => {
  for (const row of SYNTAXES.filter(isCovered)) {
    const rank = PALETTE_MODES.indexOf(row.mode);
    assert.ok(rank >= 0, row.syntax);
    PALETTE_MODES.forEach((mode, at) => {
      assert.equal(keysByMode[mode].has(row.slash), at >= rank, row.syntax + ": " + row.slash + " in " + mode);
    });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-275
test("CR 248: every exception is justified and each syntax is listed once", () => {
  const exempt = SYNTAXES.filter((row): row is Exempt => !isCovered(row));
  assert.ok(exempt.length > 0);
  for (const row of exempt) {
    assert.ok(row.exception.length >= 40, row.syntax + ": a reason, not a word");
  }
  assert.equal(new Set(SYNTAXES.map((row) => row.syntax)).size, SYNTAXES.length, "each syntax once");
});

const skill = fs.readFileSync(
  path.resolve(__dirname, "../../../../skills/writing-for-markdown-okf-schema-studio/SKILL.md"), "utf8");

/** The directives and fence languages the skill's "What renders" table names. */
function skillSyntaxes(): { directives: string[]; fences: string[] } {
  const table = skill.slice(skill.indexOf("## What renders"), skill.indexOf("## Taste"));
  return {
    directives: [...new Set([...table.matchAll(/`:{0,4}\{([a-z-]+)\}/gu)].map((match) => match[1]!))],
    fences: [...new Set([...table.matchAll(/`([a-z-]+)` (?:and `([a-z-]+)` )?fences?/gu)].flatMap((match) => [match[1]!, match[2]].filter((name): name is string => name !== undefined)))],
  };
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-275
test("CR 248: every directive and fence language of the writing skill is in the syntax list", () => {
  const named = SYNTAXES.map((row) => row.syntax).join("\n");
  const { directives, fences } = skillSyntaxes();
  // The table must still name the families this audit is built on.
  for (const expected of ["card", "grid", "tab-set", "figure", "list-table", "uml", "contents", "versionadded"]) {
    assert.ok(directives.includes(expected), "the skill table names {" + expected + "}");
  }
  assert.deepEqual(fences.sort(), ["mermaid", "plantuml", "vega", "vega-lite"]);
  for (const name of directives) {
    assert.ok(named.includes("{" + name + "}"), "{" + name + "} has a row");
  }
  for (const name of fences) assert.ok(named.includes(name + " fence"), name + " fence has a row");
});

function insertion(id: string, value: string, at: number): { value: string; selected: string } {
  const edit = createEditActions(["python"], createMarkdownTableTools()).byId.get(id)!.apply({
    value, selectionStart: at, selectionEnd: at, scope: "block",
  })!;
  return {
    value: value.slice(0, edit.start) + edit.text + value.slice(edit.end),
    selected: edit.text.slice(edit.selectionStart - edit.start, edit.selectionEnd - edit.start),
  };
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-273
test("CR 248: tabs inserts a tab set of two tabs set apart, first title selected, in MyST and Full", () => {
  const out = insertion("tabs", "Intro\n\nOutro", 5);
  assert.equal(out.value,
    "Intro\n\n::::{tab-set}\n:::{tab-item} Tab 1\nContent\n:::\n:::{tab-item} Tab 2\nContent\n:::\n::::\n\nOutro");
  assert.equal(out.selected, "Tab 1");
  for (const mode of ["strict", "gfm"] as const) assert.equal(keysByMode[mode].has("tabs"), false, mode);
  for (const mode of ["myst", "full"] as const) assert.equal(keysByMode[mode].has("tabs"), true, mode);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-274
test("CR 248: plantuml inserts a sequence diagram fence set apart, first message selected, in Full only", () => {
  const out = insertion("plantuml", "Intro\n\nOutro", 5);
  assert.equal(out.value, "Intro\n\n```plantuml\n@startuml\nAlice -> Bob: Hello\n@enduml\n```\n\nOutro");
  assert.equal(out.selected, "Hello");
  for (const mode of ["strict", "gfm", "myst"] as const) assert.equal(keysByMode[mode].has("plantuml"), false, mode);
  assert.equal(keysByMode.full.has("plantuml"), true);
});
