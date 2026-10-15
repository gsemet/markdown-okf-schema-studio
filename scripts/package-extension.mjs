import { mkdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const repository = manifest.repository.url.replace(/\.git$/, "");
const ref = `v${manifest.version}`;
mkdirSync("out/reports/package", { recursive: true });
const result = spawnSync(process.execPath, [
  "node_modules/@vscode/vsce/vsce",
  "package",
  "--out", "out/reports/package/markdown-okf-schema-studio.vsix",
  "--skip-license",
  "--baseContentUrl", `${repository}/blob/${ref}/`,
  "--baseImagesUrl", `${repository.replace("https://github.com/", "https://media.githubusercontent.com/media/")}/${ref}/`,
], { stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;