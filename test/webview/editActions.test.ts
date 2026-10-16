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
    ["heading", "bold", "italic", "strikethrough", "codeFence", "quote", "rule", "todo"],
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
  assert.equal(key({ ctrlKey: true, code: "KeyK", key: "k" }), undefined);
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
