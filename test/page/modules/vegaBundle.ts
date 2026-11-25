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
import type * as VegaView from "../../../src/page/modules/vegaView";

/** The chart config and loader (`vegaChart.ts`) and the drawing paths (`vegaView.ts`) of the page. */
export type VegaModules = typeof VegaChart & typeof VegaView & {
  sceneTooltips(kind: "vega" | "vega-lite", source: string, theme: VegaChart.ChartTheme, markType: string): Promise<unknown[]>;
};

let loaded: VegaModules | undefined;

export function loadVegaChart(): VegaModules {
  if (loaded) return loaded;
  const root = path.resolve(__dirname, "../../../..");
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "vega-chart-"));
  const outfile = path.join(folder, "vegaChart.cjs");
  const module = (name: string): string => JSON.stringify(path.join(root, "src/page/modules", name).replaceAll("\\", "/"));
  buildSync({
    stdin: {
      contents: `import * as vega from "vega";
import { expressionInterpreter } from "vega-interpreter";
import { chartRuntime as runtimeOf } from ${module("vegaView")};
import { createChartLoader as loaderOf } from ${module("vegaChart")};
export * from ${module("vegaChart")};
export * from ${module("vegaView")};
/** The tooltip of every scene item of the \`markType\` marks of a chart run headless (tests only). */
export async function sceneTooltips(kind, source, theme, markType) {
  const view = new vega.View(runtimeOf(kind, source, theme), { expr: expressionInterpreter, loader: loaderOf({}), renderer: "none", logLevel: vega.Error });
  try {
    await view.runAsync();
    const found = [];
    const walk = (node) => {
      if (node.marktype === markType) for (const item of node.items) found.push(item.tooltip ?? null);
      for (const item of node.items ?? []) if (item.items) for (const child of item.items) walk(child);
    };
    walk(view.scenegraph().root);
    return found;
  } finally {
    view.finalize();
  }
}
`,
      resolveDir: root,
      loader: "ts",
    },
    outfile,
    bundle: true,
    platform: "browser",
    format: "cjs",
    target: "node20",
    logLevel: "silent",
  });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  loaded = require(outfile) as VegaModules;
  return loaded;
}
