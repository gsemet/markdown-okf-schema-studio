/**
 * The built-in PlantUML engine in the preview page: which diagrams it can draw, how a result is
 * shown, and the loaders that keep it away from the network. Local `!include` files are asked of
 * the extension host, which reads them under the rules of `{include}`.
 *
 * The engine (`@plantuml/core`, bundled by `plantumlPreview.ts`) runs in the webview because it
 * needs a DOM. This module holds everything around it that does not need the engine itself, so the
 * unit tests drive it with a fake engine and a fake DOM.
 */
import {
  MAX_PLANTUML_SOURCE_LENGTH,
  PLANTUML_INCLUDE_MAX_DEPTH,
  PLANTUML_INCLUDE_MAX_FILES,
} from "../../core/render/plantUmlLimits";

/** `renderToString` of `@plantuml/core`: exactly one callback is called, once, in call order. */
export type PlantUmlRenderToString = (
  lines: string[],
  onSuccess: (svg: string) => void,
  onError: (message: string) => void,
  options: { dark: boolean },
) => void;

/**
 * `PLANTUML_FILE_LOADER` of `@plantuml/core`: `from` is null for an include of the diagram itself,
 * otherwise the id given to the including file; the first of `ok` / `err` wins.
 */
export type PlantUmlFileLoader = (
  path: string,
  from: string | null,
  ok: (id: string, text: string) => void,
  err: (message: string) => void,
  request?: { kind?: string },
) => unknown;

/** What the host answers for a local file: its id (absolute path) and text, or why not. */
export type PlantUmlFileAnswer = { ok: true; id: string; text: string } | { ok: false; reason: string };

/** Asks the extension host for a local file (`previewPlantUmlInclude`). */
export type PlantUmlFileHost = (request: { path: string; from: string | null }) => Promise<PlantUmlFileAnswer>;

export interface UnsupportedPlantUmlFeature {
  /** 1-based line inside the diagram source (or inside `file`). */
  line: number;
  directive: string;
  /** The included file that holds the directive; unset for the diagram itself. */
  file?: string;
}

const USE_JAR_HINT = "Tick markdownOkfSchemaStudio.plantuml.useJar to render it with your PlantUML JAR "
  + "or the plantuml command (trusted workspaces only).";

const LOADER_REFUSAL = "is not available in the built-in PlantUML engine";

/**
 * What the built-in engine is never given: URL includes (`!includeurl`, `!include https://...`),
 * the standard library (`!include <C4/...>`), `!includedef`, `!import` and a `!theme` read from a
 * folder or URL. Without this check the engine draws its own error picture; the preview says what
 * to do instead. Local `!include`, `!include_many`, `!include_once` and `!includesub` files are
 * read by the host, and a `!theme NAME` from the bundled library is supported.
 */
const UNSUPPORTED_DIRECTIVE = new RegExp(
  "^\\s*("
  + "!(?:includeurl|includedef|import)\\b.*"
  + "|!include(?:_many|_once|sub)?\\s+[\"']?(?:<|[a-z][a-z\\d+.-]*://).*"
  + "|!theme\\s+\\S+\\s+from\\s+.*"
  + ")$",
  "iu",
);

// @implements_req SwRS-MDOKFSTUDIO-DIAG-032
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
  const where = feature.file ? `line ${feature.line} of ${feature.file}` : `line ${feature.line}`;
  return `The built-in PlantUML engine cannot render this diagram: ${feature.directive} (${where}) `
    + `needs a URL, the PlantUML standard library or a library that the preview does not load. ${USE_JAR_HINT}`;
}

function engineErrorMessage(reason: string): string {
  const cleaned = reason.replace(/^(?:[a-z]\w*\.)+\w*(?:Exception|Error):\s*/u, "").trim();
  return `The built-in PlantUML engine could not render this diagram: ${cleaned || "unknown error"}. ${USE_JAR_HINT}`;
}

function includeFailureMessage(reasons: readonly string[]): string {
  return `The built-in PlantUML engine could not render this diagram: ${reasons.join(" ")}`;
}

const LIMIT_MIB = MAX_PLANTUML_SOURCE_LENGTH / (1024 * 1024);

const SOURCE_TOO_LARGE = `The PlantUML source exceeds the ${LIMIT_MIB} MiB preview limit.`;

/** Refuses every local file: the loader of a page that cannot ask the host. */
const refuseFile: PlantUmlFileLoader = (path, _from, _ok, err) => {
  err(`${path} ${LOADER_REFUSAL}`);
};

/**
 * Sets the engine globals before its first render. Local files go through `fileLoader` (the
 * renderer's, which asks the host); without it every file is refused. Every standard-library bundle
 * and optional script (emoji) is refused, so the engine never adds a script tag. No
 * `PLANTUML_STDLIB_BASE` is set, so nothing points at a remote server.
 */
export function installPlantUmlLoaders(target: Record<string, unknown>, fileLoader?: PlantUmlFileLoader): void {
  target.PLANTUML_FILE_LOADER = fileLoader ?? refuseFile;
  // Returning `false` would hand the URL to a script tag: the loader always answers with err.
  target.PLANTUML_STDLIB_LOADER = (url: string, _ok: unknown, err: (message: string) => void): void => {
    err(`${url} ${LOADER_REFUSAL}`);
  };
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-023
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

type Outcome = { usesFiles: boolean; cacheable: boolean } & (
  | { kind: "svg"; svg: string }
  | { kind: "error" | "unavailable"; text: string }
);

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
  /** Draws one `.myst-plantuml-diagram` element; resolves when its result is shown (or superseded). */
  render(diagram: HTMLElement, dark: boolean): Promise<void>;
  /** The engine's `PLANTUML_FILE_LOADER`: serves the diagram being rendered through the host. */
  loadFile: PlantUmlFileLoader;
  /**
   * An included file changed on disk: results that used local files (and renders still running)
   * are forgotten, so the next `render` of those diagrams reads the files again.
   */
  forgetIncludedFiles(): void;
}

export interface PlantUmlDiagramRendererOptions {
  cacheLimit?: number;
  /** Reads local `!include` files; unset: every local file is refused. */
  host?: PlantUmlFileHost;
}

/** The local files of one engine run: one diagram, its includes, their limits. */
interface IncludeSession {
  /** The id of the diagram's own file (`{uml} path.puml`), the base of its top-level includes. */
  base?: string;
  answers: Map<string, Promise<PlantUmlFileAnswer>>;
  parentOf: Map<string, string | null>;
  depthOf: Map<string, number>;
  characters: number;
  usesFiles: boolean;
  failures: string[];
  unsupported?: UnsupportedPlantUmlFeature;
}

function displayName(id: string): string {
  return id.split(/[\\/]/u).pop() || id;
}

/**
 * Renders diagrams with `engine`, one at a time (the engine's file loader serves the diagram that
 * is rendering), caching results by source, file base and theme so a patched page with unchanged
 * diagrams (and a theme switch back) does not run the engine again.
 */
export function createPlantUmlDiagramRenderer(
  engine: PlantUmlRenderToString,
  options: PlantUmlDiagramRendererOptions = {},
): PlantUmlDiagramRenderer {
  const cacheLimit = options.cacheLimit ?? 64;
  const host = options.host;
  const sources = new WeakMap<HTMLElement, string>();
  const tokens = new WeakMap<HTMLElement, number>();
  const cache = new Map<string, { outcome: Promise<Outcome>; settled: boolean; usesFiles: boolean }>();
  let queue: Promise<unknown> = Promise.resolve();
  let session: IncludeSession | undefined;

  const ancestorsOf = (current: IncludeSession, id: string | null): Set<string> => {
    const seen = new Set<string>();
    for (let node = id; node !== null && !seen.has(node); node = current.parentOf.get(node) ?? null) {
      seen.add(node);
    }
    return seen;
  };

  // @implements_req SwRS-MDOKFSTUDIO-DIAG-046
  // @implements_req SwRS-MDOKFSTUDIO-DIAG-061
  const loadFile: PlantUmlFileLoader = (path, from, ok, err, request) => {
    const current = session;
    if (!current || !host) {
      refuseFile(path, from, ok, err);
      return;
    }
    const fail = (reason: string): void => {
      current.failures.push(reason);
      err(reason);
    };
    if (request?.kind === "theme") {
      fail(`!theme ... from ${path} ${LOADER_REFUSAL}.`);
      return;
    }
    const parent = from ?? current.base ?? null;
    const depth = (parent === null ? 0 : current.depthOf.get(parent) ?? 0) + 1;
    if (depth > PLANTUML_INCLUDE_MAX_DEPTH) {
      fail(`${path} is nested deeper than ${PLANTUML_INCLUDE_MAX_DEPTH} includes.`);
      return;
    }
    const key = `${parent ?? ""}\u0000${path}`;
    let answer = current.answers.get(key);
    if (!answer) {
      if (current.answers.size >= PLANTUML_INCLUDE_MAX_FILES) {
        fail(`${path} was not read: a diagram includes at most ${PLANTUML_INCLUDE_MAX_FILES} files.`);
        return;
      }
      answer = host({ path, from: parent }).catch((error: unknown) => ({
        ok: false as const,
        reason: error instanceof Error ? error.message : String(error),
      }));
      current.answers.set(key, answer);
    }
    void answer.then((file) => {
      if (!file.ok) {
        fail(file.reason);
        return;
      }
      if (ancestorsOf(current, parent).has(file.id)) {
        fail(`${path} includes itself (an include cycle).`);
        return;
      }
      if (!current.depthOf.has(file.id)) {
        if (current.characters + file.text.length > MAX_PLANTUML_SOURCE_LENGTH) {
          fail(`${path} was not read: the diagram with its included files exceeds the ${LIMIT_MIB} MiB preview limit.`);
          return;
        }
        current.characters += file.text.length;
        current.depthOf.set(file.id, depth);
        current.parentOf.set(file.id, parent);
      }
      const unsupported = findUnsupportedPlantUmlFeature(file.text);
      if (unsupported) {
        current.unsupported ??= { ...unsupported, file: displayName(file.id) };
        err(`${path}: ${unsupported.directive} ${LOADER_REFUSAL}`);
        return;
      }
      current.usesFiles = true;
      ok(file.id, file.text);
    });
  };

  const run = (source: string, dark: boolean, base: string | undefined): Promise<Outcome> =>
    new Promise<Outcome>((resolve) => {
      const current: IncludeSession = {
        ...(base ? { base } : {}),
        answers: new Map(),
        parentOf: new Map(),
        depthOf: new Map(base ? [[base, 0]] : []),
        characters: source.length,
        usesFiles: false,
        failures: [],
      };
      session = current;
      let settled = false;
      const finish = (result: { svg: string } | { error: string }): void => {
        if (settled) {
          return;
        }
        settled = true;
        if (session === current) {
          session = undefined;
        }
        const usesFiles = current.usesFiles || current.failures.length > 0 || current.unsupported !== undefined;
        // A refused include is asked again next time: the file may appear or be fixed.
        const cacheable = current.failures.length === 0 && current.unsupported === undefined;
        const flags = { usesFiles, cacheable };
        if (current.unsupported) {
          resolve({ ...flags, kind: "unavailable", text: unsupportedMessage(current.unsupported) });
        } else if (current.failures.length > 0) {
          resolve({ ...flags, kind: "error", text: includeFailureMessage([...new Set(current.failures)]) });
        } else if ("svg" in result) {
          resolve({ ...flags, kind: "svg", svg: result.svg });
        } else {
          resolve({ ...flags, kind: "error", text: engineErrorMessage(result.error) });
        }
      };
      try {
        engine(
          source.split(/\r\n|\r|\n/u),
          (svg) => finish({ svg }),
          (error) => finish({ error: String(error) }),
          { dark },
        );
      } catch (error) {
        finish({ error: error instanceof Error ? error.message : String(error) });
      }
    });

  // @implements_req SwRS-MDOKFSTUDIO-DIAG-039
  const outcome = (source: string, dark: boolean, base: string | undefined): Promise<Outcome> => {
    const key = `${dark ? "dark" : "light"}\u0000${base ?? ""}\u0000${source}`;
    const cached = cache.get(key);
    if (cached) {
      cache.delete(key);
      cache.set(key, cached);
      return cached.outcome;
    }
    // One engine run at a time: the file loader knows which diagram is asking.
    const pending = queue.then(() => run(source, dark, base));
    queue = pending;
    const entry = { outcome: pending, settled: false, usesFiles: false };
    cache.set(key, entry);
    void pending.then((result) => {
      entry.settled = true;
      entry.usesFiles = result.usesFiles;
      if (!result.cacheable && cache.get(key) === entry) {
        cache.delete(key);
      }
    });
    while (cache.size > cacheLimit) {
      cache.delete(cache.keys().next().value as string);
    }
    return pending;
  };

  return {
    loadFile,
    forgetIncludedFiles() {
      for (const [key, entry] of [...cache]) {
        if (!entry.settled || entry.usesFiles) {
          cache.delete(key);
        }
      }
    },
    async render(diagram, dark) {
      const source = sources.get(diagram) ?? diagram.textContent?.trim() ?? "";
      if (!source) {
        return;
      }
      sources.set(diagram, source);
      const token = (tokens.get(diagram) ?? 0) + 1;
      tokens.set(diagram, token);
      diagram.setAttribute("data-plantuml-engine", "builtin");
      diagram.setAttribute("data-plantuml-dark", String(dark));
      if (source.length > MAX_PLANTUML_SOURCE_LENGTH) {
        showMessage(diagram, SOURCE_TOO_LARGE, "unavailable");
        return;
      }
      const unsupported = findUnsupportedPlantUmlFeature(source);
      if (unsupported) {
        showMessage(diagram, unsupportedMessage(unsupported), "unavailable");
        return;
      }
      const base = diagram.getAttribute("data-plantuml-base") ?? undefined;
      const result = await outcome(source, dark, base);
      // A newer render (theme switch, changed include) of this element supersedes this one.
      if (tokens.get(diagram) !== token) {
        return;
      }
      if (result.usesFiles) {
        diagram.setAttribute("data-plantuml-includes", "true");
      } else {
        diagram.removeAttribute("data-plantuml-includes");
      }
      if (result.kind === "svg") {
        showImage(diagram, result.svg);
      } else {
        showMessage(diagram, result.text, result.kind);
      }
    },
  };
}
