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

import { listGlobDocuments } from "../../src/core/render/documentGlob";
import { renderMyst } from "../../src/core/render/mystRenderer";
import { renderMathHtml } from "../../src/core/render/mathRenderer";
import { DEFAULT_PREVIEW_CONFIGURATION } from "../../src/core/configuration/previewConfiguration";
import { PREVIEW_ACCESSIBILITY_CSS, PREVIEW_THEME_CSS } from "../../src/core/preview/previewStyles";
import { setPreviewStatus } from "../../src/core/preview/previewStatus";
import {
  renderPreviewStickyHeadings,
  renderPreviewToolbar,
} from "../../src/core/preview/previewToolbar";
import { analyzeFrontmatter } from "../../src/core/frontmatter/okfFrontmatter";
import { nodeSchemaFiles } from "../../src/node-services/schemaFiles";
import { renderPropertiesTable } from "../../src/core/frontmatter/propertiesTable";
import { sourceRangeForLines } from "../../src/core/mapping/sourceMapping";
import { rewriteSphinxHtml, ResolvedResource } from "../../src/core/security/html-sanitizer";
import { RUNTIME_CONTEXT_ATTRIBUTE, serializeRuntimeContext } from "../../src/core/protocol/bootContext";
import {
  injectPlantUmlDiagrams,
  renderPlantUmlDiagrams,
} from "../../src/core/render/plantUmlRenderer";
import {
  createPreviewResourcePolicy,
  resourceReferenceSuffix,
} from "../../src/core/security/resource-policy";
import { SCENARIOS } from "./scenarios";
import { CAPTURES } from "../shared/captureRegistry";
import { GROUPS, groupIndex } from "../shared/e2eGroups";
import { THEMES } from "./themes";
import { writeGeneratedFixtures } from "./generatedFixtures";
import { PINNED_WORKSPACE_CHOICES, pageFileName, pageKey, type PageIdentity, type ScenarioRenderOptions } from "./renderOptions";
import { DEFAULT_VIEW_PREFERENCES } from "../../src/core/state/previewViewPreferences";
import { DEFAULT_EDITING_CONFIGURATION } from "../../src/core/configuration/editingConfiguration";
import { previewContentWidthCss } from "../../src/core/preview/previewStyles";
import { VISUAL_REPORT_ROOT } from "../reportPaths";

const visualRoot = path.resolve(__dirname, "../../../test/visual");
const fixtureDirectory = path.join(visualRoot, "fixtures");
const outputDirectory = VISUAL_REPORT_ROOT;
const pageDirectory = path.join(outputDirectory, "pages");
const mermaidRendererUri = pathToFileURL(
  path.resolve(__dirname, "../../../out/bundle/mermaidPreview.js"),
).toString();
const runtimeUri = pathToFileURL(
  path.resolve(__dirname, "../../../out/bundle/preview.js"),
).toString();
const plantUmlRendererUri = pathToFileURL(
  path.resolve(__dirname, "../../../out/bundle/plantumlPreview.js"),
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

/** The diagram files of the visual fixtures by absolute path (the ids the host would give). */
function plantUmlFixtureFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else if (entry.name.endsWith(".puml")) {
        files[entryPath.split(path.sep).join("/")] = fs.readFileSync(entryPath, "utf8");
      }
    }
  };
  visit(path.join(fixtureDirectory, "plantuml"));
  return files;
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
    ...(options.mystExtensions === undefined ? {} : { enabledMystExtensions: new Set(options.mystExtensions) }),
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
  const rewritten = rewriteSphinxHtml(wrap(html, ""), {
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
  // The built-in engine (the default) draws in the page; the JAR/PATH pipeline (useJar) in the host.
  const builtinPlantUml = plantumlExpectation === "builtin" || plantumlExpectation === "builtin-unsupported";
  const plantUml = builtinPlantUml ? { diagrams: [] } : await renderPlantUmlDiagrams(rewritten.html, {
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
    schemaFiles: nodeSchemaFiles,
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
      schemaFiles: nodeSchemaFiles,
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
  // With a conf.py (CR 050), the status region the host writes, with the conf.py warnings.
  const withStatus = source.trim() === ""
    ? withPlantUmlAndTable.replace(
      /(<body(?:\s[^>]*)?>)/iu,
      (opening) => `${opening}<aside data-sphinx-preview-status="success" hidden></aside>`,
    )
    : options.mystExtensions !== undefined
      ? setPreviewStatus(withPlantUmlAndTable, "success", undefined, diagnostics.map((diagnostic) => ({
        ...diagnostic,
        code: diagnostic.code === "myst-extension" ? diagnostic.code : "myst-diagnostic",
        file: sourcePath,
      })))
      : withPlantUmlAndTable;
  const withToolbar = withStatus.replace(
    /(<body(?:\s[^>]*)?>)/iu,
    (opening) => `${opening}${renderPreviewToolbar(editingEnabled)}${renderPreviewStickyHeadings()}`,
  );
  // Like the real host: a stored theme mode is sent only when there is one, the view preferences
  // and the palette mode always are (the built-in defaults when nothing is stored).
  const stored = options.freshWorkspace === true ? undefined : PINNED_WORKSPACE_CHOICES;
  const runtimeContext = {
    activeSourceFile: sourcePath,
    documentId: pathToFileURL(sourcePath).toString(),
    revision: 1,
    requestId: 1,
    stickyHeadingDepth,
    ...(stored === undefined ? {} : { previewThemeMode: stored.previewThemeMode }),
    initialPaletteMode: options.paletteMode ?? stored?.paletteMode ?? DEFAULT_EDITING_CONFIGURATION.defaultPaletteMode,
    initialViewPreferences: {
      ...DEFAULT_VIEW_PREFERENCES,
      ...(stored === undefined ? {} : { toolbarCollapsed: stored.toolbarCollapsed }),
      ...(options.zoom === undefined ? {} : { zoom: options.zoom }),
      ...(options.incomingChanges === undefined ? {} : { incomingChanges: options.incomingChanges }),
    },
    ...(options.markEditorSelection === true ? { markEditorSelection: true } : {}),
    ...(options.commentsEnabled === true ? { commentsEnabled: true } : {}),
    ...(options.codeBlocksDarkBackground === false ? { "codeBlocks.darkBackground": false } : {}),
    ...(options.codeBlocksLineNumbers === false ? { "codeBlocks.lineNumbers": false } : {}),
    ...(options.trusted === false ? { warningsInProblems: false } : {}),
  };
  const serializedSource = JSON.stringify(source).replace(/</gu, "\\u003c");
  // The host side of local PlantUML `!include` files for the built-in engine: the files of
  // fixtures/plantuml, answered asynchronously like the real host (which also applies the
  // resource policy; that is covered by the unit tests).
  const plantUmlFiles = builtinPlantUml ? plantUmlFixtureFiles() : {};
  const serializedPlantUmlFiles = JSON.stringify(plantUmlFiles).replace(/</gu, "\\u003c");
  const visualHostScript = `<script>
const visualSource = ${serializedSource};
const visualPlantUmlFiles = ${serializedPlantUmlFiles};
const sourceRangeForLines = (${sourceRangeForLines.toString()});
window.visualMessages = [];
// VS Code binds undo, redo, select all and delete line; the page cancels those keys in a text box
// and applies the command the host answers with (CR 119). This stands in for that host.
document.addEventListener("keydown", (event) => {
  if (!event.defaultPrevented || !(event.metaKey || event.ctrlKey) || event.altKey) return;
  const key = String(event.key).toLowerCase();
  const command = key === "z" ? (event.shiftKey ? "redo" : "undo")
    : key === "y" && !event.shiftKey ? "redo"
    : key === "a" && !event.shiftKey ? "selectAll"
    : key === "k" && event.shiftKey ? "deleteLine" : undefined;
  if (!command) return;
  const root = document.documentElement;
  // Synchronous: the checks press undo twice in a row without waiting for a host answer.
  window.dispatchEvent(new MessageEvent("message", { data: {
    type: "previewEditCommand", command,
    documentId: root.getAttribute("data-sphinx-preview-document-id"),
    revision: Number(root.getAttribute("data-sphinx-preview-document-version")),
    requestId: Number(root.getAttribute("data-sphinx-preview-request-id")),
  } }));
});
window.acquireVsCodeApi = () => ({
  getState: () => ({}),
  setState: () => {},
  postMessage: (message) => {
    window.visualMessages.push(message);
    if (message.type === "previewPlantUmlInclude") {
      const base = message.from === null ? ${JSON.stringify(documentDirectory)} : message.from.slice(0, message.from.lastIndexOf("/"));
      const segments = [];
      for (const segment of (base + "/" + message.path).split("/")) {
        if (segment === "..") segments.pop();
        else if (segment !== "." && segment !== "") segments.push(segment);
      }
      const id = "/" + segments.join("/");
      const text = visualPlantUmlFiles[id];
      setTimeout(() => window.dispatchEvent(new MessageEvent("message", { data: {
        type: "previewPlantUmlIncludeResult",
        documentId: message.documentId,
        revision: message.revision,
        requestId: message.requestId,
        editId: message.editId,
        ...(text === undefined ? { ok: false, reason: "PlantUML file not found: " + message.path + "." } : { ok: true, id, text }),
      } })), 0);
      return;
    }
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
      revision: runtimeContext.revision,
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
    () => `${deferredLinkScript}${visualHostScript}<script type="application/json" ${RUNTIME_CONTEXT_ATTRIBUTE}>${serializeRuntimeContext(runtimeContext)}</script><script src="${runtimeUri}"></script>${hostMessageScript}</body>`,
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
  if (builtinPlantUml && page.includes('class="myst-plantuml-figure"')) {
    page = page.replace(
      /<\/body>/iu,
      `<script src="${plantUmlRendererUri}" defer></script></body>`,
    );
  }
  if (page.includes('class="myst-mermaid-figure"')) {
    page = page.replace(
      /<\/body>/iu,
      `<script type="module" src="${mermaidRendererUri}"></script></body>`,
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
    // The real-window capture registry: README sources and ids for the Python scripts.
    realCaptures: CAPTURES,
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
