/**
 * Settings schema (`just generate-settings`, checked by `just check-settings`):
 *
 * The `contributes.configuration` of `package.json` is generated from the settings registry,
 * `src/core/configuration/settingsRegistry.ts` (`contributedConfiguration()`): categories, their
 * order and title, and every field of every setting. Edit the registry, then run
 * `just generate-settings`; never edit that part of `package.json` by hand.
 *
 * Without arguments the script rewrites `package.json`; with `--check` it changes nothing and fails
 * when the file differs from what it would write. The registry is bundled with esbuild in memory
 * (it is TypeScript), so the script needs no compile step.
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packagePath = path.join(root, "package.json");
const registryPath = path.join(root, "src", "core", "configuration", "settingsRegistry.ts");

/** The registry module, bundled to one ES module and imported from memory. */
async function loadRegistry() {
  const result = await build({
    entryPoints: [registryPath],
    bundle: true,
    format: "esm",
    platform: "neutral",
    write: false,
    logLevel: "silent",
  });
  const code = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

/** `package.json` with its `contributes.configuration` replaced by the generated one. */
function withConfiguration(text, configuration) {
  const manifest = JSON.parse(text);
  manifest.contributes.configuration = configuration;
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

const check = process.argv.includes("--check");
const registry = await loadRegistry();
const current = readFileSync(packagePath, "utf8");
const generated = withConfiguration(current, registry.contributedConfiguration());
const settingCount = registry.contributedConfiguration()
  .reduce((count, category) => count + Object.keys(category.properties).length, 0);

if (check) {
  if (generated !== current) {
    console.error(
      "check-settings: FAILED: package.json does not match the settings registry "
      + "(src/core/configuration/settingsRegistry.ts). Run `just generate-settings` and commit the result.",
    );
    process.exit(1);
  }
  console.log(`check-settings: passed (${settingCount} settings)`);
} else if (generated === current) {
  console.log(`generate-settings: package.json is up to date (${settingCount} settings)`);
} else {
  writeFileSync(packagePath, generated, "utf8");
  console.log(`generate-settings: wrote package.json (${settingCount} settings)`);
}
