/**
 * The built-in PlantUML engine of the preview page (bundled by esbuild into
 * `out/bundle/plantumlPreview.js`, like Mermaid). The host loads this script only when PlantUML
 * uses the built-in engine (`markdownOkfSchemaStudio.plantuml.useJar` off).
 *
 * The engine runs with the page's Content Security Policy unchanged: it is a plain script from
 * the extension, uses no eval, no worker and no WebAssembly (Graphviz `viz-global.js` is not
 * bundled; layouts use PlantUML's own Smetana engine), and `connect-src 'none'` stays.
 *
 * Local `!include` files are asked of the host through the page script, which owns the VS Code
 * API: this script dispatches `studio:plantuml-file-request` with the request and a `respond`
 * callback (see `plantumlFileRequests.ts`), and draws again on `studio:plantuml-includes-changed`.
 */
import { renderToString } from "@plantuml/core";
// @implements_req SwRS-MDOKFSTUDIO-DIAG-024
// Bundled `!theme` definitions and OpenIconic sprites: registered as globals, nothing is fetched.
import "@plantuml/core/themes.js";
import "@plantuml/core/openiconic.js";

import {
  createPlantUmlDiagramRenderer,
  installPlantUmlLoaders,
  isDarkBackground,
  type PlantUmlFileAnswer,
  type PlantUmlFileHost,
} from "./plantumlDiagram";
import { PLANTUML_FILE_REQUEST_EVENT, PLANTUML_INCLUDES_CHANGED_EVENT, type PlantUmlFileRequestDetail } from "./plantumlFileRequests";

// @implements_req SwRS-MDOKFSTUDIO-DIAG-032
const askHost: PlantUmlFileHost = (request) => new Promise<PlantUmlFileAnswer>((resolve) => {
  const detail: PlantUmlFileRequestDetail = { request, accepted: false, respond: resolve };
  document.dispatchEvent(new CustomEvent(PLANTUML_FILE_REQUEST_EVENT, { detail }));
  if (!detail.accepted) {
    resolve({ ok: false, reason: `${request.path} cannot be read: this page has no connection to the editor.` });
  }
});

const diagramSelector = ".myst-plantuml-diagram";
const renderer = createPlantUmlDiagramRenderer((lines, onSuccess, onError, options) =>
  renderToString(lines, onSuccess, onError, options), { host: askHost });
installPlantUmlLoaders(globalThis as unknown as Record<string, unknown>, renderer.loadFile);

function previewIsDark(): boolean {
  return isDarkBackground(getComputedStyle(document.body).backgroundColor);
}

let renderedDark = previewIsDark();

function renderDiagrams(diagrams: readonly HTMLElement[]): void {
  for (const diagram of diagrams) {
    void renderer.render(diagram, renderedDark);
  }
}

renderDiagrams(Array.from(document.querySelectorAll<HTMLElement>(diagramSelector)));

// @implements_req SwRS-MDOKFSTUDIO-DIAG-039
// A content patch replaces the diagrams: draw the new ones (unchanged sources come from the cache).
document.addEventListener("studio:content-replaced", () => {
  renderDiagrams(Array.from(document.querySelectorAll<HTMLElement>(diagramSelector))
    .filter((diagram) => !diagram.hasAttribute("data-render-state")));
});

// @implements_req SwRS-MDOKFSTUDIO-DIAG-053
// An included file changed on disk: draw again the diagrams that read files (and those still drawing).
document.addEventListener(PLANTUML_INCLUDES_CHANGED_EVENT, () => {
  renderer.forgetIncludedFiles();
  renderDiagrams(Array.from(document.querySelectorAll<HTMLElement>(diagramSelector))
    .filter((diagram) => diagram.getAttribute("data-plantuml-includes") === "true"
      || !diagram.hasAttribute("data-render-state")));
});

// @implements_req SwRS-MDOKFSTUDIO-DIAG-023
// A theme switch between light and dark draws every diagram again in the other variant.
const themeObserver = new MutationObserver(() => {
  const dark = previewIsDark();
  if (dark === renderedDark) {
    return;
  }
  renderedDark = dark;
  renderDiagrams(Array.from(document.querySelectorAll<HTMLElement>(diagramSelector)));
});
themeObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-sphinx-preview-theme-mode", "data-sphinx-preview-theme", "class", "style"],
});
themeObserver.observe(document.body, {
  attributes: true,
  attributeFilter: ["class", "style"],
});
