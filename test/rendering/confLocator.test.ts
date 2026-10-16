import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { createConfLocator } from "../../src/myst/confLocator";

function workspace(): { root: string; docs: string; clean: () => void } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "conf-locator-"));
  const docs = path.join(root, "docs", "chapters");
  fs.mkdirSync(docs, { recursive: true });
  return { root, docs, clean: () => fs.rmSync(root, { recursive: true, force: true }) };
}

const CONF = "extensions = ['myst_parser']\nmyst_enable_extensions = ['deflist']\n";

test("the nearest conf.py wins and the enabled set comes from it", (context) => {
  const { root, docs, clean } = workspace();
  context.after(clean);
  fs.writeFileSync(path.join(root, "conf.py"), "extensions = ['myst_parser']\n");
  fs.writeFileSync(path.join(root, "docs", "conf.py"), CONF);
  const locator = createConfLocator();
  const enabled = locator.enabledMystExtensions(path.join(docs, "a.md"), root);
  assert.deepEqual([...enabled ?? []], ["deflist"]);
});

test("no conf.py, no myst_parser or an uncertain conf.py give no set", (context) => {
  const { root, docs, clean } = workspace();
  context.after(clean);
  const locator = createConfLocator();
  assert.equal(locator.enabledMystExtensions(path.join(docs, "a.md"), root), undefined);
  fs.writeFileSync(path.join(root, "docs", "conf.py"), "extensions = ['sphinx.ext.autodoc']\n");
  locator.invalidate();
  assert.equal(locator.enabledMystExtensions(path.join(docs, "a.md"), root), undefined);
  fs.writeFileSync(path.join(root, "docs", "conf.py"), "extensions = ['myst_parser']\nmyst_enable_extensions = load()\n");
  locator.invalidate();
  assert.equal(locator.enabledMystExtensions(path.join(docs, "a.md"), root), undefined);
});

test("myst_nb counts like myst_parser", (context) => {
  const { root, docs, clean } = workspace();
  context.after(clean);
  fs.writeFileSync(path.join(root, "conf.py"), "extensions = ['myst_nb']\n");
  const enabled = createConfLocator().enabledMystExtensions(path.join(docs, "a.md"), root);
  assert.deepEqual([...enabled ?? []], []);
});

test("a conf.py above the workspace root is not used", (context) => {
  const { root, docs, clean } = workspace();
  context.after(clean);
  fs.writeFileSync(path.join(root, "conf.py"), CONF);
  const inner = path.join(root, "docs");
  assert.equal(createConfLocator().enabledMystExtensions(path.join(docs, "a.md"), inner), undefined);
});

test("typing does not touch the disk: results are cached until the interval or an invalidation", (context) => {
  const { root, docs, clean } = workspace();
  context.after(clean);
  const confPath = path.join(root, "docs", "conf.py");
  fs.writeFileSync(confPath, CONF);
  let now = 1000;
  let reads = 0;
  const locator = createConfLocator({
    now: () => now,
    readFile: (file) => { reads += 1; return fs.readFileSync(file, "utf8"); },
  });
  const document = path.join(docs, "a.md");
  const first = locator.enabledMystExtensions(document, root);
  assert.deepEqual([...first ?? []], ["deflist"]);
  assert.equal(reads, 1);
  // Edit the file: inside the interval the old answer stays, with no read.
  fs.writeFileSync(confPath, "extensions = ['myst_parser']\nmyst_enable_extensions = ['deflist', 'colon_fence']\n");
  now += 100;
  assert.deepEqual([...locator.enabledMystExtensions(document, root) ?? []], ["deflist"]);
  assert.equal(reads, 1);
  // After the interval the size changes, so the file is read again.
  now += 5000;
  assert.deepEqual([...locator.enabledMystExtensions(document, root) ?? []], ["deflist", "colon_fence"]);
  assert.equal(reads, 2);
  // An unchanged file is stat-ed but not parsed again.
  now += 5000;
  locator.enabledMystExtensions(document, root);
  assert.equal(reads, 2);
  // Invalidation drops everything at once.
  fs.rmSync(confPath);
  locator.invalidate();
  assert.equal(locator.enabledMystExtensions(document, root), undefined);
});

test("D29: a single conf.py in a common folder of the root is the fallback", (context) => {
  const { root, clean } = workspace();
  context.after(clean);
  const chapters = path.join(root, "book", "chapters");
  fs.mkdirSync(chapters, { recursive: true });
  fs.mkdirSync(path.join(root, "sphinx"), { recursive: true });
  fs.writeFileSync(path.join(root, "sphinx", "conf.py"), CONF);
  const locator = createConfLocator();
  assert.deepEqual([...locator.enabledMystExtensions(path.join(chapters, "x.md"), root) ?? []], ["deflist"]);
});

test("D29: several fallback candidates mean no conf", (context) => {
  const { root, clean } = workspace();
  context.after(clean);
  const chapters = path.join(root, "book", "chapters");
  fs.mkdirSync(chapters, { recursive: true });
  for (const folder of ["sphinx", "doc"]) {
    fs.mkdirSync(path.join(root, folder), { recursive: true });
    fs.writeFileSync(path.join(root, folder, "conf.py"), CONF);
  }
  assert.equal(createConfLocator().enabledMystExtensions(path.join(chapters, "x.md"), root), undefined);
});

test("D29: an ancestor conf.py wins over a fallback, and invalidation covers the fallback", (context) => {
  const { root, clean } = workspace();
  context.after(clean);
  const chapters = path.join(root, "book", "chapters");
  fs.mkdirSync(chapters, { recursive: true });
  fs.mkdirSync(path.join(root, "sphinx"), { recursive: true });
  fs.writeFileSync(path.join(root, "sphinx", "conf.py"), CONF);
  const locator = createConfLocator();
  const document = path.join(chapters, "x.md");
  assert.deepEqual([...locator.enabledMystExtensions(document, root) ?? []], ["deflist"]);
  fs.writeFileSync(path.join(root, "book", "conf.py"), "extensions = ['myst_parser']\nmyst_enable_extensions = ['dollarmath']\n");
  locator.invalidate();
  assert.deepEqual([...locator.enabledMystExtensions(document, root) ?? []], ["dollarmath"]);
});

test("D29: a document outside the workspace folder does not get the fallback", (context) => {
  const { root, clean } = workspace();
  context.after(clean);
  fs.mkdirSync(path.join(root, "sphinx"), { recursive: true });
  fs.writeFileSync(path.join(root, "sphinx", "conf.py"), CONF);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "conf-outside-"));
  context.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  assert.equal(createConfLocator().enabledMystExtensions(path.join(outside, "x.md"), root), undefined);
});
