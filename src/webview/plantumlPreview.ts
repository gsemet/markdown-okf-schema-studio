/**
 * The built-in PlantUML engine of the preview page (bundled by esbuild into
 * `out/bundle/plantumlPreview.js`, like Mermaid). The host loads this script only when PlantUML
 * uses the built-in engine (`markdownOkfSchemaStudio.plantuml.useJar` off).
 *
 * The engine runs with the page's Content Security Policy unchanged: it is a plain script from
 * the extension, uses no eval, no worker and no WebAssembly (Graphviz `viz-global.js` is not
 * bundled; layouts use PlantUML's own Smetana engine), and `connect-src 'none'` stays.
 */
import { renderToString } from "@plantuml/core";
// Bundled `!theme` definitions and OpenIconic sprites: registered as globals, nothing is fetched.
import "@plantuml/core/themes.js";
import "@plantuml/core/openiconic.js";

import {
  createPlantUmlDiagramRenderer,
  installPlantUmlLoaders,
  isDarkBackground,
} from "./plantumlDiagram";

installPlantUmlLoaders(globalThis as unknown as Record<string, unknown>);

const diagramSelector = ".myst-plantuml-diagram";
const renderer = createPlantUmlDiagramRenderer((lines, onSuccess, onError, options) =>
  renderToString(lines, onSuccess, onError, options));

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

// A content patch replaces the diagrams: draw the new ones (unchanged sources come from the cache).
document.addEventListener("studio:content-replaced", () => {
  renderDiagrams(Array.from(document.querySelectorAll<HTMLElement>(diagramSelector))
    .filter((diagram) => !diagram.hasAttribute("data-render-state")));
});

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
