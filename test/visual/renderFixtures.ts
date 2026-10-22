/**
 * Builds one standalone HTML page per fixture and theme, then writes the scenario
 * manifest the Playwright driver consumes.
 *
 * The page is assembled from the same renderer, sanitizer and stylesheets the webview
 * uses. Only the VS Code shell is replaced: theme variables are written onto `body` to
 * simulate the editor, and resources resolve to `file:` URLs instead of `vscode-webview:`.
 */

import * as fs from "node:fs";
import { execFileSync } from "node:child_process";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import { listGlobDocuments } from "../../src/render/documentGlob";
import { renderMyst } from "../../src/render/mystRenderer";
import { renderMathHtml } from "../../src/render/mathRenderer";
import { DEFAULT_PREVIEW_CONFIGURATION } from "../../src/configuration/previewConfiguration";
import { PREVIEW_ACCESSIBILITY_CSS, PREVIEW_THEME_CSS } from "../../src/preview/previewStyles";
import {
  renderPreviewStickyHeadings,
  renderPreviewToolbar,
} from "../../src/preview/previewToolbar";
import { analyzeFrontmatter } from "../../src/frontmatter/okfFrontmatter";
import { renderPropertiesTable } from "../../src/frontmatter/propertiesTable";
import { annotateSourceMappings, sourceRangeForLines } from "../../src/mapping/sourceMapping";
import { rewriteSphinxHtml, ResolvedResource } from "../../src/security/html-sanitizer";
import { createScrollSyncScript } from "../../src/webview/scrollSync";
import {
  injectPlantUmlDiagrams,
  renderPlantUmlDiagrams,
} from "../../src/render/plantUmlRenderer";
import {
  createPreviewResourcePolicy,
  resourceReferenceSuffix,
} from "../../src/security/resource-policy";
import { SCENARIOS } from "./scenarios";
import { GROUPS, groupIndex } from "../shared/e2eGroups";
import { THEMES } from "./themes";
import { writeGeneratedFixtures } from "./generatedFixtures";
import { pageFileName, pageKey, type PageIdentity, type ScenarioRenderOptions } from "./renderOptions";
import { DEFAULT_VIEW_PREFERENCES } from "../../src/state/previewViewPreferences";
import { previewContentWidthCss } from "../../src/preview/previewStyles";
import { VISUAL_REPORT_ROOT } from "../reportPaths";

const visualRoot = path.resolve(__dirname, "../../../test/visual");
const fixtureDirectory = path.join(visualRoot, "fixtures");
const outputDirectory = VISUAL_REPORT_ROOT;
const pageDirectory = path.join(outputDirectory, "pages");
const mermaidRendererUri = pathToFileURL(
  path.resolve(__dirname, "../../../out/bundle/mermaidPreview.js"),
).toString();

function themeBlock(variables: Record<string, string>): string {
  const declarations = Object.entries(variables)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
  return `body {\n${declarations}\n}`;
}

function wrap(fragment: string, css: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>preview</title>
<style>${css}</style>
</head>
<body>
${fragment}
</body>
</html>`;
}

async function renderPage(identity: PageIdentity): Promise<string[]> {
  const { fixture, theme: themeId, stickyHeadingDepth, plantumlExpectation } = identity;
  const options: ScenarioRenderOptions = identity.render ?? {};
  const editingEnabled = options.readOnly !== true;
  const theme = THEMES.find((candidate) => candidate.id === themeId);
  if (!theme) {
    throw new Error(`Unknown theme: ${themeId}`);
  }
  const sourcePath = path.join(fixtureDirectory, `${fixture}.md`);
  const documentDirectory = path.dirname(sourcePath);
  const source = fs.readFileSync(sourcePath, "utf8");
  const { html, diagnostics } = await renderMyst(source, {
    sourcePath,
    resolveInclude: (request, from) => {
      const target = path.resolve(path.dirname(from), request);
      if (!target.startsWith(fixtureDirectory + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
        return undefined;
      }
      return { path: target, source: fs.readFileSync(target, "utf8") };
    },
    listDocuments: (pattern, from) => listGlobDocuments(pattern, path.dirname(from), () => true, from),
  });

  const policy = createPreviewResourcePolicy(documentDirectory, visualRoot);
  const resolveResource = (request: string, baseDirectory: string): ResolvedResource | undefined => {
    const resourcePath = policy.resolveResource(request, baseDirectory);
    if (!resourcePath) {
      return undefined;
    }
    return {
      path: resourcePath,
      uri: `${pathToFileURL(resourcePath).toString()}${resourceReferenceSuffix(request)}`,
    };
  };
  const mappedHtml = annotateSourceMappings(html, {
    documentId: pathToFileURL(sourcePath).toString(),
    activeSourceFile: sourcePath,
  });
  const rewritten = rewriteSphinxHtml(wrap(mappedHtml, ""), {
    outputRoot: documentDirectory,
    policy,
    nonce: "visual-test",
    sourceMapping: {
      sourceFile: sourcePath,
      documentId: pathToFileURL(sourcePath).toString(),
    },
    resolveResource,
    resolveNavigation: (request) => ({ kind: "deferred", value: request }),
    ...(options.trusted === false ? { allowExternalScripts: false } : {}),
  });
  const plantUml = await renderPlantUmlDiagrams(rewritten.html, {
    executablePath: fixture === "13-plantuml-executable-not-found"
      ? "plantuml-screenshot-executable-not-found"
      : plantumlExpectation === "unconfigured" ? "plantuml-visual-intentionally-unconfigured"
      : undefined,
    workspaceRoot: visualRoot,
    trusted: options.trusted !== false,
  });
  const withPlantUml = injectPlantUmlDiagrams(rewritten.html, plantUml.diagrams);
  // Mirror the real webview: strip the raw YAML block and inject the same
  // properties table buildPreviewWebviewHtml would produce.
  const deferredFrontmatterLinks = SCENARIOS.some((scenario) =>
    scenario.fixture === fixture && scenario.frontmatterLinkState !== undefined);
  const frontmatter = analyzeFrontmatter({
    sourceText: source,
    filePath: sourcePath,
    strictAdditionalProperties: options.strictAdditionalProperties === true,
    inspectLinks: !deferredFrontmatterLinks,
  });
  const sourceMapping = {
    documentId: pathToFileURL(sourcePath).toString(),
    activeSourceFile: sourcePath,
  };
  const tableEnabled = options.propertiesTable !== false;
  const markup = renderPropertiesTable(frontmatter, tableEnabled, sourceMapping, editingEnabled);
  const deferredMarkup = deferredFrontmatterLinks
    ? renderPropertiesTable(analyzeFrontmatter({
      sourceText: source,
      filePath: sourcePath,
      strictAdditionalProperties: options.strictAdditionalProperties === true,
      inspectLinks: true,
    }), tableEnabled, sourceMapping, editingEnabled)
    : "";
  const withPlantUmlAndTable = markup
    ? withPlantUml.replace(
      /<main\s+id="sphinx-myst-preview-content"[^>]*>/u,
      (opening) => `${opening}${markup}`,
    )
    : withPlantUml;
  // The host reports a successful render even for an empty file; the runtime offers "Start writing" only then.
  const withStatus = source.trim() === ""
    ? withPlantUmlAndTable.replace(
      /(<body(?:\s[^>]*)?>)/iu,
      (opening) => `${opening}<aside data-sphinx-preview-status="success" hidden></aside>`,
    )
    : withPlantUmlAndTable;
  const withToolbar = withStatus.replace(
    /(<body(?:\s[^>]*)?>)/iu,
    (opening) => `${opening}${renderPreviewToolbar(editingEnabled)}${renderPreviewStickyHeadings()}`,
  );
  const runtimeContext = {
    activeSourceFile: sourcePath,
    documentId: pathToFileURL(sourcePath).toString(),
    documentVersion: 1,
    requestId: 1,
    stickyHeadingDepth,
    ...(options.paletteMode === undefined ? {} : { initialPaletteMode: options.paletteMode }),
    ...(options.zoom === undefined && options.incomingChanges === undefined ? {} : {
      initialViewPreferences: {
        ...DEFAULT_VIEW_PREFERENCES,
        ...(options.zoom === undefined ? {} : { zoom: options.zoom }),
        ...(options.incomingChanges === undefined ? {} : { incomingChanges: options.incomingChanges }),
      },
    }),
    ...(options.markEditorSelection === true ? { markEditorSelection: true } : {}),
  };
  const serializedSource = JSON.stringify(source).replace(/</gu, "\\u003c");
  const visualHostScript = `<script>
const visualSource = ${serializedSource};
const sourceRangeForLines = (${sourceRangeForLines.toString()});
window.visualMessages = [];
window.acquireVsCodeApi = () => ({
  getState: () => ({}),
  setState: () => {},
  postMessage: (message) => {
    window.visualMessages.push(message);
    if (message.type !== "previewEditOpen") return;
    // An insertion opens an empty editor, like the host reply for \`insertAfterLine\`.
    const range = message.insertAfterLine !== undefined
      ? undefined
      : sourceRangeForLines(visualSource, Number(message.line), Number(message.endLine));
    window.dispatchEvent(new MessageEvent("message", { data: {
      ...message,
      type: "previewEditSource",
      originalText: range ? visualSource.slice(range.start, range.end) : "",
    } }));
  },
});
</script>`;
  const hostMessageScript = options.hostMessages === undefined || options.hostMessages.length === 0
    ? ""
    : `<script>
const hostContext = ${JSON.stringify({
      documentId: runtimeContext.documentId,
      documentVersion: runtimeContext.documentVersion,
      requestId: runtimeContext.requestId,
    })};
for (const entry of ${JSON.stringify(options.hostMessages).replace(/</gu, "\\u003c")}) {
  setTimeout(() => window.dispatchEvent(new MessageEvent("message", { data: { ...hostContext, ...entry.data } })), entry.delayMs ?? 0);
}
</script>`;
  const deferredLinkScript = deferredFrontmatterLinks
    ? `<script>
const deferredPropertiesMarkup = ${JSON.stringify(deferredMarkup).replace(/</gu, "\\u003c")};
window.visualFrontmatterLinksState = "loading";
window.resolveVisualFrontmatterLinks = () => {
  const current = document.querySelector("[data-okf-properties]");
  const template = document.createElement("template");
  template.innerHTML = deferredPropertiesMarkup;
  const replacement = template.content.firstElementChild;
  if (current && replacement) current.replaceWith(replacement);
  window.visualFrontmatterLinksState = "loaded";
  window.dispatchEvent(new Event("visual-frontmatter-links-loaded"));
};
</script>`
    : "";
  const withScrollRuntime = withToolbar.replace(
    /<\/body>/iu,
    () => `${deferredLinkScript}${visualHostScript}<script>${createScrollSyncScript(runtimeContext)}</script>${hostMessageScript}</body>`,
  );

  const css = [
    themeBlock(theme.variables),
    PREVIEW_ACCESSIBILITY_CSS,
    PREVIEW_THEME_CSS,
    ...(options.maxContentWidth === undefined ? [] : [previewContentWidthCss(options.maxContentWidth)]),
  ].join("\n");
  let page = withScrollRuntime.replace(/<\/head>/iu, `<style>${css}</style></head>`);
  page = renderMathHtml(page, pathToFileURL(
    path.resolve(__dirname, "../../../out/bundle/katex/katex.min.css"),
  ).toString(), "visual-math");
  if (page.includes('class="myst-mermaid-figure"')) {
    page = page.replace(
      /<\/body>/iu,
      `<script src="${mermaidRendererUri}" defer></script></body>`,
    );
  }
  fs.writeFileSync(
    path.join(pageDirectory, pageFileName(identity)),
    page,
    "utf8",
  );

  return diagnostics.map((diagnostic) => `${fixture}:${diagnostic.line ?? "?"} ${diagnostic.message}`);
}

function scenarioPage(scenario: (typeof SCENARIOS)[number]): PageIdentity {
  return {
    fixture: scenario.fixture,
    theme: scenario.theme,
    stickyHeadingDepth: scenario.stickyHeadingDepth ?? DEFAULT_PREVIEW_CONFIGURATION.stickyHeadingDepth,
    ...(scenario.plantumlExpectation === undefined ? {} : { plantumlExpectation: scenario.plantumlExpectation }),
    ...(scenario.render === undefined ? {} : { render: scenario.render }),
  };
}

async function main(): Promise<void> {
  fs.rmSync(pageDirectory, { recursive: true, force: true });
  fs.mkdirSync(pageDirectory, { recursive: true });
  writeGeneratedFixtures(fixtureDirectory);

  const pages = new Map<string, PageIdentity>();
  for (const scenario of SCENARIOS) {
    const identity = scenarioPage(scenario);
    pages.set(pageKey(identity), identity);
  }
  const notes: string[] = [];
  for (const identity of pages.values()) {
    notes.push(...await renderPage(identity));
  }

  const manifest = {
    runId: process.env.STUDIO_E2E_RUN_ID ?? null,
    campaignStartedAt: process.env.STUDIO_E2E_STARTED_AT ?? null,
    campaignCommand: process.env.STUDIO_E2E_COMMAND ?? null,
    startedAt: new Date().toISOString(),
    revision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    worktreeStatus: execFileSync("git", ["status", "--short"], { encoding: "utf8" }).trim(),
    sourceCommand: "npm run visual:render",
    limitations: "Static generated HTML with mock VS Code host; save messages do not rerender the document. Native browser popups are not captured.",
    diagnostics: [...new Set(notes)],
    completedAt: new Date().toISOString(),
    pageDirectory,
    groups: GROUPS,
    // Group order, then declaration order in scenarios.ts (the sort is stable).
    scenarios: [...SCENARIOS].sort((first, second) =>
      groupIndex(first.group) - groupIndex(second.group)
    ).map((scenario, index) => ({
      ...scenario,
      sequence: index + 1,
      page: pageFileName(scenarioPage(scenario)),
      themeLabel: THEMES.find((theme) => theme.id === scenario.theme)?.label ?? scenario.theme,
    })),
  };
  fs.writeFileSync(
    path.join(outputDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log(`rendered ${pages.size} pages, ${SCENARIOS.length} scenarios`);
  for (const note of [...new Set(notes)]) {
    console.log(`  placeholder: ${note}`);
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
