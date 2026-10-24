import * as assert from "node:assert/strict";
import { test } from "node:test";

import { parseConf } from "../../../src/core/myst/confParser";

// The list below is copied from the white paper's sphinx/conf.py.
const BOOK_CONF = `
extensions = [
    "myst_parser",
    "sphinx_animation",
    "sphinxcontrib.bibtex",
    "preview_source_mapping",
]

myst_enable_extensions = [
    "attrs_inline",
    "colon_fence",
    "deflist",
    "dollarmath",
    "fieldlist",
    "html_admonition",
    "html_image",
    "replacements",
    "smartquotes",
    "strikethrough",
    "substitution",
    "tasklist",
]
myst_heading_anchors = 3
`;

test("the book's conf.py lists are read in full", () => {
  const conf = parseConf(BOOK_CONF);
  assert.equal(conf.certain, true);
  assert.deepEqual(conf.extensions, [
    "myst_parser", "sphinx_animation", "sphinxcontrib.bibtex", "preview_source_mapping",
  ]);
  assert.deepEqual(conf.mystExtensions, [
    "attrs_inline", "colon_fence", "deflist", "dollarmath", "fieldlist", "html_admonition",
    "html_image", "replacements", "smartquotes", "strikethrough", "substitution", "tasklist",
  ]);
});

test("comments, tuples, single quotes, trailing commas and string joins are understood", () => {
  const conf = parseConf([
    "extensions = ('myst_parser',  # the parser",
    "    # \"commented_out\",",
    "    'a' 'b', )",
    "myst_enable_extensions = [\"x#y\", r'z']  # not \"here\"",
  ].join("\n"));
  assert.equal(conf.certain, true);
  assert.deepEqual(conf.extensions, ["myst_parser", "ab"]);
  assert.deepEqual(conf.mystExtensions, ["x#y", "z"]);
});

test("+=, append, extend and later assignments are applied in order", () => {
  const conf = parseConf([
    "extensions = ['myst_parser']",
    "extensions += ['one', 'two']",
    "extensions.append('three')",
    "extensions.extend(['four'])",
    "myst_enable_extensions = ['old']",
    "myst_enable_extensions = ['dollarmath']",
    "myst_enable_extensions += ['deflist']",
    "myst_enable_extensions = myst_enable_extensions + ['x']",
  ].join("\n"));
  assert.deepEqual(conf.extensions, ["myst_parser", "one", "two", "three", "four"]);
  assert.equal(conf.certain, false);
  const reliable = parseConf([
    "myst_enable_extensions = ['old']",
    "myst_enable_extensions = ['dollarmath']",
    "myst_enable_extensions += ['deflist']",
  ].join("\n"));
  assert.deepEqual(reliable.mystExtensions, ["dollarmath", "deflist"]);
  assert.equal(reliable.certain, true);
});

test("a missing myst_enable_extensions is an empty, certain list", () => {
  const conf = parseConf("extensions = ['sphinx.ext.autodoc']\n");
  assert.deepEqual(conf, { extensions: ["sphinx.ext.autodoc"], mystExtensions: [], certain: true });
});

test("anything that is not a plain string list is uncertain", () => {
  const cases = [
    "extensions = base + ['myst_parser']",
    "extensions = ['myst_parser', ext_name]",
    "extensions = [f'{a}']",
    "extensions = ['a' for a in names]",
    "extensions = load()",
    "myst_enable_extensions = get_exts()",
    "myst_enable_extensions = ['a', *others]",
    "if flag:\n    myst_enable_extensions += ['a']",
    "extensions = ['myst_parser']\nextensions.insert(0, 'x')",
    "from shared import *\nextensions = ['myst_parser']",
    "myst_enable_extensions = ['a'",
  ];
  for (const source of cases) {
    assert.equal(parseConf(source).certain, false, source);
  }
});

test("a conf.py without myst_parser keeps the plain lists", () => {
  const conf = parseConf("extensions = ['sphinx.ext.autodoc']\nmyst_enable_extensions = ['deflist']\n");
  assert.equal(conf.extensions.includes("myst_parser"), false);
  assert.deepEqual(conf.mystExtensions, ["deflist"]);
});

test("names in other positions and unrelated code are ignored", () => {
  const conf = parseConf([
    "import os",
    "app.extensions = ['no']",
    "html_context = dict(extensions=['no'])",
    "def setup(app):",
    "    return {'extensions': 1}",
    "extensions = ['myst_parser']",
  ].join("\n"));
  assert.equal(conf.certain, true);
  assert.deepEqual(conf.extensions, ["myst_parser"]);
});
