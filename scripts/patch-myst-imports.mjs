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