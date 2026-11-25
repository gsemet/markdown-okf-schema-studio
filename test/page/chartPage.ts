/**
 * A real preview page with charts, for the tests and the screenshots that need a browser: the
 * document goes through the real render pipeline and `buildPreviewWebviewHtml` (so the page has its
 * Content Security Policy and nonce), the chart runtime is bundled by esbuild as in `esbuild.mjs`,
 * and headless Chromium opens the file. The theme variables are set through the CSSOM, which the
 * policy allows.
 */
import { build } from "esbuild";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium, type Browser, type Page } from "playwright-core";

import { renderPreviewDocument } from "../../src/core/render/renderPipeline";
import { buildPreviewWebviewHtml } from "../../src/session/webview";
import { THEMES } from "../visual/themes";
import { fakeAssetResolver } from "../shared/fakeAssets";
import { createNodeFileSystem } from "../../src/node-services/nodeFileSystem";
import { pageRuntimeScript } from "./runtimeHarness";

const EXTENSION_ROOT = path.resolve(__dirname, "../../..");

export const CHART_DOCUMENT = [
  "# Sales by region",
  "",
  "A Vega-Lite bar chart with inline data:",
  "",
  "```vega-lite",
  JSON.stringify({
    title: "Revenue by region",
    width: 360,
    height: 180,
    data: { values: [
      { region: "North", revenue: 28 }, { region: "South", revenue: 55 }, { region: "East", revenue: 43 }, { region: "West", revenue: 71 },
    ] },
    transform: [{ calculate: "datum.revenue * 1000", as: "dollars" }, { filter: "datum.dollars > 30000" }],
    mark: "bar",
    encoding: {
      x: { field: "region", type: "nominal", sort: "-y", title: "Region" },
      y: { field: "dollars", type: "quantitative", title: "Revenue ($)" },
    },
  }, null, 2),
  "```",
  "",
  "A Vega line chart whose data is a CSV file next to the document:",
  "",
  "```vega",
  JSON.stringify({
    width: 360,
    height: 160,
    padding: 5,
    signals: [{ name: "radius", update: "width / 90" }],
    data: [{ name: "table", url: "data/series.csv", format: { type: "csv" } }],
    scales: [
      { name: "x", type: "point", domain: { data: "table", field: "month" }, range: "width" },
      { name: "y", domain: { data: "table", field: "value" }, nice: true, range: "height" },
    ],
    axes: [{ orient: "bottom", scale: "x", title: "Month" }, { orient: "left", scale: "y", title: "Value" }],
    marks: [
      { type: "line", from: { data: "table" }, encode: { enter: { x: { scale: "x", field: "month" }, y: { scale: "y", field: "value" }, strokeWidth: { value: 2 } } } },
      { type: "symbol", from: { data: "table" }, encode: { enter: { x: { scale: "x", field: "month" }, y: { scale: "y", field: "value" }, size: { signal: "radius * radius * 4" }, tooltip: { signal: "datum" } } } },
    ],
  }, null, 2),
  "```",
  "",
  "A Vega-Lite grouped bar chart with a legend and discrete Quarter labels:",
  "",
  "```vega-lite",
  JSON.stringify({
    title: { text: "Revenue by quarter", subtitle: "Grouped bars, in k$" },
    width: 360,
    height: 160,
    data: { values: [
      { Quarter: "Q1", Product: "Basic", Revenue: 12 }, { Quarter: "Q1", Product: "Plus", Revenue: 18 },
      { Quarter: "Q2", Product: "Basic", Revenue: 15 }, { Quarter: "Q2", Product: "Plus", Revenue: 22 },
      { Quarter: "Q3", Product: "Basic", Revenue: 19 }, { Quarter: "Q3", Product: "Plus", Revenue: 27 },
      { Quarter: "Q4", Product: "Basic", Revenue: 24 }, { Quarter: "Q4", Product: "Plus", Revenue: 33 },
    ] },
    mark: "bar",
    encoding: {
      x: { field: "Quarter", type: "nominal" },
      xOffset: { field: "Product" },
      y: { field: "Revenue", type: "quantitative", title: "Revenue (k$)" },
      color: { field: "Product", type: "nominal", title: "Product line" },
    },
  }, null, 2),
  "```",
  "",
  "A chart with a broken specification:",
  "",
  "```vega-lite",
  '{ "mark": "bar", "data": { "values": [ }',
  "```",
  "",
].join("\n");

export const CHART_DATA = "month,value\nJan,12\nFeb,19\nMar,15\nApr,28\nMay,34\nJun,31\n";

export interface ChartPage {
  readonly browser: Browser;
  readonly page: Page;
  readonly csp: string;
  /** The page as built, before a chart is drawn: the source of a content patch of the same render. */
  readonly html: string;
  /** Violations of the Content Security Policy and error messages the page logged. */
  readonly problems: string[];
  close(): Promise<void>;
}

/** Opens `document` in headless Chromium; undefined when no browser can start (the caller skips). */
export async function openChartPage(
  markdown: string, files: Record<string, string>, themeId: string, mode?: string, options?: { readonly pageRuntime?: boolean; readonly viewport?: { readonly width: number; readonly height: number } },
): Promise<ChartPage | undefined> {
  return openPreviewPage(markdown, files, themeId, mode, "vega", options);
}

/**
 * Opens `document` in headless Chromium with one diagram runtime bundled as the extension bundles
 * it: the Vega chart runtime, or the Mermaid runtime (an ES module with chunks, which Chromium
 * loads from file:// only with file access allowed). Undefined when no browser can start; a setup
 * step that fails after the launch closes the browser and throws. `launched` (tests only) sees the
 * browser once it is launched. `pageRuntime` also bundles the page runtime (`pageRuntimeScript()`) and
 * stubs `acquireVsCodeApi`: the messages the page posts are in `window.__posted`.
 */
export async function openPreviewPage(
  markdown: string, files: Record<string, string>, themeId: string, mode: string | undefined, runtime: "vega" | "mermaid",
  options: {
    readonly launched?: (browser: Browser) => void;
    /** Also serves the page runtime (`out/bundle/preview.js`) and boots it: the zoom, edit, find and morph. */
    readonly pageRuntime?: boolean;
    /** The size of the page viewport (default 900 x 1300): a narrow one scales the charts down. */
    readonly viewport?: { readonly width: number; readonly height: number };
  } = {},
): Promise<ChartPage | undefined> {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "chart-page-")));
  const workspace = path.join(root, "workspace");
  fs.mkdirSync(workspace, { recursive: true });
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(workspace, name)), { recursive: true });
    fs.writeFileSync(path.join(workspace, name), text);
  }
  const documentPath = path.join(workspace, "chart.md");
  fs.writeFileSync(documentPath, markdown);
  const runtimeFile = runtime === "vega" ? "vegaPreview.js" : "mermaidPreview.js";
  await build(runtime === "vega"
    ? {
      entryPoints: [path.join(EXTENSION_ROOT, "src/page/modules/vegaPreview.ts")],
      outfile: path.join(root, "out/bundle/vegaPreview.js"),
      bundle: true,
      platform: "browser",
      target: "es2020",
      format: "iife",
      minify: true,
      logLevel: "silent",
    }
    : {
      entryPoints: [path.join(EXTENSION_ROOT, "src/page/modules/mermaidPreview.ts")],
      outdir: path.join(root, "out/bundle"),
      chunkNames: "mermaid-chunks/[name]-[hash]",
      bundle: true,
      splitting: true,
      platform: "browser",
      target: "es2022",
      format: "esm",
      minify: true,
      logLevel: "silent",
    });
  const rendered = await renderPreviewDocument({
    files: createNodeFileSystem(),
    document: { uri: { scheme: "file", fsPath: documentPath }, languageId: "markdown", version: 1, getText: () => markdown },
    workspaceRoot: workspace,
    requestId: 1,
    isWorkspaceTrusted: () => true,
    plantUmlEngine: "builtin",
  });
  const bundle = fakeAssetResolver({ cspSource: "file:", url: (filePath) => pathToFileURL(filePath).href, extensionRoot: root });
  // Only the diagram runtime is bundled here: the page keeps its inline stylesheet and has no KaTeX.
  const served = options.pageRuntime ? [runtimeFile, "preview.js"] : [runtimeFile];
  if (options.pageRuntime) {
    fs.mkdirSync(path.join(root, "out", "bundle"), { recursive: true });
    fs.writeFileSync(path.join(root, "out", "bundle", "preview.js"), pageRuntimeScript());
  }
  const assets = { ...bundle, bundleUri: (...segments: string[]) => served.includes(segments[0]!) ? bundle.bundleUri(...segments) : undefined };
  const context = options.pageRuntime
    ? {
      activeSourceFile: documentPath, documentId: pathToFileURL(documentPath).toString(), revision: 1, requestId: 1,
      previewThemeMode: "current" as const,
      initialViewPreferences: { zoom: 100, widthMode: "auto" as const, toc: false, incomingChanges: true, comments: true, toolbarCollapsed: false },
    }
    : undefined;
  const built = await buildPreviewWebviewHtml(createNodeFileSystem(),
    rendered.html, workspace, assets, context, workspace, undefined, undefined, true, [], "builtin",
  );
  const pagePath = path.join(root, "page.html");
  fs.writeFileSync(pagePath, built.html);

  let browser: Browser;
  try {
    browser = await chromium.launch(runtime === "mermaid" ? { args: ["--allow-file-access-from-files"] } : {});
  } catch {
    return undefined;
  }
  options.launched?.(browser);
  // A step that fails after the launch closes the browser, or its process keeps the test run alive.
  try {
    const page = await browser.newPage({ viewport: options.viewport ?? { width: 900, height: 1300 }, deviceScaleFactor: 1 });
    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        (window as unknown as { __violations: string[] }).__violations.push(`${event.violatedDirective}: ${event.blockedURI}`);
      });
      (window as unknown as { __violations: string[] }).__violations = [];
    });
    if (options.pageRuntime) {
      await page.addInitScript(() => {
        const posted: unknown[] = [];
        (window as unknown as { __posted: unknown[] }).__posted = posted;
        (window as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi = () => ({
          getState: () => ({}), setState: () => undefined, postMessage: (message: unknown) => { posted.push(message); },
        });
      });
    }
    await page.goto(pathToFileURL(pagePath).href);
    const theme = THEMES.find((candidate) => candidate.id === themeId)!;
    await page.evaluate(({ variables, themeMode }) => {
      if (themeMode) document.documentElement.setAttribute("data-sphinx-preview-theme-mode", themeMode);
      for (const [name, value] of Object.entries(variables)) document.body.style.setProperty(name, value);
    }, { variables: theme.variables, themeMode: mode });
    return {
      browser,
      page,
      html: built.html,
      csp: /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/u.exec(built.html)?.[1] ?? "",
      problems,
      close: async () => { await browser.close(); },
    };
  } catch (error) {
    await browser.close().catch(() => undefined);
    throw error;
  }
}

/** The same document without the chart that fails (the screenshots of the README and the docs). */
export const CHART_SHOWCASE_DOCUMENT = CHART_DOCUMENT.slice(0, CHART_DOCUMENT.indexOf("A chart with a broken specification"));

/** The showcase and a Vega-Lite area chart with a linear gradient fill: what the export test opens. */
export const CHART_EXPORT_DOCUMENT = `${CHART_SHOWCASE_DOCUMENT}A Vega-Lite area chart with a gradient fill:

\`\`\`vega-lite
${JSON.stringify({
  title: "Gradient area",
  width: 360,
  height: 140,
  data: { values: [{ x: 1, y: 3 }, { x: 2, y: 7 }, { x: 3, y: 4 }, { x: 4, y: 9 }] },
  mark: {
    type: "area",
    color: { gradient: "linear", x1: 1, y1: 1, x2: 1, y2: 0, stops: [{ offset: 0, color: "#ffffff" }, { offset: 1, color: "#2f6db5" }] },
  },
  encoding: { x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" } },
}, null, 2)}
\`\`\`
`;
