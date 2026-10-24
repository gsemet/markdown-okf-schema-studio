/**
 * The `PreviewPanel` port: the surface one preview page lives in (VS Code: a webview panel), and
 * the `PanelGroups` port for the layout around it. The session talks to its page only through a
 * panel: it assigns the page's document, posts protocol messages and hears the page's messages.
 */

import type { AssetResolver } from "./assetResolver";
import type { HostEvent } from "./events";

/** The surface of one preview page. */
export interface PreviewPanel {
  /**
   * The document the page shows. Assigning a different string loads a new document; assigning the
   * same string again is ignored by the host (no reload, no new ready report).
   */
  html: string;
  /** The source expression the page's Content-Security-Policy allows for local resources. */
  readonly cspSource: string;
  /** URLs of the files the page may load (workspace files and the host's bundle). */
  readonly assets: AssetResolver;
  /** The folder of the host's bundle (runtime, styles, diagram engines); undefined without one. */
  readonly bundleRoot: string | undefined;
  /** Turns scripts on and sets the folders (file system paths) the page may load files from. */
  setResourceRoots(roots: readonly string[]): void;
  /** The title the host shows for the panel. */
  title: string;
  /** True while the panel is shown. */
  readonly visible: boolean;
  /** True while the panel is the active editor of the active group. */
  readonly active: boolean;
  /** The column of the group that holds the panel; undefined when the host does not say. */
  readonly column: number | undefined;
  /** Sends a protocol message to the page; resolves to false when it was not delivered. */
  postMessage(message: object): PromiseLike<boolean>;
  /** Shows the panel in its group. */
  reveal(): void;
  /** Closes the panel; `onDidDispose` fires. */
  dispose(): void;
  /** A message the page posted (not validated yet). */
  readonly onDidReceiveMessage: HostEvent<unknown>;
  /** The panel was shown, hidden, focused or moved. */
  readonly onDidChangeViewState: HostEvent<void>;
  /** The groups around the panel changed (one closed, one opened): its column may have moved. */
  readonly onDidChangeLayout: HostEvent<void>;
  /** The panel is gone. */
  readonly onDidDispose: HostEvent<void>;
}

/** The editor groups of panels: the lock a side preview puts on its group. */
export interface PanelGroups {
  /**
   * Locks the group a new side preview opened in, so files opened while the preview has focus
   * land in another group. Only a group that holds just this panel is locked. Resolves to true
   * when the group was locked; never rejects.
   */
  lockNewPanelGroup(panel: PreviewPanel): Promise<boolean>;
  /**
   * The panel of a preview that locked its group (at `column`) went away: releases that lock, one
   * tick later, when the group is left empty. Never throws.
   */
  release(column: number): void;
}
