import { createMermaidCache, diagramKey } from "./mermaidCache";
import { showMermaidError } from "./mermaidError";

const CSS_SYSTEM_COLOR_KEYWORDS = new Set([
  "accentcolor",
  "accentcolortext",
  "activeborder",
  "activetext",
  "buttonborder",
  "buttonface",
  "buttontext",
  "canvas",
  "canvastext",
  "field",
  "fieldtext",
  "graytext",
  "highlight",
  "highlighttext",
  "inactiveborder",
  "inactivecaption",
  "inactivecaptiontext",
  "linktext",
  "mark",
  "marktext",
  "menu",
  "menutext",
  "scrollbar",
  "selecteditem",
  "selecteditemtext",
  "visitedtext",
  "window",
  "windowframe",
  "windowtext",
]);

function themeVariable(name: string, fallback: string): string {
  const value = getComputedStyle(document.body).getPropertyValue(name).trim();
  return value && !CSS_SYSTEM_COLOR_KEYWORDS.has(value.toLowerCase()) ? value : fallback;
}

function normalizeSvgForDataImage(svg: string): string {
  return svg.replace(/<br>/gu, "<br />");
}

const diagramSelector = ".myst-mermaid-diagram";
const diagrams = Array.from(document.querySelectorAll<HTMLElement>(diagramSelector));
// Mermaid ids must be unique across every render of the page, including renders of replaced content.
let diagramCounter = 0;
const diagramSources = new WeakMap<HTMLElement, string>();
// The key (theme and source) each diagram node was last drawn with, and the drawings by key
// (PERF-07): unchanged diagrams are not drawn again by a content update or an attribute change.
const drawnKeys = new WeakMap<HTMLElement, string>();
const drawings = createMermaidCache();
let initializedTheme: string | undefined;

const mermaidReady = import("mermaid").then(({ default: mermaid }) => {
  const diagramSizing = Object.fromEntries(
    Object.entries(mermaid.mermaidAPI.getConfig())
      .filter(([, config]) =>
        config && typeof config === "object" && "useMaxWidth" in config)
      .map(([name]) => [name, { useMaxWidth: false }]),
  ) as NonNullable<Parameters<typeof mermaid.initialize>[0]>;

  const renderDiagrams = async (pending: readonly HTMLElement[]): Promise<void> => {
    const themeVariables = {
      background: "transparent",
      primaryColor: themeVariable("--vscode-textCodeBlock-background", "#f0f0f0"),
      primaryTextColor: themeVariable("--vscode-editor-foreground", "#1f1f1f"),
      primaryBorderColor: themeVariable("--sphinx-preview-border", "#808080"),
      lineColor: themeVariable("--vscode-editor-foreground", "#1f1f1f"),
      secondaryColor: themeVariable("--vscode-textBlockQuote-background", "#f0f0f0"),
      tertiaryColor: themeVariable("--vscode-editor-background", "#ffffff"),
      fontFamily: themeVariable("--sphinx-preview-font", "sans-serif"),
    };
    const themeKey = JSON.stringify(themeVariables);
    const ensureInitialized = (): void => {
      if (initializedTheme === themeKey) return;
      initializedTheme = themeKey;
      mermaid.initialize({
        ...diagramSizing,
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        themeVariables,
      });
    };

    const showImage = (diagram: HTMLElement, src: string): void => {
      const image = document.createElement("img");
      image.className = "myst-mermaid-image";
      image.alt = "Mermaid diagram";
      image.src = src;
      diagram.replaceChildren(image);
      diagram.dataset.renderState = "rendered";
    };

    await Promise.all(pending.map(async (diagram) => {
      const source = diagramSources.get(diagram) ?? diagram.textContent?.trim() ?? "";
      if (!source) {
        return;
      }

      diagramSources.set(diagram, source);
      const key = diagramKey(themeVariables, source);
      const plan = drawings.plan(diagram.dataset.renderState === undefined ? undefined : drawnKeys.get(diagram), key);
      if (plan.action === "keep") {
        return;
      }
      drawnKeys.set(diagram, key);
      if (plan.action === "reuse") {
        showImage(diagram, plan.image);
        return;
      }
      ensureInitialized();
      const id = `myst-mermaid-${diagramCounter}`;
      diagramCounter += 1;
      try {
        const rendered = await mermaid.render(id, source);
        const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalizeSvgForDataImage(rendered.svg))}`;
        drawings.store(key, src);
        // A later pass (a newer theme) may have planned this node while Mermaid drew: the drawing
        // stays in the cache, but only the drawing of the node's current key is shown.
        if (drawnKeys.get(diagram) === key) showImage(diagram, src);
      } catch (err) {
        if (drawnKeys.get(diagram) !== key) return;
        showMermaidError(diagram, err instanceof Error ? err.message : String(err));
        diagram.dataset.renderState = "error";
      }
    }));
  };

  return renderDiagrams;
});

let renderQueue = mermaidReady.then((renderDiagrams) => renderDiagrams(diagrams));

document.addEventListener("studio:content-replaced", () => {
  renderQueue = renderQueue.then(async () => (await mermaidReady)(
    Array.from(document.querySelectorAll<HTMLElement>(diagramSelector))
      .filter((diagram) => diagram.dataset.renderState === undefined),
  ));
});

const themeObserver = new MutationObserver(() => {
  renderQueue = renderQueue.then(async () => (await mermaidReady)(
    Array.from(document.querySelectorAll<HTMLElement>(diagramSelector)),
  ));
});
themeObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-sphinx-preview-theme-mode", "data-sphinx-preview-theme", "class", "style"],
});
themeObserver.observe(document.body, {
  attributes: true,
  attributeFilter: ["class", "style"],
});
