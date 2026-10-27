import { readFile, writeFile } from "node:fs/promises";

const packages = [
  ["markdown-it-dollarmath", "0.5.0", "dist/index.js"],
  ["myst-to-html", "1.7.4", "dist/utils.js"],
];

for (const [name, version, filename] of packages) {
  const directory = new URL(`../node_modules/${name}/`, import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("package.json", directory), "utf8"));
  const target = new URL(filename, directory);
  const source = await readFile(target, "utf8");
  const original = "markdown-it/lib/common/utils.js";
  const corrected = "markdown-it/lib/common/utils.mjs";
  if (manifest.version !== version || (!source.includes(original) && !source.includes(corrected))) {
    throw new Error(`Review the Markdown-It compatibility patch for ${name}@${manifest.version}`);
  }
  if (source.includes(original)) {
    await writeFile(target, source.replace(original, corrected));
  }
}

// markdown-it-myst 1.0.18 splits the whole source into lines for every directive fence to find out
// whether blank lines surround it, which makes a parse O(directives x size). The patch splits the
// source once per parse state and reuses the lines for every fence of that parse.
{
  const directory = new URL("../node_modules/markdown-it-myst/", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("package.json", directory), "utf8"));
  const target = new URL("dist/directives.js", directory);
  const source = await readFile(target, "utf8");
  const patchedMarker = "const blockLinesByState = new WeakMap();";
  const originalHead = "function computeBlockTightness(src, map) {\n    const lines = src.split('\\n');\n";
  const patchedHead = [
    "const blockLinesByState = new WeakMap();",
    "function computeBlockTightness(state, map) {",
    "    let cached = blockLinesByState.get(state);",
    "    if (!cached || cached.src !== state.src) {",
    "        cached = { src: state.src, lines: state.src.split('\\n') };",
    "        blockLinesByState.set(state, cached);",
    "    }",
    "    const lines = cached.lines;",
    "",
  ].join("\n");
  const originalCall = "tight: computeBlockTightness(state.src, token.map),";
  const patchedCall = "tight: computeBlockTightness(state, token.map),";
  if (manifest.version !== "1.0.18") {
    throw new Error(`Review the directive tightness patch for markdown-it-myst@${manifest.version}`);
  }
  if (source.includes(originalHead) && source.includes(originalCall)) {
    await writeFile(target, source.replace(originalHead, patchedHead).replace(originalCall, patchedCall));
  } else if (!source.includes(patchedMarker)) {
    throw new Error("Review the directive tightness patch for markdown-it-myst@1.0.18");
  }
}
