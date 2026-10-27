import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { build, type BuildOptions, type Metafile } from "esbuild";

const root = path.resolve(__dirname, "../../..");
const bundles = require(path.join(root, "scripts", "page-bundle.mjs")) as {
  extensionBundleOptions(options?: { minify?: boolean }): BuildOptions;
  lazyModuleOptions(options: { katexEntry: string; minify?: boolean }): BuildOptions;
  mermaidBundleOptions(options?: { minify?: boolean }): BuildOptions;
};
const katexEntry = createRequire(path.join(root, "package.json")).resolve("katex");

/** Bytes each package contributes to one output of a metafile. */
function packageBytes(output: Metafile["outputs"][string]): Map<string, number> {
  const sizes = new Map<string, number>();
  for (const [input, detail] of Object.entries(output.inputs)) {
    const packages = [...input.matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)/gu)];
    const name = packages.at(-1)?.[1] ?? "(own src)";
    sizes.set(name, (sizes.get(name) ?? 0) + detail.bytesInOutput);
  }
  return sizes;
}

async function metafileOf(options: BuildOptions): Promise<Metafile> {
  const result = await build({
    ...options,
    absWorkingDir: root,
    outdir: options.outfile ? undefined : "out/unused",
    outfile: options.outfile ? "out/unused/extension.js" : undefined,
    write: false,
    metafile: true,
    sourcemap: false,
    logLevel: "silent",
  });
  return result.metafile;
}

// @tests_req SwRS-MDOKFSTUDIO-CODE-001
// @tests_req SwRS-MDOKFSTUDIO-MYST-024
test("the extension bundle leaves Shiki, KaTeX and js-yaml out and loads the first two from lazy files", async () => {
  const meta = await metafileOf(bundles.extensionBundleOptions());
  const [file, output] = Object.entries(meta.outputs)[0];
  const sizes = packageBytes(output);
  assert.equal(sizes.has("@shikijs/langs"), false, "grammars are not in extension.js");
  assert.equal(sizes.has("katex"), false, "KaTeX is not in extension.js");
  assert.equal(sizes.has("js-yaml"), false, "one YAML library: js-yaml is not in extension.js");
  assert.ok((sizes.get("yaml") ?? 0) > 0, "the yaml library stays");
  assert.ok(output.bytes < 2 * 1024 * 1024, `extension.js is ${output.bytes} bytes, expected under 2 MiB (${file})`);

  const lazy = await metafileOf(bundles.lazyModuleOptions({ katexEntry }));
  const lazyNames = Object.keys(lazy.outputs).map((name) => name.split("/").slice(-2).join("/")).sort();
  assert.deepEqual(lazyNames, ["lazy/highlight.js", "lazy/katex.js"]);
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-001
test("the Mermaid renderer is an ES module whose entry is small and whose diagram types are chunks", async () => {
  const meta = await metafileOf(bundles.mermaidBundleOptions());
  const entries = Object.entries(meta.outputs).filter(([name]) => name.endsWith("/mermaidPreview.js"));
  assert.equal(entries.length, 1);
  assert.ok(entries[0][1].bytes < 200 * 1024, `the entry is ${entries[0][1].bytes} bytes`);
  const chunks = Object.keys(meta.outputs).filter((name) => name.includes("mermaid-chunks/"));
  assert.ok(chunks.length > 10, `${chunks.length} chunks`);
  const total = Object.values(meta.outputs).reduce((sum, output) => sum + output.bytes, 0);
  assert.ok(total > 1024 * 1024, "the whole of Mermaid is still shipped");
});

// @tests_req SwRS-MDOKFSTUDIO-CODE-001
// @tests_req SwRS-MDOKFSTUDIO-MYST-024
test("the split bundle still highlights code, typesets maths and reads YAML directive options", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "studio-split-"));
  try {
    const options = bundles.extensionBundleOptions({ minify: false });
    await build({
      ...options,
      entryPoints: undefined,
      stdin: {
        contents: 'export { renderMyst } from "./src/core/render/mystRenderer";\n'
          + 'export { renderMathHtml } from "./src/core/render/mathRenderer";\n',
        resolveDir: root,
        loader: "ts",
      },
      absWorkingDir: root,
      outfile: path.join(directory, "bundle.js"),
      sourcemap: false,
      logLevel: "silent",
    });
    await build({
      ...bundles.lazyModuleOptions({ katexEntry, minify: false }),
      absWorkingDir: root,
      outdir: directory,
      sourcemap: false,
      logLevel: "silent",
    });
    const loaded = require(path.join(directory, "bundle.js")) as {
      renderMyst(source: string): Promise<{ html: string }>;
      renderMathHtml(html: string, stylesheetUri: string, nonce: string): string;
    };
    const rendered = await loaded.renderMyst(
      "```{code-block} python\n---\nemphasize-lines: 1\n---\nx = 1\n```\n\nEuler $e^{i\\pi}+1=0$\n",
    );
    assert.match(rendered.html, /class="shiki/u, "the code block is highlighted by the lazy Shiki");
    assert.match(rendered.html, /data-myst-emphasize-lines="1"/u, "the YAML option is read by yaml");
    const withMath = loaded.renderMathHtml(`<html><head></head><body>${rendered.html}</body></html>`, "katex.css", "n");
    assert.match(withMath, /class="katex"/u, "the equation is typeset by the lazy KaTeX");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
