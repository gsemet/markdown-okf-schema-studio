/**
 * Extension tests entry of every acceptance launch (`acceptanceRunner.ts`): it runs the one
 * acceptance file named by `STUDIO_ACCEPTANCE_FILE`, under the suite watchdog. It runs in the
 * built VSIX window too, so it imports nothing that loads the repository's extension bundle.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import { withSuiteWatchdog } from "./stepWatchdog";

interface AcceptanceModule {
  readonly windowKind?: unknown;
  readonly run?: unknown;
}

export async function run(): Promise<void> {
  const file = process.env.STUDIO_ACCEPTANCE_FILE;
  if (!file) {
    throw new Error("STUDIO_ACCEPTANCE_FILE is not set: this suite is launched by run-tests.js --acceptance-only.");
  }
  if (!fs.existsSync(file)) throw new Error(`STUDIO_ACCEPTANCE_FILE does not exist: ${file}`);
  await withSuiteWatchdog(path.basename(file, ".js"), async () => {
    const loaded = require(file) as AcceptanceModule;
    if (typeof loaded.run !== "function") throw new Error(`${file} exports no run() function.`);
    // The launcher read the kind from the source: the window it started must be the one the file wants.
    if (loaded.windowKind !== process.env.STUDIO_ACCEPTANCE_KIND) {
      throw new Error(`${file} exports windowKind ${JSON.stringify(loaded.windowKind)}, `
        + `but runs in a ${JSON.stringify(process.env.STUDIO_ACCEPTANCE_KIND)} window.`);
    }
    await (loaded.run as () => Promise<void>)();
  });
}
