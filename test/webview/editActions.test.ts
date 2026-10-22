import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createEditActions } from "../../src/webview/editActions";
import { createMarkdownTableTools } from "../../src/webview/markdownTable";
import { isSafeOkfColor } from "../../src/webview/spanColors";

const registry = createEditActions([], createMarkdownTableTools());

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
  // P11: the `/` menu's own entries (Bulleted and Numbered list) are registered but have no button.
  assert.deepEqual(registry.actions.filter((action) => action.slash?.menuOnly).map((action) => action.id), ["bulletList", "numberedList"]);
  assert.deepEqual(
    registry.actions.filter((action) => !action.slash?.menuOnly).map((action) => action.id),
    [
      "heading", "bold", "italic", "strikethrough", "color", "colorCode", "link", "image", "codeFence", "quote",
      "rule", "table",
      "emoji", "todo", "alert", "checkbox", "htmlTable", "details", "footnote", "mermaid", "columnAlign", "kbd",
      "admonition", "deflist", "math", "sub", "sup", "label",
      "ref", "doc", "cite", "dropdown", "tableCaption", "figure", "roleKbd",
    ],
  );
  for (const action of registry.actions) {
    assert.equal(registry.byId.get(action.id), action);
    assert.ok(action.label.length > 0 && action.icon.length > 0 && action.group.length > 0);
    // T25: the GitHub group is listed for gfm only; every other action is in every mode.
    const github = [
      "alert", "checkbox", "htmlTable", "details", "footnote", "mermaid", "columnAlign", "kbd",
    ].includes(action.id);
    const myst = ["admonition", "deflist", "math", "sub", "sup", "label", "ref", "doc", "cite", "dropdown",
      "tableCaption", "figure", "roleKbd"].includes(action.id);
    assert.deepEqual(action.modes, myst ? ["myst"] : github ? ["gfm"] : ["strict"], action.id);
    if (action.slash?.menuOnly) assert.equal(action.shortcut, undefined, "no shortcut: " + action.id);
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

// T25: alert, checkbox and HTML table.
interface Applied { value: string; selection: [number, number] }

function applyTo(
  id: string, value: string, selection: [number, number], arg?: string,
): Applied | undefined {
  const edit = registry.byId.get(id)!.apply({
    value, selectionStart: selection[0], selectionEnd: selection[1], scope: "block",
    ...(arg === undefined ? {} : { arg }),
  });
  if (!edit) return undefined;
  return {
    value: value.slice(0, edit.start) + edit.text + value.slice(edit.end),
    selection: [edit.selectionStart, edit.selectionEnd],
  };
}

test("T25: the GitHub actions are block actions of the gfm mode with no shortcut", () => {
  for (const id of ["alert", "checkbox", "htmlTable"]) {
    const action = registry.byId.get(id)!;
    assert.deepEqual(action.modes, ["gfm"]);
    assert.deepEqual(action.scopes, ["block"]);
    assert.equal(action.shortcut, undefined);
  }
});

test("T25: alert on an empty line writes the NOTE head and a quoted line with the caret in it", () => {
  const out = applyTo("alert", "", [0, 0])!;
  assert.equal(out.value, "> [!NOTE]\n> ");
  assert.deepEqual(out.selection, [out.value.length, out.value.length]);
});

test("T25: alert quotes the touched lines under the head and keeps blank lines quoted", () => {
  assert.equal(applyTo("alert", "Be careful", [4, 4])!.value, "> [!NOTE]\n> Be careful");
  const multi = applyTo("alert", "intro\none\n\ntwo\nafter", [6, 15])!;
  assert.equal(multi.value, "intro\n> [!NOTE]\n> one\n>\n> two\nafter");
  assert.equal(multi.value.slice(multi.selection[0], multi.selection[1]), "> one\n>\n> two");
});

test("T25: alert takes the type from the argument and refuses an unknown one", () => {
  for (const type of ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"]) {
    assert.equal(applyTo("alert", "x", [1, 1], type)!.value, "> [!" + type + "]\n> x");
  }
  assert.equal(applyTo("alert", "x", [1, 1], "DANGER"), undefined);
  assert.equal(applyTo("alert", "x", [1, 1], "note"), undefined);
});

test("T25: with the caret in an alert the action changes its type and keeps the caret in place", () => {
  const value = "Intro\n\n> [!NOTE]\n> body text\n> more\n\nAfter";
  const caret = value.indexOf("body") + 2;
  const out = applyTo("alert", value, [caret, caret], "CAUTION")!;
  assert.equal(out.value, "Intro\n\n> [!CAUTION]\n> body text\n> more\n\nAfter");
  assert.deepEqual(out.selection, [caret + 3, caret + 3], "the caret follows its text");
  assert.equal(applyTo("alert", value, [caret, caret]), undefined, "no argument: nothing to change");
  assert.equal(applyTo("alert", value, [caret, caret], "NOTE"), undefined, "same type: no edit");
  const inHead = value.indexOf("NOTE") + 1;
  const head = applyTo("alert", value, [inHead, inHead], "TIP")!;
  assert.equal(head.value.includes("> [!TIP]"), true);
  assert.equal(head.value.slice(head.selection[0] - 3, head.selection[0]), "TIP", "a caret in the type goes after it");
});

test("T25: a quote that is not an alert, or a caret after the alert, inserts a new alert", () => {
  assert.equal(applyTo("alert", "> plain", [3, 3])!.value, "> [!NOTE]\n> > plain");
  const after = "> [!NOTE]\n> a\n\nB";
  const caret = after.length;
  assert.equal(applyTo("alert", after, [caret, caret])!.value, after.slice(0, -1) + "> [!NOTE]\n> B");
});

function checkbox(value: string, selection: [number, number]): Applied {
  return applyTo("checkbox", value, selection)!;
}

test("T25: checkbox puts - [ ] on a plain line and [ ] after the marker of a list item", () => {
  assert.equal(checkbox("buy milk", [3, 3]).value, "- [ ] buy milk");
  assert.equal(checkbox("- buy milk", [3, 3]).value, "- [ ] buy milk");
  assert.equal(checkbox("* buy", [0, 0]).value, "* [ ] buy");
  assert.equal(checkbox("12. buy", [0, 0]).value, "12. [ ] buy");
  assert.equal(checkbox("  - nested", [0, 0]).value, "  - [ ] nested");
  assert.equal(checkbox("  nested plain", [0, 0]).value, "  - [ ] nested plain");
});

test("T25: checkbox toggles a checkbox line off, checked or not, and leaves the list item", () => {
  assert.equal(checkbox("- [ ] done", [8, 8]).value, "- done");
  assert.equal(checkbox("- [x] done", [8, 8]).value, "- done");
  assert.equal(checkbox("1. [X] done", [8, 8]).value, "1. done");
});

test("T25: checkbox keeps the caret on its text", () => {
  const out = checkbox("- buy milk", [5, 5]);
  assert.equal(out.value.slice(0, out.selection[0]), "- [ ] buy");
  const back = checkbox("- [ ] buy milk", [9, 9]);
  assert.equal(back.value.slice(0, back.selection[0]), "- buy");
  const atStart = checkbox("plain", [0, 0]);
  assert.equal(atStart.value.slice(0, atStart.selection[0]), "- [ ] ", "a caret at the start lands after the box");
});

test("T25: checkbox on several lines is one action: all checkboxes lose it, else all lines get one", () => {
  assert.equal(checkbox("- [ ] a\n- [x] b", [0, 15]).value, "- a\n- b");
  assert.equal(checkbox("- [ ] a\n- b\nc", [0, 13]).value, "- [ ] a\n- [ ] b\n- [ ] c");
  assert.equal(checkbox("a\n\nb", [0, 4]).value, "- [ ] a\n\n- [ ] b", "blank lines stay blank");
  const out = checkbox("a\nb", [0, 3]);
  assert.deepEqual(out.selection, [0, out.value.length], "the touched lines stay selected");
});

test("T25: checkbox on an empty line inserts the box with the caret after it", () => {
  const out = checkbox("a\n\nb", [2, 2]);
  assert.equal(out.value, "a\n- [ ] \nb");
  assert.deepEqual(out.selection, [8, 8]);
});

test("T25: checkbox is its own inverse on a list item", () => {
  const once = checkbox("- item", [0, 6]);
  const twice = checkbox(once.value, once.selection);
  assert.equal(twice.value, "- item");
});

const HTML_TABLE_SOURCE = "| Name | Qty | Note |\n| :--- | ---: | :---: |\n| a&b | <3 | x\\|y |\n| `c|d` |  | z |";

test("T25: htmlTable converts the pipe table under the caret, text escaped, alignment kept", () => {
  const value = "Intro\n\n" + HTML_TABLE_SOURCE + "\n\nAfter";
  const caret = value.indexOf("a&b") + 1;
  const out = applyTo("htmlTable", value, [caret, caret])!;
  assert.equal(
    out.value,
    "Intro\n\n" + [
      "<table>",
      "  <thead>",
      "    <tr>",
      '      <th align="left">Name</th>',
      '      <th align="right">Qty</th>',
      '      <th align="center">Note</th>',
      "    </tr>",
      "  </thead>",
      "  <tbody>",
      "    <tr>",
      '      <td align="left">a&amp;b</td>',
      '      <td align="right">&lt;3</td>',
      '      <td align="center">x|y</td>',
      "    </tr>",
      "    <tr>",
      '      <td align="left">`c|d`</td>',
      '      <td align="right"></td>',
      '      <td align="center">z</td>',
      "    </tr>",
      "  </tbody>",
      "</table>",
    ].join("\n") + "\n\nAfter",
  );
  assert.equal(out.value.slice(out.selection[0]).startsWith("\n\nAfter"), true, "caret after </table>");
});

test("T25: htmlTable finds the table from its header, delimiter or last row, and from a table after text", () => {
  const value = "para | with pipe\n| a | b |\n| --- | --- |\n| 1 | 2 |";
  for (const at of [value.indexOf("| a"), value.indexOf("---"), value.length]) {
    const out = applyTo("htmlTable", value, [at, at])!;
    assert.equal(out.value.startsWith("para | with pipe\n<table>"), true, String(at));
    assert.equal(out.value.endsWith("</table>"), true);
  }
});

test("T25: htmlTable keeps the other tables and lines untouched", () => {
  const value = "| a |\n| - |\n\n| b | c |\n| --- | --- |\n| 1 | 2 |";
  const caret = value.indexOf("| b");
  const out = applyTo("htmlTable", value, [caret, caret])!;
  assert.equal(out.value.startsWith("| a |\n| - |\n\n<table>"), true, "the first block is not a table anyway");
  assert.equal(out.value.includes("<th>b</th>"), true);
  assert.equal(out.value.includes("<th>c</th>"), true, "no alignment: no attribute");
});

test("T25: htmlTable outside a pipe table inserts a new 2 x 2 table set apart by blank lines", () => {
  const out = applyTo("htmlTable", "one two", [3, 3])!;
  assert.equal(out.value.startsWith("one\n\n<table>"), true);
  assert.equal(out.value.endsWith("</table>\n\n two"), true);
  const rows = out.value.match(/<tr>/gu) ?? [];
  assert.equal(rows.length, 2, "a header row and one body row");
  assert.equal((out.value.match(/<th>/gu) ?? []).length, 2);
  assert.equal((out.value.match(/<td><\/td>/gu) ?? []).length, 2);
  assert.equal(out.value.slice(out.selection[0], out.selection[1]), "Column 1");
  assert.equal(applyTo("htmlTable", "", [0, 0])!.value.startsWith("<table>"), true);
});

test("T25: htmlTable with a paragraph that only contains a pipe inserts instead of converting", () => {
  const out = applyTo("htmlTable", "a | b\nplain", [5, 5])!;
  assert.equal(out.value.startsWith("a | b\n\n<table>"), true);
});

test("T25: htmlTable without table tools still inserts a new table and never throws", () => {
  const bare = createEditActions().byId.get("htmlTable")!;
  const end = HTML_TABLE_SOURCE.length;
  const edit = bare.apply({ value: HTML_TABLE_SOURCE, selectionStart: end, selectionEnd: end, scope: "block" });
  assert.ok(edit);
  assert.equal(edit.text.includes("<table>"), true);
  assert.equal(edit.start, end, "inserted after, nothing converted");
  assert.equal(edit.end, end);
});

// T26: details, footnote, mermaid, column alignment and kbd.
test("T26: the five proposals are gfm actions with no shortcut; only kbd also works in a cell", () => {
  for (const id of ["details", "footnote", "mermaid", "columnAlign", "kbd"]) {
    const action = registry.byId.get(id)!;
    assert.deepEqual(action.modes, ["gfm"], id);
    assert.deepEqual(action.scopes, id === "kbd" ? ["block", "cell"] : ["block"], id);
    assert.equal(action.shortcut, undefined, id);
  }
  assert.equal(registry.byId.get("columnAlign")!.popover, "align");
  assert.deepEqual(registry.byId.get("columnAlign")!.options!.map((o) => o.value), ["left", "center", "right"]);
});

test("T26: details inserts a collapsible sample after the selection, summary selected", () => {
  const out = applyTo("details", "Intro", [5, 5])!;
  assert.equal(out.value, "Intro\n\n<details>\n<summary>Summary</summary>\n\nContent\n\n</details>");
  assert.equal(out.value.slice(...out.selection), "Summary");
});

test("T26: details wraps the touched lines and keeps them as content", () => {
  const out = applyTo("details", "one\ntwo\nthree", [2, 6])!;
  assert.equal(out.value, "<details>\n<summary>Summary</summary>\n\none\ntwo\n\n</details>\nthree");
  assert.equal(out.value.slice(...out.selection), "Summary");
});

test("T26: footnote takes the next free number and writes the definition at the end", () => {
  const out = applyTo("footnote", "A claim here.\n\nMore text.", [7, 7])!;
  assert.equal(out.value, "A claim[^1] here.\n\nMore text.\n\n[^1]: ");
  assert.deepEqual(out.selection, [out.value.length, out.value.length]);
  const second = applyTo("footnote", "x[^1] y[^3]\n\n[^1]: one\n[^3]: three\n", [1, 1])!;
  assert.equal(second.value, "x[^4][^1] y[^3]\n\n[^1]: one\n[^3]: three\n[^4]: \n");
  assert.equal(second.value.slice(0, second.selection[0]).endsWith("[^4]: "), true);
  assert.equal(second.value.slice(second.selection[0]), "\n", "the trailing newline stays after the caret");
});

test("T26: footnote with named labels counts only numbers and inserts after a selection", () => {
  const out = applyTo("footnote", "see [^note] word", [4, 11])!;
  assert.equal(out.value.startsWith("see [^note][^1] word"), true);
  assert.equal(out.value.endsWith("\n\n[^1]: "), true);
});

test("T26: mermaid inserts a flowchart fence set apart, first label selected", () => {
  const out = applyTo("mermaid", "Intro\n\nOutro", [5, 5])!;
  assert.equal(out.value, "Intro\n\n```mermaid\nflowchart TD\n  A[Start] --> B[End]\n```\n\nOutro");
  assert.equal(out.value.slice(...out.selection), "Start");
});

const ALIGN_TABLE = "| Name | Qty |\n| --- | --- |\n| a | 1 |";

test("T26: columnAlign rewrites only the delimiter cell of the caret's column", () => {
  const at = ALIGN_TABLE.indexOf("Qty");
  assert.equal(applyTo("columnAlign", ALIGN_TABLE, [at, at], "right")!.value,
    "| Name | Qty |\n| --- | ---: |\n| a | 1 |");
  assert.equal(applyTo("columnAlign", ALIGN_TABLE, [2, 2], "center")!.value,
    "| Name | Qty |\n| :---: | --- |\n| a | 1 |");
  assert.equal(applyTo("columnAlign", ALIGN_TABLE, [2, 2], "left")!.value,
    "| Name | Qty |\n| :--- | --- |\n| a | 1 |");
});

test("T26: columnAlign keeps the width of a padded column and replaces an existing alignment", () => {
  const padded = "| Name   | Qty |\n| ------ | --- |\n| a      | 1   |";
  assert.equal(applyTo("columnAlign", padded, [2, 2], "right")!.value.split("\n")[1], "| -----: | --- |");
  assert.equal(applyTo("columnAlign", padded, [2, 2], "center")!.value.split("\n")[1], "| :----: | --- |");
  const aligned = "| a | b |\n| :---: | ---: |\n| 1 | 2 |";
  const at = aligned.indexOf("b");
  assert.equal(applyTo("columnAlign", aligned, [at, at], "left")!.value.split("\n")[1], "| :---: | :--- |");
  const again = applyTo("columnAlign", aligned, [at, at], "left")!.value;
  assert.equal(applyTo("columnAlign", again, [at, at], "left"), undefined, "already left: no edit");
});

test("T26: columnAlign works from a body row, outside pipes and in tables without edge pipes", () => {
  const value = "intro\n\nA | B\n--- | ---\n1 | 2";
  const at = value.indexOf("2");
  assert.equal(applyTo("columnAlign", value, [at, at], "right")!.value, "intro\n\nA | B\n--- | ---:\n1 | 2");
  assert.equal(applyTo("columnAlign", "no table here", [3, 3], "left"), undefined);
  assert.equal(applyTo("columnAlign", ALIGN_TABLE, [2, 2]), undefined, "no choice yet");
  assert.equal(applyTo("columnAlign", ALIGN_TABLE, [2, 2], "justify"), undefined);
});

test("T26: kbd wraps the selection, unwraps it, and inserts a sample on a caret", () => {
  const wrapped = applyTo("kbd", "Press Ctrl now", [6, 10])!;
  assert.equal(wrapped.value, "Press <kbd>Ctrl</kbd> now");
  assert.equal(wrapped.value.slice(...wrapped.selection), "Ctrl");
  const back = applyTo("kbd", wrapped.value, wrapped.selection)!;
  assert.equal(back.value, "Press Ctrl now");
  assert.equal(back.value.slice(...back.selection), "Ctrl");
  const whole = applyTo("kbd", "<kbd>Esc</kbd>", [0, 14])!;
  assert.equal(whole.value, "Esc");
  const sample = applyTo("kbd", "a b", [1, 1])!;
  assert.equal(sample.value, "a<kbd>Key</kbd> b");
  assert.equal(sample.value.slice(...sample.selection), "Key");
});

// T28: MyST group.
test("T28: the MyST actions are myst-only with no shortcut; sub and sup also work in a cell", () => {
  for (const id of ["admonition", "deflist", "math", "sub", "sup", "label"]) {
    const action = registry.byId.get(id)!;
    assert.deepEqual(action.modes, ["myst"], id);
    assert.equal(action.shortcut, undefined, id);
    assert.deepEqual(action.scopes, id === "sub" || id === "sup" ? ["block", "cell"] : ["block"], id);
  }
  assert.deepEqual(registry.byId.get("admonition")!.options!.map((o) => o.value), [
    "note", "tip", "important", "warning", "caution", "danger", "attention", "error", "hint", "seealso",
    "custom",
  ]);
  assert.equal(registry.byId.get("admonition")!.options!.at(-1)!.label, "Custom\u2026");
  assert.deepEqual(registry.byId.get("math")!.options!.map((o) => o.value), ["inline", "display", "aligned"]);
});

test("T28: admonition wraps the touched lines in a colon fence and selects the body", () => {
  const out = applyTo("admonition", "one\ntwo\nthree", [2, 6], "warning")!;
  assert.equal(out.value, ":::{warning}\none\ntwo\n:::\nthree");
  assert.equal(out.value.slice(...out.selection), "one\ntwo");
});

test("T28: admonition without a selection inserts an empty body with the caret in it", () => {
  const out = applyTo("admonition", "Intro", [5, 5], "tip")!;
  assert.equal(out.value, "Intro\n\n:::{tip}\n\n:::");
  const body = out.value.indexOf("{tip}\n") + 6;
  assert.deepEqual(out.selection, [body, body], "the caret is on the empty body line");
});

test("T28: admonition uses one more colon than the longest fence inside", () => {
  const inner = "::::{note}\nx\n::::";
  assert.equal(applyTo("admonition", inner, [0, inner.length], "hint")!.value,
    ":::::{hint}\n::::{note}\nx\n::::\n:::::");
  const plain = ":::{note}\nx\n:::";
  assert.equal(applyTo("admonition", plain, [0, plain.length], "tip")!.value,
    "::::{tip}\n:::{note}\nx\n:::\n::::");
});

test("T28: admonition keeps list items together and ignores an unknown type", () => {
  const list = "- a\n- b";
  assert.equal(applyTo("admonition", list, [0, list.length], "note")!.value, ":::{note}\n- a\n- b\n:::");
  assert.equal(applyTo("admonition", list, [0, 3], "bogus"), undefined);
  assert.equal(applyTo("admonition", list, [0, 3]), undefined);
});

test("T28: a selection ending at a line start does not pull that line into the admonition", () => {
  const out = applyTo("admonition", "one\ntwo\n", [0, 4], "note")!;
  assert.equal(out.value, ":::{note}\none\n:::\ntwo\n");
});

test("T28: custom admonition writes a titled block with a class and selects the title", () => {
  const out = applyTo("admonition", "Body", [0, 4], "custom")!;
  assert.equal(out.value, ":::{admonition} Title\n:class: note\n\nBody\n:::");
  assert.equal(out.value.slice(...out.selection), "Title");
  const empty = applyTo("admonition", "Intro", [5, 5], "custom")!;
  assert.equal(empty.value, "Intro\n\n:::{admonition} Title\n:class: note\n\n:::");
  assert.equal(empty.value.slice(...empty.selection), "Title");
});

test("T28: deflist makes the selection the term and selects the definition", () => {
  const out = applyTo("deflist", "Alpha\nrest", [0, 5])!;
  assert.equal(out.value, "Alpha\n: Definition\nrest");
  assert.equal(out.value.slice(...out.selection), "Definition");
  const empty = applyTo("deflist", "Intro", [5, 5])!;
  assert.equal(empty.value, "Intro\n\nTerm\n: Definition");
  assert.equal(empty.value.slice(...empty.selection), "Term");
});

test("T28: math inline, display and aligned", () => {
  assert.equal(applyTo("math", "a b c", [2, 3], "inline")!.value, "a $b$ c");
  const inline = applyTo("math", "a  c", [2, 2], "inline")!;
  assert.equal(inline.value, "a $x$ c");
  assert.equal(inline.value.slice(...inline.selection), "x");
  assert.equal(applyTo("math", "E=mc2", [0, 5], "display")!.value, "$$\nE=mc2\n$$");
  const display = applyTo("math", "Intro", [5, 5], "display")!;
  assert.equal(display.value, "Intro\n\n$$\nE = mc^2\n$$");
  const aligned = applyTo("math", "Intro", [5, 5], "aligned")!;
  assert.equal(aligned.value, "Intro\n\n$$\n\\begin{align}\na &= b\n\\end{align}\n$$");
  assert.equal(aligned.value.slice(...aligned.selection), "a &= b");
  assert.equal(applyTo("math", "x", [0, 1], "bogus"), undefined);
});

test("T28: sub and sup wrap the selection in a role; empty puts the caret inside", () => {
  assert.equal(run("sub", "H[2]O"), "H{sub}`[2]`O");
  assert.equal(run("sup", "x[2]"), "x{sup}`[2]`");
  const out = applyTo("sub", "H", [1, 1])!;
  assert.equal(out.value, "H{sub}``");
  assert.deepEqual(out.selection, [7, 7]);
});

test("T28: label inserts (name)= above the block with the name selected", () => {
  const out = applyTo("label", "Para\ntext", [6, 6])!;
  assert.equal(out.value, "(label-name)=\nPara\ntext");
  assert.equal(out.value.slice(...out.selection), "label-name");
  assert.equal(applyTo("label", "(x)=\nPara", [0, 0]), undefined, "already labelled");
});

// T30: MyST references, citations, dropdown, captioned table and key role.
test("T30: ref, doc, cite, dropdown, tableCaption and roleKbd are myst-only without shortcut", () => {
  for (const id of ["ref", "doc", "cite", "dropdown", "tableCaption", "roleKbd"]) {
    const action = registry.byId.get(id)!;
    assert.ok(action, id);
    assert.deepEqual(action.modes, ["myst"], id);
    assert.equal(action.shortcut, undefined, id);
    assert.equal(action.group, "myst", id);
  }
  assert.equal(registry.byId.get("ref")!.hostList, "targets");
  assert.equal(registry.byId.get("cite")!.hostList, "citations");
  assert.equal(registry.byId.get("doc")!.hostDialog, "document");
  assert.deepEqual(registry.byId.get("roleKbd")!.scopes, ["block", "cell"]);
});

test("T30: ref inserts {ref} with the chosen label and keeps a selection as the link text", () => {
  assert.equal(run("ref", "see |", "intro"), "see {ref}`intro`|");
  assert.equal(run("ref", "see [the intro] now", "intro"), "see {ref}`the intro <intro>`| now");
  assert.equal(run("ref", "see |"), undefined, "no label chosen");
  assert.equal(run("ref", "see |", "bad`label"), undefined);
  assert.equal(run("ref", "see |", "a<b"), undefined);
  assert.equal(run("ref", "see [two\nlines]", "x"), undefined, "a selection with a line break is refused");
});

test("T30: doc inserts {doc} with the picked path", () => {
  assert.equal(run("doc", "read |", "../guide/setup"), "read {doc}`../guide/setup`|");
  assert.equal(run("doc", "read [the setup] now", "setup"), "read {doc}`the setup <setup>`| now");
  assert.equal(run("doc", "read |", "a`b"), undefined);
  assert.equal(run("doc", "read |"), undefined);
});

test("T30: cite inserts {cite} with the chosen key", () => {
  assert.equal(run("cite", "claim |", "smith2024"), "claim {cite}`smith2024`|");
  assert.equal(run("cite", "claim [text]", "smith2024"), "claim {cite}`smith2024`|", "a selection is replaced");
  assert.equal(run("cite", "claim |", "bad key"), undefined);
  assert.equal(run("cite", "claim |"), undefined);
});

test("T30: dropdown inserts a note with :class: dropdown or wraps the touched lines", () => {
  assert.equal(
    run("dropdown", "intro|"),
    "intro\n\n:::{note} [Title]\n:class: dropdown\n\nContent\n:::",
  );
  assert.equal(
    run("dropdown", "[one\ntwo]"),
    ":::{note} [Title]\n:class: dropdown\n\none\ntwo\n:::",
  );
  assert.equal(
    run("dropdown", "[:::{tip}\nx\n:::]"),
    "::::{note} [Title]\n:class: dropdown\n\n:::{tip}\nx\n:::\n::::",
  );
});

test("T30: tableCaption wraps the pipe table at the caret, or inserts a new one", () => {
  const table = "| A | B |\n| --- | --- |\n| 1 | 2 |";
  const source = "before\n\n" + table + "\n\nafter";
  const caret = source.indexOf("1 |");
  const wrapped = applyTo("tableCaption", source, [caret, caret])!;
  assert.equal(wrapped.value, "before\n\n:::{table} Caption\n\n" + table + "\n:::\n\nafter");
  assert.equal(wrapped.value.slice(...wrapped.selection), "Caption");
  const fresh = applyTo("tableCaption", "intro", [5, 5])!;
  assert.equal(
    fresh.value,
    "intro\n\n:::{table} Caption\n\n| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n:::",
  );
  assert.equal(fresh.value.slice(...fresh.selection), "Caption");
  const done = ":::{table} Old\n\n" + table + "\n:::";
  assert.equal(applyTo("tableCaption", done, [done.indexOf("1 |"), done.indexOf("1 |")]), undefined,
    "an already captioned table is left alone");
});

test("T30: roleKbd wraps the selection in {kbd}, or inserts a sample key", () => {
  assert.equal(run("roleKbd", "press [Ctrl] now"), "press {kbd}`[Ctrl]` now");
  assert.equal(run("roleKbd", "press | now"), "press {kbd}`[Ctrl+K]` now");
  assert.equal(run("roleKbd", "press [a`b]"), undefined);
});

// T31: image and figure from a picked file.
test("T31: image is a strict action and figure a myst one, both asking the host for a file", () => {
  const image = registry.byId.get("image")!;
  assert.deepEqual(image.modes, ["strict"]);
  assert.equal(image.hostDialog, "image");
  assert.equal(image.shortcut, undefined);
  const figure = registry.byId.get("figure")!;
  assert.deepEqual(figure.modes, ["myst"]);
  assert.equal(figure.hostDialog, "image");
  assert.deepEqual(figure.scopes, ["block"]);
});

test("T31: image inserts ![name](path) with the name selected", () => {
  const out = applyTo("image", "see ", [4, 4], "img/logo.png")!;
  assert.equal(out.value, "see ![logo](img/logo.png)");
  assert.equal(out.value.slice(...out.selection), "logo");
  const replaced = applyTo("image", "a [old] b", [2, 7], "../x/photo.final.jpg")!;
  assert.equal(replaced.value, "a ![photo.final](../x/photo.final.jpg) b");
});

test("T31: image wraps a path with spaces or parentheses in angle brackets", () => {
  assert.equal(applyTo("image", "", [0, 0], "my pics/a.png")!.value, "![a](<my pics/a.png>)");
  assert.equal(applyTo("image", "", [0, 0], "a (1).png")!.value, "![a (1)](<a (1).png>)");
  assert.equal(applyTo("image", "", [0, 0], "p(1).png")!.value, "![p(1)](<p(1).png>)");
});

test("T31: image refuses a missing or unwritable path and keeps brackets out of the name", () => {
  assert.equal(applyTo("image", "", [0, 0]), undefined);
  assert.equal(applyTo("image", "", [0, 0], "a>b.png"), undefined);
  assert.equal(applyTo("image", "", [0, 0], "a\nb.png"), undefined);
  assert.equal(applyTo("image", "", [0, 0], "a[1].png")!.value, "![a1](a[1].png)");
  assert.equal(applyTo("image", "", [0, 0], "a\\.png")!.value, "![a](a\\.png)", "a trailing backslash would escape ]");
});

test("T31: figure inserts the directive with alt text and an empty caption line", () => {
  const out = applyTo("figure", "Intro", [5, 5], "img/logo.png")!;
  assert.equal(out.value, "Intro\n\n:::{figure} img/logo.png\n:alt: logo\n\n\n:::");
  const caption = out.value.indexOf(":alt: logo\n\n") + ":alt: logo\n\n".length;
  assert.deepEqual(out.selection, [caption, caption], "the caret is on the caption line");
});

test("T31: figure keeps the touched lines as the caption and uses one more colon than the fences inside", () => {
  const out = applyTo("figure", "A caption\nsecond", [0, 9], "p.png")!;
  assert.equal(out.value, ":::{figure} p.png\n:alt: p\n\nA caption\n:::\nsecond");
  const nested = applyTo("figure", ":::{note}\nx\n:::", [0, 15], "p.png")!;
  assert.equal(nested.value, "::::{figure} p.png\n:alt: p\n\n:::{note}\nx\n:::\n::::");
  assert.equal(applyTo("figure", "", [0, 0]), undefined);
  assert.equal(applyTo("figure", "", [0, 0], "a`b.png")?.value.includes("`"), true, "backticks are fine in an argument");
});

// T34: the colour picker and the colour-code swatch.
const colourRegistry = createEditActions([], createMarkdownTableTools(), isSafeOkfColor);

function colour(
  id: string, input: string, arg?: string, scope: "block" | "cell" = "block",
): string | undefined {
  const caret = input.indexOf("|");
  const value = caret !== -1 ? input.replace("|", "") : input.replace("[", "").replace("]", "");
  const start = caret !== -1 ? caret : input.indexOf("[");
  const end = caret !== -1 ? caret : input.indexOf("]") - 1;
  const edit = colourRegistry.byId.get(id)!.apply({
    value, selectionStart: start, selectionEnd: end, scope, ...(arg === undefined ? {} : { arg }),
  });
  if (!edit) return undefined;
  const result = value.slice(0, edit.start) + edit.text + value.slice(edit.end);
  const a = edit.selectionStart;
  const b = edit.selectionEnd;
  return a === b
    ? result.slice(0, a) + "|" + result.slice(a)
    : result.slice(0, a) + "[" + result.slice(a, b) + "]" + result.slice(b);
}

test("T34: color is a strict-mode action for blocks and cells with a swatch popover", () => {
  const action = colourRegistry.byId.get("color")!;
  assert.deepEqual(action.modes, ["strict"]);
  assert.deepEqual(action.scopes, ["block", "cell"]);
  assert.equal(action.popover, "color");
  assert.equal(action.colors?.length, 16);
  for (const swatch of action.colors ?? []) assert.equal(isSafeOkfColor(swatch), true, swatch);
  assert.equal(new Set(action.colors).size, 16);
});

test("T34: color wraps the selection in the exact span the renderer keeps", () => {
  assert.equal(colour("color", "say [foo] now", "text:#c00"), 'say <span style="color:#c00">[foo]</span> now');
  assert.equal(colour("color", "say [foo] now", "background:#ff0"),
    'say <span style="background-color:#ff0">[foo]</span> now');
  assert.equal(colour("color", "say | now", "text:#c00"), 'say <span style="color:#c00">|</span> now');
  assert.equal(colour("color", "a[ foo ]b", "text:#c00"), 'a <span style="color:#c00">[foo]</span> b');
});

test("T34: color updates the span the selection or caret is in, and adds the second property", () => {
  assert.equal(colour("color", 'x <span style="color:#c00">[foo]</span> y', "text:#00f"),
    'x <span style="color:#00f">[foo]</span> y');
  assert.equal(colour("color", 'x <span style="color:#c00">f|oo</span> y', "text:#00f"),
    'x <span style="color:#00f">f|oo</span> y', "a caret stays where it was");
  assert.equal(colour("color", 'x <span style="color:#c00">[foo]</span> y', "background:#ff0"),
    'x <span style="color:#c00; background-color:#ff0">[foo]</span> y');
  assert.equal(colour("color", 'x <span style="color:#c00; background-color:#ff0">[foo]</span> y', "background:rgb(1, 2, 3)"),
    'x <span style="color:#c00; background-color:rgb(1, 2, 3)">[foo]</span> y');
});

test("T34: a partial selection inside a coloured span nests a new span instead", () => {
  assert.equal(colour("color", 'x <span style="color:#c00">a[b]c</span>', "text:#00f"),
    'x <span style="color:#c00">a<span style="color:#00f">[b]</span>c</span>');
});

test("T34: color refuses a selection that straddles a span boundary, in both directions", () => {
  assert.equal(colour("color", 'ab<span style="color:#c00">c[d</span>e]f', "text:#00f"), undefined);
  assert.equal(colour("color", 'a[b<span style="color:#c00">c]d</span>ef', "text:#00f"), undefined);
  assert.equal(colour("color", 'a[b<span style="color:#c00">cd</span>e]f', "text:#00f"),
    'a<span style="color:#00f">[b<span style="color:#c00">cd</span>e]</span>f', "balanced still wraps");
});

test("T34: color refuses a boundary inside a tag's own text", () => {
  assert.equal(colour("color", 'ab<span style="co[lor:#c00">cd</span>e]f', "text:#00f"), undefined);
  assert.equal(colour("color", 'a<b onclick="x|y">c</b>', "text:#00f"), undefined);
});

test("T34: color Remove drops one property and unwraps the span when none is left", () => {
  assert.equal(colour("color", 'x <span style="color:#c00; background-color:#ff0">[foo]</span>', "text:"),
    'x <span style="background-color:#ff0">[foo]</span>');
  assert.equal(colour("color", 'x <span style="color:#c00">[foo]</span> y', "text:"), "x [foo] y");
  assert.equal(colour("color", 'x <span style="color:#c00">fo|o</span> y', "text:"), "x fo|o y");
  assert.equal(colour("color", "x [foo] y", "text:"), undefined, "nothing to remove");
  assert.equal(colour("color", 'x <span style="color:#c00">[foo]</span> y', "background:"), undefined,
    "no such property");
});

test("T34: color refuses an invalid value and never writes markup the sanitizer would strip", () => {
  for (const bad of ["text:red", "text:#12", "text:#ggg", "text:url(x)", "text:#c00;position:fixed",
    'text:#c00"><script>', "text:rgb(1,2,3", "text:var(--x)", "text:#c00 !important", "sky:#c00", "#c00", ""]) {
    assert.equal(colour("color", "say [foo] now", bad), undefined, bad);
  }
  assert.equal(colour("color", "say [foo] now"), undefined, "no argument");
  // Everything the action writes passes the sanitizer grammar.
  const edit = colourRegistry.byId.get("color")!.apply({
    value: "foo", selectionStart: 0, selectionEnd: 3, scope: "block", arg: "text:rgba(1, 2, 3, 0.5)" })!;
  assert.match(edit.text, /^<span style="color:rgba\(1, 2, 3, 0\.5\)">foo<\/span>$/u);
});

test("T34: without a colour validator the colour actions refuse", () => {
  const bare = createEditActions();
  assert.equal(bare.byId.get("color")!.apply({
    value: "foo", selectionStart: 0, selectionEnd: 3, scope: "block", arg: "text:#c00" }), undefined);
});

test("T34: color works in a table cell without escaping the pipes", () => {
  assert.equal(colour("color", "[foo]", "text:#c00", "cell"), '<span style="color:#c00">[foo]</span>');
  assert.equal(colour("color", '<span style="color:#c00">f|oo</span>', "background:#ff0", "cell"),
    '<span style="color:#c00; background-color:#ff0">f|oo</span>');
});

test("T34: colorCode is available only with the caret in a colour code", () => {
  const action = colourRegistry.byId.get("colorCode")!;
  const probe = (input: string): boolean => {
    const caret = input.indexOf("|");
    return action.available!({ value: input.replace("|", ""), selectionStart: caret, selectionEnd: caret, scope: "block" });
  };
  assert.equal(probe("a #c00| b"), true, "right edge");
  assert.equal(probe("a |#c00 b"), true, "left edge");
  assert.equal(probe("a #c|c0000 b"), true);
  assert.equal(probe("a rgb(1, 2,| 3) b"), true);
  assert.equal(probe("a |rgba(1,2,3,0.5)"), true);
  assert.equal(probe("a| #c00 b"), false, "one space before");
  assert.equal(probe("a #c00 |b"), false, "one space after");
  assert.equal(probe("a #c0| b"), false, "two digits");
  assert.equal(probe("a #c00x| b"), false, "followed by a letter");
  assert.equal(probe("a x#c00| b"), false, "preceded by a letter");
  assert.equal(probe("a #ccccc| b"), false, "five digits");
  assert.equal(probe("a rgb(300,0,0)| b"), false, "out of range");
  assert.equal(probe("a rgb(1,2| b"), false, "unclosed");
  assert.equal(probe("plain| text"), false);
  assert.equal(action.current!({ value: "a #C00 b", selectionStart: 3, selectionEnd: 3, scope: "block" }), "#C00");
  assert.equal(action.current!({ value: "plain", selectionStart: 1, selectionEnd: 1, scope: "block" }), undefined);
});

test("T34: colorCode replaces the code under the caret in place, validated", () => {
  assert.equal(colour("colorCode", "a #c0|0 b", "#00f"), "a #00f| b");
  assert.equal(colour("colorCode", "a rgb(1, 2, 3)| b", "#ff8800"), "a #ff8800| b");
  assert.equal(colour("colorCode", "a #c0|0 b", "red"), undefined);
  assert.equal(colour("colorCode", "a #c0|0 b", 'rgb(1,2,3);"'), undefined);
  assert.equal(colour("colorCode", "a plain| b", "#00f"), undefined, "no code at the caret");
  assert.equal(colour("colorCode", "a #c0|0 b"), undefined);
});

// P11: Bulleted list and Numbered list (menu-only actions).
function listEdit(id: string, value: string, start: number, end = start) {
  const edit = registry.byId.get(id)!.apply({ value, selectionStart: start, selectionEnd: end, scope: "block" });
  return edit && { result: value.slice(0, edit.start) + edit.text + value.slice(edit.end), caret: [edit.selectionStart, edit.selectionEnd] };
}

test("P11: the list actions are menu-only, block-scope and in every mode", () => {
  for (const id of ["bulletList", "numberedList"]) {
    const action = registry.byId.get(id)!;
    assert.equal(action.slash?.menuOnly, true);
    assert.deepEqual(action.scopes, ["block"]);
    assert.deepEqual(action.modes, ["strict"]);
  }
});

test("P11: Bulleted list on an empty line, a text line, several lines, and toggled off", () => {
  assert.deepEqual(listEdit("bulletList", "", 0), { result: "- ", caret: [2, 2] });
  assert.deepEqual(listEdit("bulletList", "a\n\n", 3), { result: "a\n\n- ", caret: [5, 5] });
  assert.deepEqual(listEdit("bulletList", "item", 2), { result: "- item", caret: [4, 4] });
  assert.equal(listEdit("bulletList", "one\n\ntwo", 0, 8)?.result, "- one\n\n- two");
  assert.equal(listEdit("bulletList", "- one\n- two", 0, 11)?.result, "one\ntwo", "toggles off");
  assert.equal(listEdit("bulletList", "1. one\n2. two", 0, 13)?.result, "- one\n- two", "replaces a numbered marker");
  assert.equal(listEdit("bulletList", "- one\ntwo", 0, 9)?.result, "- one\n- two", "a mixed selection adds");
});

test("P11: Numbered list numbers the non-blank lines and toggles off", () => {
  assert.deepEqual(listEdit("numberedList", "", 0), { result: "1. ", caret: [3, 3] });
  assert.equal(listEdit("numberedList", "a\nb\n\nc", 0, 6)?.result, "1. a\n2. b\n\n3. c");
  assert.equal(listEdit("numberedList", "1. a\n2. b", 0, 9)?.result, "a\nb");
  assert.equal(listEdit("numberedList", "- a\n- b", 0, 7)?.result, "1. a\n2. b", "replaces a bullet marker");
  assert.equal(listEdit("numberedList", "word", 4)?.result, "1. word");
});

// CR 035: the link and image panels start from the link or image around the caret.
test("CR035: linkDraft reads a reference-style link back from its definition", () => {
  const defs = "\n\n[ref]: https://r.org \"Ref title\"";
  const full = registry.linkDraft(ctxOf("a [la|bel][Ref] b" + defs));
  assert.equal(full.text, "label");
  assert.equal(full.url, "https://r.org");
  assert.equal(full.title, "\"Ref title\"");
  assert.equal(full.start, 2);
  assert.equal(full.end, 14);
  const collapsed = registry.linkDraft(ctxOf("a [re|f][] b" + defs));
  assert.equal(collapsed.url, "https://r.org");
  assert.equal(collapsed.end, 9);
  const shortcut = registry.linkDraft(ctxOf("a [re|f] b" + defs));
  assert.equal(shortcut.url, "https://r.org");
  assert.equal(shortcut.text, "ref");
});

test("CR035: an unresolvable reference link inserts an inline link instead", () => {
  const draft = registry.linkDraft(ctxOf("a [la|bel][missing] b"));
  assert.equal(draft.url, "");
  assert.equal(draft.start, draft.end);
});

test("CR035: saving the panel replaces a reference link by an inline one, definition kept", () => {
  const input = "a [la|bel][ref] b\n\n[ref]: https://r.org";
  assert.equal(link(input, "new", "https://n.org"), "a [new](https://n.org)| b\n\n[ref]: https://r.org");
});

test("CR035: link replacement keeps the title and the caret inside a link with a title", () => {
  assert.equal(link('a [la|bel](u "t") b', "x", "v"), 'a [x](v "t")| b');
});

test("CR035: imageDraft reads alt, path and title of the image around the caret", () => {
  const draft = registry.imageDraft(ctxOf('a ![al|t](p/x.png "T") b'));
  assert.deepEqual(draft, { alt: "alt", url: "p/x.png", title: '"T"', start: 2, end: 21 });
  const angle = registry.imageDraft(ctxOf("![a|](<my pics/a.png>)"));
  assert.equal(angle?.url, "my pics/a.png");
  assert.equal(registry.imageDraft(ctxOf("a [lab|el](u) b")), undefined);
  assert.equal(registry.imageDraft(ctxOf("![a](b)|")), undefined);
  assert.equal(registry.imageDraft(ctxOf("see |here")), undefined);
});

test("CR035: the image action replaces the image around the caret and keeps alt and title", () => {
  const out = applyTo("image", 'a ![al|t](p/x.png "T") b'.replace("|", ""), [5, 5], "img/new.png")!;
  assert.equal(out.value, 'a ![alt](img/new.png "T") b');
  assert.equal(out.value.slice(...out.selection), "alt");
  const selected = applyTo("image", "![alt](old.png)", [3, 6], "n (1).png")!;
  assert.equal(selected.value, "![alt](<n (1).png>)");
  // Outside any image the behaviour is unchanged.
  assert.equal(applyTo("image", "![alt](old.png) ", [16, 16], "n.png")!.value, "![alt](old.png) ![n](n.png)");
});
