import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createEditActions } from "../../src/webview/editActions";

const registry = createEditActions();

/**
 * `[` and `]` mark a selection, `|` a caret; the result is shown in the same notation, or
 * `undefined` when the action returns no edit.
 */
function run(id: string, input: string, arg?: string): string | undefined {
  const caret = input.indexOf("|");
  let start: number;
  let end: number;
  let value: string;
  if (caret !== -1) {
    value = input.replace("|", "");
    start = caret;
    end = caret;
  } else {
    start = input.indexOf("[");
    end = input.indexOf("]") - 1;
    value = input.replace("[", "").replace("]", "");
  }
  const action = registry.byId.get(id);
  assert.ok(action, "action " + id);
  const edit = action.apply({
    value,
    selectionStart: start,
    selectionEnd: end,
    scope: "block",
    ...(arg === undefined ? {} : { arg }),
  });
  if (!edit) return undefined;
  const result = value.slice(0, edit.start) + edit.text + value.slice(edit.end);
  const a = edit.selectionStart;
  const b = edit.selectionEnd;
  return a === b
    ? result.slice(0, a) + "|" + result.slice(a)
    : result.slice(0, a) + "[" + result.slice(a, b) + "]" + result.slice(b);
}

const cases: [string, string, string][] = [
  // Wrap a selection and select the inner text.
  ["bold", "say [foo] now", "say **[foo]** now"],
  ["italic", "say [foo] now", "say *[foo]* now"],
  // Empty selection: no word wrapped yet inserts the pair with the caret inside.
  ["bold", "say | now", "say **|** now"],
  ["italic", "say foo| now", "say foo*|* now"],
  ["bold", "|", "**|**"],
  // Selection edges ignore surrounding whitespace.
  ["bold", "a[ foo ]b", "a **[foo]** b"],
  // Unwrap: markers outside the selection.
  ["bold", "say **[foo]** now", "say [foo] now"],
  ["italic", "say *[foo]* now", "say [foo] now"],
  // Unwrap: markers inside the selection.
  ["bold", "say [**foo**] now", "say [foo] now"],
  ["italic", "say [*foo*] now", "say [foo] now"],
  // Unwrap from the word at the caret.
  ["bold", "say **fo|o** now", "say fo|o now"],
  ["italic", "say *fo|o* now", "say fo|o now"],
  ["bold", "**foo|**", "foo|"],
  // Empty pair toggles off.
  ["bold", "x **|** y", "x | y"],
  ["italic", "x *|* y", "x | y"],
  // `*` versus `**` disambiguation.
  ["bold", "*[foo]*", "***[foo]***"],
  ["italic", "**[foo]**", "***[foo]***"],
  ["italic", "***[foo]***", "**[foo]**"],
  ["bold", "***[foo]***", "*[foo]*"],
  ["bold", "***fo|o***", "*fo|o*"],
  ["italic", "***fo|o***", "**fo|o**"],
  // Whitespace between two spans is not a wrapped selection.
  ["bold", "**a**[ b ]**c**", "**a** **[b]** **c**"],
  // Multi-line selection wraps as one span.
  ["bold", "[a\nb]", "**[a\nb]**"],
  // Underscores are not recognised as markers and stay in place.
  ["bold", "[_foo_]", "**[_foo_]**"],
];

for (const [id, input, expected] of cases) {
  test("editActions " + id + " " + JSON.stringify(input), () => {
    assert.equal(run(id, input), expected);
  });
}

test("bold then italic then unwrapping both restores the text", () => {
  const value = "x foo y";
  const apply = (id: string, text: string, a: number, b: number) => {
    const edit = registry.byId.get(id)!.apply({
      value: text,
      selectionStart: a,
      selectionEnd: b,
      scope: "block",
    })!;
    return {
      text: text.slice(0, edit.start) + edit.text + text.slice(edit.end),
      a: edit.selectionStart,
      b: edit.selectionEnd,
    };
  };
  let state = { text: value, a: 2, b: 5 };
  state = apply("bold", state.text, state.a, state.b);
  state = apply("italic", state.text, state.a, state.b);
  assert.equal(state.text, "x ***foo*** y");
  state = apply("italic", state.text, state.a, state.b);
  state = apply("bold", state.text, state.a, state.b);
  assert.equal(state.text, value);
  assert.deepEqual([state.a, state.b], [2, 5]);
});

const todoCases: [string, string][] = [
  ["a|bc", "<!-- TODO: a|bc -->"],
  ["[abc]", "[<!-- TODO: abc -->]"],
  ["<!-- TODO: a|bc -->", "a|bc"],
  ["[<!-- TODO: abc -->]", "[abc]"],
  ["|", "<!-- TODO: | -->"],
  ["  |", "  <!-- TODO: | -->"],
  ["<!-- TODO: | -->", "|"],
  ["  [item]", "[  <!-- TODO: item -->]"],
  ["x\n[a\nb]\ny", "x\n[<!-- TODO: a -->\n<!-- TODO: b -->]\ny"],
  ["x\n[<!-- TODO: a -->\n<!-- TODO: b -->]\ny", "x\n[a\nb]\ny"],
  // Blank lines inside the selection stay blank.
  ["[a\n\nb]", "[<!-- TODO: a -->\n\n<!-- TODO: b -->]"],
  // A mix wraps the lines that are not wrapped yet.
  ["[a\n<!-- TODO: b -->]", "[<!-- TODO: a -->\n<!-- TODO: b -->]"],
  // A selection ending at a line start leaves that line alone.
  ["[a\n]b", "[<!-- TODO: a -->]\nb"],
  // A partially selected line toggles the whole line.
  ["ab[c\nd]ef", "[<!-- TODO: abc -->\n<!-- TODO: def -->]"],
];

for (const [input, expected] of todoCases) {
  test("editActions todo " + JSON.stringify(input), () => {
    assert.equal(run("todo", input), expected);
  });
}

test("the todo toggle is its own inverse", () => {
  const original = "- one\n- two";
  const wrapped = run("todo", "[" + original + "]")!;
  assert.equal(wrapped, "[<!-- TODO: - one -->\n<!-- TODO: - two -->]");
  assert.equal(run("todo", wrapped), "[" + original + "]");
});

test("the registry lists the actions with metadata and indexes them by id", () => {
  assert.deepEqual(
    registry.actions.map((action) => action.id),
    ["heading", "bold", "italic", "strikethrough", "link", "codeFence", "quote", "rule", "table", "emoji", "todo"],
  );
  for (const action of registry.actions) {
    assert.equal(registry.byId.get(action.id), action);
    assert.ok(action.label.length > 0 && action.icon.length > 0 && action.group.length > 0);
    assert.ok(action.modes.includes("strict"), "available in every mode");
    assert.ok(action.scopes.includes("block"));
  }
  assert.equal(registry.byId.get("todo")!.scopes.includes("cell"), false);
});

type KeyInit = Record<string, unknown>;
const key = (init: KeyInit, mac = false) => registry.shortcutFor({ key: "", code: "", ...init }, mac);

test("shortcutFor uses Cmd on macOS and Ctrl elsewhere for B and I", () => {
  assert.equal(key({ metaKey: true, code: "KeyB", key: "b" }, true)?.id, "bold");
  assert.equal(key({ metaKey: true, code: "KeyI", key: "i" }, true)?.id, "italic");
  assert.equal(key({ ctrlKey: true, code: "KeyB", key: "b" }, false)?.id, "bold");
  assert.equal(key({ ctrlKey: true, code: "KeyI", key: "I" }, false)?.id, "italic");
  // Ctrl+B is a text-navigation key on macOS; the Windows key is never a shortcut elsewhere.
  assert.equal(key({ ctrlKey: true, code: "KeyB", key: "b" }, true), undefined);
  assert.equal(key({ ctrlKey: true, code: "KeyI", key: "i" }, true), undefined);
  assert.equal(key({ metaKey: true, code: "KeyB", key: "b" }, false), undefined);
  assert.equal(key({ metaKey: true, ctrlKey: true, code: "KeyB", key: "b" }, false), undefined);
});

test("shortcutFor reads the typed key first and the physical code only for non-Latin keys", () => {
  // Dvorak: the physical B key types "x", so Cmd+X must stay cut.
  assert.equal(key({ metaKey: true, code: "KeyB", key: "x" }, true), undefined);
  // Dvorak: Cmd+B is typed on the physical N key.
  assert.equal(key({ metaKey: true, code: "KeyN", key: "b" }, true)?.id, "bold");
  // Cyrillic layout: the key is not a Latin letter, so the physical code decides.
  assert.equal(key({ ctrlKey: true, code: "KeyB", key: "и" })?.id, "bold");
  assert.equal(key({ ctrlKey: true, code: "KeyI", key: "ш" })?.id, "italic");
}
);

test("shortcutFor accepts Ctrl+/ and Cmd+/ on every platform", () => {
  for (const mac of [true, false]) {
    for (const mod of ["metaKey", "ctrlKey"]) {
      assert.equal(key({ [mod]: true, code: "Slash", key: "/" }, mac)?.id, "todo");
      assert.equal(key({ [mod]: true, code: "Digit3", key: "/", shiftKey: true }, mac)?.id, "todo");
    }
  }
});

test("shortcutFor ignores plain keys, other modifiers, composition and AltGr", () => {
  assert.equal(key({ code: "KeyB", key: "b" }), undefined);
  assert.equal(key({ ctrlKey: true, code: "KeyB", key: "b", shiftKey: true }), undefined);
  assert.equal(key({ ctrlKey: true, code: "KeyB", key: "b", altKey: true }), undefined);
  assert.equal(key({ ctrlKey: true, code: "KeyB", key: "b", isComposing: true }), undefined);
  assert.equal(key({ ctrlKey: true, altKey: true, code: "Slash", key: "/" }), undefined);
  assert.equal(key({ ctrlKey: true, code: "KeyJ", key: "j" }), undefined);
});

test("a selection cutting into a marker run on one side produces no edit", () => {
  assert.equal(run("bold", "**f[oo]**"), undefined);
  assert.equal(run("italic", "*[fo]o*"), undefined);
});

test("a line containing --> is never wrapped in a TODO comment", () => {
  assert.equal(run("todo", "a |--> b"), undefined);
  assert.equal(
    run("todo", "[a\nb --> c]"),
    "[<!-- TODO: a -->\nb --> c]",
  );
});

const headingCases: [string, string, string | undefined][] = [
  ["2", "a|bc", "## a|bc"],
  ["1", "## a|bc", "# a|bc"],
  ["0", "### a|bc", "a|bc"],
  ["0", "plain|", undefined],
  ["3", "#nospace|", "### #nospace|"],
  ["5", "####### seven|", "##### ####### seven|"],
  ["1", "|", "# |"],
  ["0", "# |", "|"],
  ["2", "x\n# a|bc\ny", "x\n## a|bc\ny"],
  ["2", "[a\nb]", "[## a\n## b]"],
  ["0", "[# a\n## b]", "[a\nb]"],
  ["2", "[a\n\nb]", "[## a\n\n## b]"],
];

for (const [arg, input, expected] of headingCases) {
  test("editActions heading " + arg + " " + JSON.stringify(input), () => {
    assert.equal(run("heading", input, arg), expected);
  });
}

test("heading without a change or with an unknown level returns no edit", () => {
  assert.equal(run("heading", "## a|bc", "2"), undefined);
  assert.equal(run("heading", "a|bc", "9"), undefined);
  assert.equal(run("heading", "a|bc", "x"), undefined);
  assert.equal(run("heading", "a|bc"), undefined);
});

const strikeCases: [string, string][] = [
  ["say [foo] now", "say ~~[foo]~~ now"],
  ["say ~~[foo]~~ now", "say [foo] now"],
  ["say [~~foo~~] now", "say [foo] now"],
  ["say ~~fo|o~~ now", "say fo|o now"],
  ["say | now", "say ~~|~~ now"],
  ["x ~~|~~ y", "x | y"],
  ["a[ foo ]b", "a ~~[foo]~~ b"],
  ["[a\nb]", "~~[a\nb]~~"],
];

for (const [input, expected] of strikeCases) {
  test("editActions strikethrough " + JSON.stringify(input), () => {
    assert.equal(run("strikethrough", input), expected);
  });
}

const quoteCases: [string, string][] = [
  ["a|bc", "> a|bc"],
  ["> a|bc", "a|bc"],
  ["[- a\n- b]", "[> - a\n> - b]"],
  ["[> - a\n> - b]", "[- a\n- b]"],
  ["[1. a\n   2. b]", "[> 1. a\n>    2. b]"],
  ["x\n[a\nb]\ny", "x\n[> a\n> b]\ny"],
  ["[a\n\nb]", "[> a\n>\n> b]"],
  ["[a\n> b]", "[> a\n> > b]"],
  ["|", "> |"],
  ["> |", "|"],
  [">> a|", "> a|"],
  ["[a\n]b", "[> a\n]b"],
];

for (const [input, expected] of quoteCases) {
  test("editActions quote " + JSON.stringify(input), () => {
    assert.equal(run("quote", input), expected);
  });
}

const fenceCases: [string, string, string][] = [
  ["python", "[x = 1]", "```python\n[x = 1]\n```"],
  ["text", "[a\nb]", "```text\n[a\nb]\n```"],
  ["python", "ab[c\nd]ef", "```python\n[abc\ndef]\n```"],
  ["json", "|", "```json\n|\n```"],
  ["json", "para|", "para\n\n```json\n|\n```"],
  ["json", "  |", "```json\n|\n```"],
  ["bash", "[echo ```x```]", "````bash\n[echo ```x```]\n````"],
  ["text", "x\n[a]\ny", "x\n```text\n[a]\n```\ny"],
];

for (const [arg, input, expected] of fenceCases) {
  test("editActions codeFence " + arg + " " + JSON.stringify(input), () => {
    assert.equal(run("codeFence", input, arg), expected);
  });
}

test("codeFence without a language writes a bare fence", () => {
  assert.equal(run("codeFence", "[x]"), "```\n[x]\n```");
});

const ruleCases: [string, string][] = [
  ["para|", "para\n\n---\n\n|"],
  ["pa|ra", "para\n\n---\n\n|"],
  ["a|\nb", "a\n\n---\n\n|b"],
  ["|", "---\n\n|"],
  ["a\n|", "a\n\n---\n\n|"],
  ["a\n\n|", "a\n\n---\n\n|"],
  ["[a\nb]", "a\nb\n\n---\n\n|"],
];

for (const [input, expected] of ruleCases) {
  test("editActions rule " + JSON.stringify(input), () => {
    assert.equal(run("rule", input), expected);
  });
}

test("the palette actions declare their popovers, options and tooltips", () => {
  const heading = registry.byId.get("heading")!;
  assert.equal(heading.popover, "heading");
  assert.deepEqual(
    heading.options?.map((option) => [option.value, option.label]),
    [
      ["0", "Paragraph"],
      ["1", "Heading 1"],
      ["2", "Heading 2"],
      ["3", "Heading 3"],
      ["4", "Heading 4"],
      ["5", "Heading 5"],
    ],
  );
  const code = registry.byId.get("codeFence")!;
  assert.equal(code.popover, "language");
  assert.equal(code.options?.[0].value, "text");
  assert.equal(registry.byId.get("todo")!.title, "Toggle TODO comment");
});

test("the code languages are the highlighter's registrations and aliases, plus text", () => {
  const withLanguages = createEditActions(["zeta", "alpha", "text", "beta"]);
  const values = withLanguages.byId.get("codeFence")!.options!.map((option) => option.value);
  assert.deepEqual(values, ["text", "alpha", "beta", "zeta"]);
});

test("shortcutLabel shows Cmd on macOS and Ctrl elsewhere", () => {
  assert.equal(registry.shortcutLabel(registry.byId.get("bold")!, true), "Cmd+B");
  assert.equal(registry.shortcutLabel(registry.byId.get("bold")!, false), "Ctrl+B");
  assert.equal(registry.shortcutLabel(registry.byId.get("italic")!, false), "Ctrl+I");
  assert.equal(registry.shortcutLabel(registry.byId.get("todo")!, false), "Ctrl+/");
  assert.equal(registry.shortcutLabel(registry.byId.get("todo")!, true), "Cmd+/");
  assert.equal(registry.shortcutLabel(registry.byId.get("rule")!, false), "");
});

// T22: the link action and the helpers behind the link panel.
function ctxOf(input: string): { value: string; selectionStart: number; selectionEnd: number; scope: "block" } {
  const caret = input.indexOf("|");
  if (caret !== -1) {
    return { value: input.replace("|", ""), selectionStart: caret, selectionEnd: caret, scope: "block" };
  }
  return {
    value: input.replace("[", "").replace("]", ""),
    selectionStart: input.indexOf("["),
    selectionEnd: input.indexOf("]") - 1,
    scope: "block",
  };
}

function link(input: string, text: string, url: string): string {
  const ctx = ctxOf(input);
  const edit = registry.linkEdit(ctx, text, url);
  const result = ctx.value.slice(0, edit.start) + edit.text + ctx.value.slice(edit.end);
  assert.equal(edit.selectionStart, edit.selectionEnd);
  return result.slice(0, edit.selectionStart) + "|" + result.slice(edit.selectionStart);
}

test("link is a strict action for blocks and cells that opens the link panel", () => {
  const action = registry.byId.get("link");
  assert.ok(action);
  assert.deepEqual(action.modes, ["strict"]);
  assert.deepEqual(action.scopes, ["block", "cell"]);
  assert.equal(action.panel, "link");
  assert.equal(registry.shortcutLabel(action, false), "Ctrl+K");
  assert.equal(registry.shortcutLabel(action, true), "Cmd+K");
});

test("Cmd+K on macOS and Ctrl+K elsewhere find the link action, matched on key before code", () => {
  assert.equal(registry.shortcutFor({ key: "k", code: "KeyK", metaKey: true }, true)?.id, "link");
  assert.equal(registry.shortcutFor({ key: "k", code: "KeyK", ctrlKey: true }, false)?.id, "link");
  assert.equal(registry.shortcutFor({ key: "k", code: "KeyK", ctrlKey: true }, true), undefined);
  assert.equal(registry.shortcutFor({ key: "k", code: "KeyK", metaKey: true }, false), undefined);
  // Dvorak: the physical K key types "t", which is not a link shortcut.
  assert.equal(registry.shortcutFor({ key: "t", code: "KeyK", ctrlKey: true }, false), undefined);
  // Cyrillic layout: the Latin code is the fallback.
  assert.equal(registry.shortcutFor({ key: "л", code: "KeyK", ctrlKey: true }, false)?.id, "link");
  assert.equal(registry.shortcutFor({ key: "k", code: "KeyK", ctrlKey: true, shiftKey: true }, false), undefined);
  assert.equal(registry.shortcutFor({ key: "k", code: "KeyK", ctrlKey: true, isComposing: true }, false), undefined);
});

test("linkDraft prefills the text from the selection and the URL when the selection is one", () => {
  assert.deepEqual(registry.linkDraft(ctxOf("say [foo] now")), { text: "foo", url: "", start: 4, end: 7 });
  assert.deepEqual(registry.linkDraft(ctxOf("see |here")), { text: "", url: "", start: 4, end: 4 });
  const url = registry.linkDraft(ctxOf("see [https://example.com/a?b=1] now"));
  assert.equal(url.text, "");
  assert.equal(url.url, "https://example.com/a?b=1");
  assert.equal(registry.linkDraft(ctxOf("[mailto:me@example.com]")).url, "mailto:me@example.com");
  assert.equal(registry.linkDraft(ctxOf("[www.example.com]")).url, "www.example.com");
  // A phrase that merely contains a URL is text.
  assert.equal(registry.linkDraft(ctxOf("[go to https://example.com]")).text, "go to https://example.com");
});

test("linkDraft takes the existing link around the selection or the caret", () => {
  const draft = registry.linkDraft(ctxOf("a [lab|el](https://x.org) b"));
  assert.deepEqual(draft, { text: "label", url: "https://x.org", start: 2, end: 24 });
  const selected = registry.linkDraft({
    value: "a [label](https://x.org) b",
    selectionStart: 3,
    selectionEnd: 8,
    scope: "block",
  });
  assert.equal(selected.text, "label");
  assert.equal(selected.url, "https://x.org");
  const withTitle = registry.linkDraft(ctxOf('a [l|](u "t") b'));
  assert.equal(withTitle.url, "u");
  // An image is not a link to rewrite.
  assert.equal(registry.linkDraft(ctxOf("![al|t](p.png)")).url, "");
  // A caret after the link is outside it.
  assert.equal(registry.linkDraft(ctxOf("[a](b)|")).text, "");
});

const linkCases: [string, string, string, string][] = [
  ["say [foo] now", "foo", "https://x.org", "say [foo](https://x.org)| now"],
  ["say [foo] now", "bar", "u", "say [bar](u)| now"],
  ["see |here", "docs", "https://x.org", "see [docs](https://x.org)|here"],
  // A URL selection becomes the link target.
  ["go [https://x.org] now", "site", "https://x.org", "go [site](https://x.org)| now"],
  // Replaces an existing link as a whole.
  ["a [lab|el](old) b", "new", "https://n.org", "a [new](https://n.org)| b"],
  // O13: an empty URL keeps `[text]()` with the caret inside the parentheses.
  ["say [foo] now", "foo", "", "say [foo](|) now"],
  // Empty text falls back to the URL; both empty leaves an empty link.
  ["x |y", "", "https://x.org", "x [https://x.org](https://x.org)|y"],
  ["x |y", "", "", "x [](|)y"],
  // A target with spaces needs angle brackets.
  ["[a]", "a", "my file.md", "[a](<my file.md>)|"],
  // Whitespace around the typed values is dropped.
  ["[a]", " a ", " u ", "[a](u)|"],
];
for (const [input, text, url, expected] of linkCases) {
  test("linkEdit " + JSON.stringify([input, text, url]), () => {
    assert.equal(link(input, text, url), expected);
  });
}

test("the link action applies the argument as the target of the selected text", () => {
  assert.equal(run("link", "say [foo] now", "https://x.org"), "say [foo](https://x.org)| now");
  assert.equal(run("link", "say [foo] now"), "say [foo](|) now");
});

test("linkEdit escapes brackets in the text and reads escaped text back", () => {
  assert.equal(link("[a]", "a]b [c", "u"), "[a\\]b \\[c](u)|");
  const draft = registry.linkDraft(ctxOf("x [a\\]b|](u) y"));
  assert.equal(draft.text, "a]b");
  assert.equal(draft.url, "u");
  assert.equal(draft.end - draft.start, "[a\\]b](u)".length);
});

test("linkEdit never breaks the target: < and > are encoded, spaces get angle brackets", () => {
  assert.equal(link("[a]", "a", "http://x/<b>"), "[a](http://x/%3Cb%3E)|");
  assert.equal(link("[a]", "a", "my file>.md"), "[a](<my file%3E.md>)|");
});

test("replacing an existing link keeps its title", () => {
  assert.equal(link('a [l|](u "t") b', "new", "v"), 'a [new](v "t")| b');
  assert.equal(registry.linkDraft(ctxOf('a [l|](u "t") b')).title, '"t"');
  assert.equal(registry.linkDraft(ctxOf("a [l|](u) b")).title, undefined);
  // The empty-URL caret stays inside the parentheses even with a title.
  assert.equal(link('a [l|](u "t") b', "new", ""), 'a [new](| "t") b');
});

// T24: table and emoji.
function rawTable(value: string, selection: [number, number], arg: string | undefined, scope: "block" | "cell" = "block") {
  const action = registry.byId.get("table")!;
  const edit = action.apply({
    value, selectionStart: selection[0], selectionEnd: selection[1], scope,
    ...(arg === undefined ? {} : { arg }),
  });
  if (!edit) return undefined;
  return { result: value.slice(0, edit.start) + edit.text + value.slice(edit.end), edit };
}

test("table 1x1 is a header and its separator", () => {
  assert.equal(rawTable("", [0, 0], "1x1")?.result, "| Column 1 |\n| --- |");
});

test("table 3x4 has a header row, a separator and two empty rows", () => {
  assert.equal(
    rawTable("", [0, 0], "3x4")?.result,
    "| Column 1 | Column 2 | Column 3 | Column 4 |\n| --- | --- | --- | --- |\n|  |  |  |  |\n|  |  |  |  |",
  );
});

test("table 9x9 has 9 columns and 9 rows plus the separator", () => {
  const lines = rawTable("", [0, 0], "9x9")!.result.split("\n");
  assert.equal(lines.length, 10);
  assert.equal(lines[0], "| Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 |");
  assert.equal(lines[1], "| " + Array(9).fill("---").join(" | ") + " |");
  assert.equal(lines[9], "| " + Array(9).fill("").join(" | ") + " |");
});

test("the table caret selects the placeholder of the first header cell", () => {
  const out = rawTable("para", [4, 4], "2x2")!;
  assert.equal(out.edit.selectionStart, "para\n\n| ".length);
  assert.equal(out.result.slice(out.edit.selectionStart, out.edit.selectionEnd), "Column 1");
});

test("a table in the middle of a paragraph splits it onto its own lines", () => {
  assert.equal(
    rawTable("one two", [3, 3], "1x2")?.result,
    "one\n\n| Column 1 | Column 2 |\n| --- | --- |\n\n two",
  );
});

test("a table after a line break or a blank line adds only the missing blank lines", () => {
  assert.equal(rawTable("a\n", [2, 2], "1x1")?.result, "a\n\n| Column 1 |\n| --- |");
  assert.equal(rawTable("a\n\n", [3, 3], "1x1")?.result, "a\n\n| Column 1 |\n| --- |");
  assert.equal(rawTable("a\n\nb", [3, 3], "1x1")?.result, "a\n\n| Column 1 |\n| --- |\n\nb");
  assert.equal(rawTable("a\nb", [2, 2], "1x1")?.result, "a\n\n| Column 1 |\n| --- |\n\nb");
});

test("a table keeps a selection and goes after it", () => {
  assert.equal(rawTable("say foo now", [4, 7], "1x1")?.result, "say foo\n\n| Column 1 |\n| --- |\n\n now");
});

test("table refuses a missing, malformed or out-of-range size", () => {
  for (const arg of [undefined, "", "3", "0x3", "3x0", "10x2", "2x10", "ax2", "3x4x5", "3 x 4"]) {
    assert.equal(rawTable("x", [0, 0], arg), undefined, String(arg));
  }
});

test("the table action is for blocks only; emoji is for blocks and cells", () => {
  assert.deepEqual(registry.byId.get("table")!.scopes, ["block"]);
  assert.deepEqual(registry.byId.get("emoji")!.scopes, ["block", "cell"]);
});

test("emoji inserts at the caret and replaces the selection", () => {
  assert.equal(run("emoji", "say | now", "\u2705"), "say \u2705| now");
  assert.equal(run("emoji", "say [foo] now", "\u26a0\ufe0f"), "say \u26a0\ufe0f| now");
});

test("emoji refuses anything that is not a single pictograph run", () => {
  for (const arg of [undefined, "", "a", "<b>", "\n", "\u2705x", "x".repeat(20)]) {
    assert.equal(run("emoji", "a|b", arg), undefined, String(arg));
  }
});

test("every emoji of the picker is accepted, named and unique, in six categories without flags", () => {
  const categories = registry.byId.get("emoji")!.emoji!;
  assert.equal(categories.length, 6);
  const all = categories.flatMap((category) => category.items);
  assert.equal(all.length >= 140 && all.length <= 170, true, String(all.length));
  assert.equal(new Set(all.map((e) => e.char)).size, all.length, "no duplicates");
  for (const entry of all) {
    assert.match(entry.name, /^[a-z0-9 -]+$/u, entry.char);
    assert.notEqual(run("emoji", "|", entry.char), undefined, entry.char + " " + entry.name);
    assert.equal(/[\u{1F1E6}-\u{1F1FF}]/u.test(entry.char), false, "no flags");
  }
});
