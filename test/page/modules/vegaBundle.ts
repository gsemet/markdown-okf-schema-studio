/**
 * Loads the chart module for a test. Vega ships as ES modules with top-level await, which the
 * CommonJS test build cannot `require`, so the module is bundled for Node once, as the extension
 * bundles it for the page (esbuild), and the bundle is loaded from a temporary folder.
 */
import { buildSync } from "esbuild";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type * as VegaChart from "../../../src/page/modules/vegaChart";

let loaded: typeof VegaChart | undefined;

export function loadVegaChart(): typeof VegaChart {
  if (loaded) return loaded;
  const root = path.resolve(__dirname, "../../../..");
  const outfile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "vega-chart-")), "vegaChart.cjs");
  buildSync({
    entryPoints: [path.join(root, "src/page/modules/vegaChart.ts")],
    outfile,
    bundle: true,
    platform: "browser",
    format: "cjs",
    target: "node20",
    logLevel: "silent",
  });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  loaded = require(outfile) as typeof VegaChart;
  return loaded;
}
