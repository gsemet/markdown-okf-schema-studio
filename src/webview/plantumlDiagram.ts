/**
 * The built-in PlantUML engine in the preview page: which diagrams it can draw, how a result is
 * shown, and the loaders that keep it away from files and the network.
 *
 * The engine (`@plantuml/core`, bundled by `plantumlPreview.ts`) runs in the webview because it
 * needs a DOM. This module holds everything around it that does not need the engine itself, so the
 * unit tests drive it with a fake engine and a fake DOM.
 */

/** `renderToString` of `@plantuml/core`: exactly one callback is called, once, in call order. */
export type PlantUmlRenderToString = (
  lines: string[],
  onSuccess: (svg: string) => void,
  onError: (message: string) => void,
  options: { dark: boolean },
) => void;

export interface UnsupportedPlantUmlFeature {
  /** 1-based line inside the diagram source. */
  line: number;
  directive: string;
}

const USE_JAR_HINT = "Tick markdownOkfSchemaStudio.plantuml.useJar to render it with your PlantUML JAR "
  + "or the plantuml command (trusted workspaces only).";

const LOADER_REFUSAL = "is not available in the built-in PlantUML engine";

/**
 * Includes of any kind (local file, URL, standard library such as `<C4/...>`) and a `!theme` read
 * from a folder or URL need files or the network, which the built-in engine is not given. Without
 * this check the engine draws its own error picture; the preview says what to do instead.
 * A `!theme NAME` from the bundled library is supported.
 */
const UNSUPPORTED_DIRECTIVE = /^\s*(!(?:include\w*|import)\b.*|!theme\s+\S+\s+from\s+.*)$/iu;

export function findUnsupportedPlantUmlFeature(source: string): UnsupportedPlantUmlFeature | undefined {
  const lines = source.split(/\r\n|\r|\n/u);
  for (const [index, line] of lines.entries()) {
    const match = UNSUPPORTED_DIRECTIVE.exec(line);
    if (match?.[1]) {
      return { line: index + 1, directive: match[1].trim() };
    }
  }
  return undefined;
}

function unsupportedMessage(feature: UnsupportedPlantUmlFeature): string {
  return `The built-in PlantUML engine cannot render this diagram: ${feature.directive} (line ${feature.line}) `
    + `needs files or a library that the preview does not load. ${USE_JAR_HINT}`;
}

function engineErrorMessage(reason: string): string {
  const cleaned = reason.replace(/^(?:[a-z]\w*\.)+\w*(?:Exception|Error):\s*/u, "").trim();
  return `The built-in PlantUML engine could not render this diagram: ${cleaned || "unknown error"}. ${USE_JAR_HINT}`;
}

/**
 * Sets the engine globals before its first render: every local file, standard-library bundle and
 * optional script (emoji) is refused, so the engine never reads a file nor adds a script tag. No
 * `PLANTUML_STDLIB_BASE` is set, so nothing points at a remote server.
 */
export function installPlantUmlLoaders(target: Record<string, unknown>): void {
  target.PLANTUML_FILE_LOADER = (
    path: string,
    _from: unknown,
    _ok: unknown,
    err: (message: string) => void,
  ): void => {
    err(`${path} ${LOADER_REFUSAL}`);
  };
  // Returning `false` would hand the URL to a script tag: the loader always answers with err.
  target.PLANTUML_STDLIB_LOADER = (url: string, _ok: unknown, err: (message: string) => void): void => {
    err(`${url} ${LOADER_REFUSAL}`);
  };
}

/** True for an opaque, dark CSS colour (`rgb()`/`rgba()` as `getComputedStyle` reports it). */
export function isDarkBackground(color: string): boolean {
  const channels = (color.match(/[\d.]+/gu) ?? []).map(Number);
  if (channels.length < 3 || (channels.length >= 4 && channels[3] === 0)) {
    return false;
  }
  const [red, green, blue] = channels.slice(0, 3).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue! < 0.18;
}

type Outcome = { svg: string } | { error: string };

function clearChildren(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function showImage(diagram: HTMLElement, svg: string): void {
  const image = diagram.ownerDocument.createElement("img");
  image.setAttribute("class", "myst-plantuml-image");
  image.setAttribute("alt", "PlantUML diagram");
  // A data-URI image: scripts and links inside the SVG stay inert, as with the JAR pipeline.
  image.setAttribute("src", `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  clearChildren(diagram);
  diagram.appendChild(image);
  diagram.setAttribute("data-render-state", "rendered");
}

function showMessage(diagram: HTMLElement, text: string, state: "unavailable" | "error"): void {
  const message = diagram.ownerDocument.createElement("p");
  message.setAttribute("class", "myst-plantuml-error");
  message.textContent = text;
  clearChildren(diagram);
  diagram.appendChild(message);
  diagram.setAttribute("data-render-state", state);
}

export interface PlantUmlDiagramRenderer {
  /** Draws one `.myst-plantuml-diagram` element; resolves when its result is shown. */
  render(diagram: HTMLElement, dark: boolean): Promise<void>;
}

/**
 * Renders diagrams with `engine`, caching results by source and theme so a patched page with
 * unchanged diagrams (and a theme switch back) does not run the engine again.
 */
export function createPlantUmlDiagramRenderer(
  engine: PlantUmlRenderToString,
  cacheLimit = 64,
): PlantUmlDiagramRenderer {
  const sources = new WeakMap<HTMLElement, string>();
  const cache = new Map<string, Promise<Outcome>>();
  const outcome = (source: string, dark: boolean): Promise<Outcome> => {
    const key = `${dark ? "dark" : "light"}\u0000${source}`;
    const cached = cache.get(key);
    if (cached) {
      cache.delete(key);
      cache.set(key, cached);
      return cached;
    }
    const pending = new Promise<Outcome>((resolve) => {
      try {
        engine(
          source.split(/\r\n|\r|\n/u),
          (svg) => resolve({ svg }),
          (error) => resolve({ error: String(error) }),
          { dark },
        );
      } catch (error) {
        resolve({ error: error instanceof Error ? error.message : String(error) });
      }
    });
    cache.set(key, pending);
    while (cache.size > cacheLimit) {
      cache.delete(cache.keys().next().value as string);
    }
    return pending;
  };

  return {
    async render(diagram, dark) {
      const source = sources.get(diagram) ?? diagram.textContent?.trim() ?? "";
      if (!source) {
        return;
      }
      sources.set(diagram, source);
      diagram.setAttribute("data-plantuml-engine", "builtin");
      diagram.setAttribute("data-plantuml-dark", String(dark));
      const unsupported = findUnsupportedPlantUmlFeature(source);
      if (unsupported) {
        showMessage(diagram, unsupportedMessage(unsupported), "unavailable");
        return;
      }
      const result = await outcome(source, dark);
      // A newer render (theme switch) may have asked for the other variant meanwhile.
      if (diagram.getAttribute("data-plantuml-dark") !== String(dark)) {
        return;
      }
      if ("svg" in result) {
        showImage(diagram, result.svg);
      } else {
        showMessage(diagram, engineErrorMessage(result.error), "error");
      }
    },
  };
}
