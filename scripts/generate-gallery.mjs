import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const extensionRoot = process.cwd();
const helper = path.join(extensionRoot, "out", "test", "site", "curateGallery.js");
if (!fs.existsSync(helper)) {
  console.error("Gallery generator is not compiled. Run `npm run compile` first.");
  process.exitCode = 1;
} else {
  const result = spawnSync(process.execPath, [helper], {
    cwd: extensionRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error(result.error);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}
