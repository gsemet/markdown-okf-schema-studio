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
const rendering = new WeakSet<HTMLElement>();

const mermaidReady = import("mermaid").then(({ default: mermaid }) => {
  const diagramSizing = Object.fromEntries(
    Object.entries(mermaid.mermaidAPI.getConfig())
      .filter(([, config]) =>
        config && typeof config === "object" && "useMaxWidth" in config)
      .map(([name]) => [name, { useMaxWidth: false }]),
  ) as NonNullable<Parameters<typeof mermaid.initialize>[0]>;

  mermaid.initialize({
    ...diagramSizing,
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    themeVariables: {
      background: "transparent",
      primaryColor: themeVariable("--vscode-textCodeBlock-background", "#f0f0f0"),
      primaryTextColor: themeVariable("--vscode-editor-foreground", "#1f1f1f"),
      primaryBorderColor: themeVariable("--sphinx-preview-border", "#808080"),
      lineColor: themeVariable("--vscode-editor-foreground", "#1f1f1f"),
      secondaryColor: themeVariable("--vscode-textBlockQuote-background", "#f0f0f0"),
      tertiaryColor: themeVariable("--vscode-editor-background", "#ffffff"),
      fontFamily: themeVariable("--sphinx-preview-font", "sans-serif"),
    },
  });

  const renderDiagrams = (pending: readonly HTMLElement[]): Promise<void[]> => Promise.all(pending.map(async (diagram) => {
    const id = `myst-mermaid-${diagramCounter}`;
    diagramCounter += 1;
    const source = diagram.textContent?.trim() ?? "";
    if (!source) {
      return;
    }

    rendering.add(diagram);
    try {
      const rendered = await mermaid.render(id, source);
      const image = document.createElement("img");
      image.className = "myst-mermaid-image";
      image.alt = "Mermaid diagram";
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalizeSvgForDataImage(rendered.svg))}`;
      diagram.replaceChildren(image);
      diagram.dataset.renderState = "rendered";
    } catch {
      const error = document.createElement("p");
      error.className = "myst-mermaid-error";
      error.textContent = "Unable to render Mermaid diagram. Its source remains available below.";
      diagram.prepend(error);
      diagram.dataset.renderState = "error";
    } finally {
      rendering.delete(diagram);
    }
  }));

  return renderDiagrams;
});

void mermaidReady.then((renderDiagrams) => renderDiagrams(diagrams));

// The preview runtime announces replaced content; only the diagrams that were not rendered yet
// (and are not being rendered) are rendered. The listener is registered at load, so an event that
// arrives while Mermaid is still loading is served once it is ready.
document.addEventListener("studio:content-replaced", () => {
  void mermaidReady.then((renderDiagrams) => renderDiagrams(
    Array.from(document.querySelectorAll<HTMLElement>(diagramSelector))
      .filter((diagram) => diagram.dataset.renderState === undefined && !rendering.has(diagram)),
  ));
});
