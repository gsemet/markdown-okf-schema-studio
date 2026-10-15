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
import { SCENARIOS, scenarioGroup } from "./scenarios";
import { THEMES } from "./themes";
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

async function renderPage(
  fixture: string,
  themeId: string,
  stickyHeadingDepth: number,
  plantumlExpectation?: string,
): Promise<string[]> {
  const theme = THEMES.find((candidate) => candidate.id === themeId);
  if (!theme) {
    throw new Error(`Unknown theme: ${themeId}`);
  }
  const sourcePath = path.join(fixtureDirectory, `${fixture}.md`);
  const documentDirectory = path.dirname(sourcePath);
  const source = fs.readFileSync(sourcePath, "utf8");
  const { html, diagnostics } = await renderMyst(source);

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
  });
  const plantUml = await renderPlantUmlDiagrams(rewritten.html, {
    executablePath: fixture === "13-plantuml-executable-not-found"
      ? "plantuml-screenshot-executable-not-found"
      : plantumlExpectation === "unconfigured" ? "plantuml-visual-intentionally-unconfigured"
      : undefined,
    workspaceRoot: visualRoot,
    trusted: true,
  });
  const withPlantUml = injectPlantUmlDiagrams(rewritten.html, plantUml.diagrams);
  // Mirror the real webview: strip the raw YAML block and inject the same
  // properties table buildPreviewWebviewHtml would produce.
  const deferredFrontmatterLinks = SCENARIOS.some((scenario) =>
    scenario.fixture === fixture && scenario.frontmatterLinkState !== undefined);
  const frontmatter = analyzeFrontmatter({
    sourceText: source,
    filePath: sourcePath,
    strictAdditionalProperties: false,
    inspectLinks: !deferredFrontmatterLinks,
  });
  const sourceMapping = {
    documentId: pathToFileURL(sourcePath).toString(),
    activeSourceFile: sourcePath,
  };
  const markup = renderPropertiesTable(frontmatter, true, sourceMapping);
  const deferredMarkup = deferredFrontmatterLinks
    ? renderPropertiesTable(analyzeFrontmatter({
      sourceText: source,
      filePath: sourcePath,
      strictAdditionalProperties: false,
      inspectLinks: true,
    }), true, sourceMapping)
    : "";
  const withPlantUmlAndTable = markup
    ? withPlantUml.replace(
      /<main\s+id="sphinx-myst-preview-content"[^>]*>/u,
      (opening) => `${opening}${markup}`,
    )
    : withPlantUml;
  const withToolbar = withPlantUmlAndTable.replace(
    /(<body(?:\s[^>]*)?>)/iu,
    (opening) => `${opening}${renderPreviewToolbar()}${renderPreviewStickyHeadings()}`,
  );
  const runtimeContext = {
    activeSourceFile: sourcePath,
    documentId: pathToFileURL(sourcePath).toString(),
    documentVersion: 1,
    requestId: 1,
    stickyHeadingDepth,
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
    () => `${deferredLinkScript}${visualHostScript}<script>${createScrollSyncScript(runtimeContext)}</script></body>`,
  );

  const css = [themeBlock(theme.variables), PREVIEW_ACCESSIBILITY_CSS, PREVIEW_THEME_CSS].join("\n");
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
    path.join(pageDirectory, `${fixture}--${themeId}--sticky-${stickyHeadingDepth}--${plantumlExpectation ?? "default"}.html`),
    page,
    "utf8",
  );

  return diagnostics.map((diagnostic) => `${fixture}:${diagnostic.line ?? "?"} ${diagnostic.message}`);
}

async function main(): Promise<void> {
  fs.rmSync(pageDirectory, { recursive: true, force: true });
  fs.mkdirSync(pageDirectory, { recursive: true });

  const pages = new Set(SCENARIOS.map((scenario) => [
    scenario.fixture,
    scenario.theme,
    scenario.stickyHeadingDepth ?? DEFAULT_PREVIEW_CONFIGURATION.stickyHeadingDepth,
    scenario.plantumlExpectation ?? "default",
  ].join("\u0000")));
  const notes: string[] = [];
  for (const page of pages) {
    const [fixture, theme, stickyHeadingDepth, plantumlExpectation] = page.split("\u0000");
    notes.push(...await renderPage(fixture!, theme!, Number(stickyHeadingDepth), plantumlExpectation));
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
    scenarios: [...SCENARIOS].sort((first, second) =>
      scenarioGroup(first).localeCompare(scenarioGroup(second))
      || first.fixture.localeCompare(second.fixture)
      || (first.previewThemeMode ?? first.theme).localeCompare(second.previewThemeMode ?? second.theme)
      || first.width - second.width
      || first.height - second.height
    ).map((scenario, index) => ({
      ...scenario,
      sequence: index + 1,
      group: scenarioGroup(scenario),
      page: `${scenario.fixture}--${scenario.theme}--sticky-${scenario.stickyHeadingDepth ?? DEFAULT_PREVIEW_CONFIGURATION.stickyHeadingDepth}--${scenario.plantumlExpectation ?? "default"}.html`,
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
