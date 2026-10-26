/**
 * Runs a page entry point (a script bundled by esbuild.mjs, such as `mermaidPreview.ts`) under
 * `node:vm` in the fake DOM of the module tests: the entry point is bundled in memory exactly like
 * the shipped bundle (optionally with a module replaced), so these tests exercise the real script,
 * not a copy of its logic.
 */
import * as path from "node:path";
import * as vm from "node:vm";

import { build as esbuild, type Plugin } from "esbuild";

import { FakeDocument, FakeElement } from "./fakeDom";

const repositoryRoot = path.resolve(__dirname, "../../../..");

/** A diagram placeholder: the fake element plus the DOM members the entry points use. */
export class EntryElement extends FakeElement {
  public readonly dataset: Record<string, string | undefined> = {};
  public className = "";
  public src = "";
  public alt = "";

  public replaceChildren(...nodes: EntryElement[]): void {
    for (const child of [...this.childNodes]) this.removeChild(child);
    for (const node of nodes) this.appendChild(node);
  }
}

/** The document of an entry-point run; every created element is an `EntryElement`. */
export class EntryDocument extends FakeDocument {
  public readonly documentElement = this;
  public override createElement(tag: string): EntryElement {
    const element = new EntryElement(tag);
    element.ownerDocument = this;
    if (tag === "canvas") {
      // The PlantUML engine measures text on a canvas: a fixed-width font stands in for it.
      Object.assign(element, {
        getContext: () => ({
          font: "",
          measureText: (text: string) => ({ width: 7 * text.length, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 }),
        }),
      });
    }
    return element;
  }
  public diagram(className: string, source: string): EntryElement {
    const element = this.createElement("div");
    element.setAttribute("class", className);
    element.textContent = source;
    this.content.appendChild(element);
    return element;
  }
}

export interface EntryRun {
  readonly document: EntryDocument;
  /** Callbacks of the MutationObservers the entry point created. */
  readonly observers: Array<() => void>;
  /** Lets every queued promise job and macrotask run. */
  settle(): Promise<void>;
  readonly context: vm.Context;
}

/** Bundles `entry` in memory; `replace` maps a bare module name to the source of a stand-in. */
export async function bundleEntry(entry: string, replace: Record<string, string> = {}): Promise<string> {
  const plugin: Plugin = {
    name: "entry-stand-ins",
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) =>
        args.path in replace ? { path: args.path, namespace: "stand-in" } : undefined);
      build.onLoad({ filter: /.*/, namespace: "stand-in" }, (args) =>
        ({ contents: replace[args.path]!, loader: "js" }));
    },
  };
  const result = await esbuild({
    entryPoints: [entry],
    absWorkingDir: repositoryRoot,
    bundle: true,
    platform: "browser",
    target: "es2020",
    format: "iife",
    write: false,
    logLevel: "silent",
    plugins: [plugin],
  } as never);
  return result.outputFiles![0]!.text;
}

export function runEntry(
  bundle: string,
  document: EntryDocument,
  computedStyle: (name: string) => string,
  extraGlobals: Record<string, unknown> = {},
): EntryRun {
  const observers: Array<() => void> = [];
  class FakeMutationObserver {
    public constructor(callback: () => void) { observers.push(callback); }
    public observe(): void {}
    public disconnect(): void {}
  }
  const sandbox: Record<string, unknown> = {
    document,
    MutationObserver: FakeMutationObserver,
    getComputedStyle: () => ({ getPropertyValue: computedStyle, backgroundColor: computedStyle("background-color") }),
    CustomEvent: class { constructor(public type: string, public init: unknown) {} },
    encodeURIComponent, decodeURIComponent, Promise, JSON, console, setTimeout, clearTimeout,
    queueMicrotask, ...extraGlobals,
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  vm.runInContext(bundle, context);
  return {
    document,
    observers,
    context,
    settle: async () => {
      for (let turn = 0; turn < 5; turn += 1) await new Promise<void>((resolve) => setImmediate(resolve));
    },
  };
}
