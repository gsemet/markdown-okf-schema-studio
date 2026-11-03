import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createCodeBlockTools } from "../../../src/page/modules/codeBlockDirective";

const tools = createCodeBlockTools();

const block = [
  "```{code-block} python",
  ":linenos:",
  ":emphasize-lines: 1,3-4",
  ":caption: Hello world",
  ":name: hello",
  ":dedent: 2",
  "",
  "print('a')",
  "print('b')",
  "```",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-272
test("a code-block directive is read into its form values", () => {
  const model = tools.parse(block);
  assert.ok(model);
  assert.deepEqual(tools.valuesOf(model), {
    language: "python", linenos: true, emphasizeLines: "1,3-4", caption: "Hello world", name: "hello",
  });
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-272
test("an untouched directive is written back byte for byte, in every fence style", () => {
  for (const text of [
    block,
    "~~~{code-block} c\n:caption: x\n\nint a;\n~~~",
    ":::{code-block}\nplain\n:::",
    "  ```{code-block} sh\n  :linenos:\n\n  ls\n  ```",
    "```{code-block} python\nprint(1)",
    "```{code-block} python\n\n\nprint(1)\n\n```",
  ]) {
    const model = tools.parse(text);
    assert.ok(model, text);
    assert.equal(tools.serialize(model), text);
    assert.equal(tools.serialize(tools.applyValues(model, tools.valuesOf(model))), text);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-272
test("changing a value rewrites only its line and keeps the other options and the code", () => {
  const model = tools.parse(block)!;
  const next = tools.applyValues(model, {
    ...tools.valuesOf(model), language: "ts", emphasizeLines: "2", caption: "", linenos: false,
  });
  assert.equal(tools.serialize(next), [
    "```{code-block} ts",
    ":emphasize-lines: 2",
    ":name: hello",
    ":dedent: 2",
    "",
    "print('a')",
    "print('b')",
    "```",
  ].join("\n"));
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-272
test("a new option goes after the existing ones and a blank line keeps the code apart", () => {
  const model = tools.parse("```{code-block} python\nprint(1)\n```")!;
  const next = tools.applyValues(model, { ...tools.valuesOf(model), linenos: true, caption: "A: b" });
  assert.equal(tools.serialize(next), "```{code-block} python\n:linenos:\n:caption: A: b\n\nprint(1)\n```");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-272
test("a YAML option block and other directives are not understood", () => {
  assert.equal(tools.parse("```{code-block} python\n---\nlinenos: true\n---\nx\n```"), undefined);
  assert.equal(tools.parse("```{figure} a.png\n```"), undefined);
  assert.equal(tools.parse("```python\nx\n```"), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-272
test("the directive at the caret is the outermost one, its code is literal; none outside", () => {
  const text = "Intro\n\n" + block + "\n\nOutro";
  const inside = text.indexOf("print('a')");
  const found = tools.locate(text, inside);
  assert.ok(found);
  assert.equal(text.slice(found.start, found.end), block);
  assert.equal(tools.locate(text, 2), undefined);
  assert.equal(tools.locate(text, text.length), undefined);
  const nested = "````{code-block} md\n```{code-block} python\nx\n```\n````";
  const deep = tools.locate(nested, nested.indexOf("x"));
  assert.ok(deep);
  assert.equal(nested.slice(deep.start, deep.end), nested);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-272
test("a new directive has an empty body line, or wraps the touched lines, with a fence that outgrows the code", () => {
  assert.equal(tools.serialize(tools.newModel("python", [])), "```{code-block} python\n\n```");
  assert.equal(tools.serialize(tools.newModel("", [])), "```{code-block}\n\n```");
  const wrapped = tools.serialize(tools.newModel("", ["````", "c"]));
  assert.equal(wrapped, "`````{code-block}\n````\nc\n`````");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-272
test("insertion replaces a blank line, follows a text line or wraps the selected lines", () => {
  const model = (language: string) => {
    const base = tools.newModel(language, []);
    return tools.applyValues(base, { ...tools.valuesOf(base), linenos: true });
  };
  const blank = tools.insertion("Intro\n\n\nOutro", 7, 7, model("py"));
  assert.deepEqual([blank.start, blank.end], [7, 7]);
  assert.equal(blank.text, "```{code-block} py\n:linenos:\n\n\n```");
  assert.equal(blank.selectionStart, 7 + "```{code-block} py\n:linenos:\n\n".length);
  const after = tools.insertion("Intro", 2, 2, model("py"));
  assert.equal(after.text.startsWith("\n\n```{code-block} py"), true);
  assert.equal(after.start, 5);
  const selected = tools.insertion("a\nb\nc", 2, 3, model("py"));
  assert.deepEqual([selected.start, selected.end], [2, 3]);
  assert.equal(selected.text, "```{code-block} py\n:linenos:\n\nb\n```");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-272
test("the form refuses a bad language, emphasized lines, or a multi-line caption or name", () => {
  const ok = { language: "python", linenos: false, emphasizeLines: "1, 3-4", caption: "x", name: "n" };
  assert.deepEqual(tools.validate(ok), {});
  assert.deepEqual(tools.validate({ ...ok, language: "", emphasizeLines: "", caption: "", name: "" }), {});
  assert.deepEqual(Object.keys(tools.validate({
    ...ok, language: "py thon", emphasizeLines: "a,b", caption: "x\ny", name: "n\nm",
  })).sort(), ["caption", "emphasizeLines", "language", "name"]);
});
