/**
 * The `WorkspaceInfo` port: the folders the user works in, whether they are trusted, and a bounded
 * search for files in them.
 */

import type { HostEvent } from "./events";

/** One folder of the workspace. */
export interface WorkspaceFolderInfo {
  /** The folder's URI as a string. */
  id: string;
  /** The folder's file system path. */
  path: string;
  name: string;
}

/** A bounded search for files below a folder. */
export interface FileSearch {
  /** The folder searched (a file system path). */
  base: string;
  /** A glob relative to `base`, e.g. `**\/*.bib`. */
  pattern: string;
  /** A glob of paths left out, e.g. `{**\/node_modules/**,**\/.git/**}`. */
  exclude?: string;
  /** At most this many results. */
  maxResults?: number;
  /** Stops the search; the files found so far may be returned. */
  signal?: AbortSignal;
}

/** The workspace as the host knows it. */
export interface WorkspaceInfo {
  /**
   * True when the user trusts the workspace. A host without a trust model decides it once (for
   * example a trusted folder list); untrusted means: no processes, no reads outside the document's
   * folder, no edits.
   */
  readonly trusted: boolean;
  /** Fires once the user grants trust. */
  readonly onDidGrantTrust: HostEvent<void>;
  /** The open folders, first one first. */
  folders(): WorkspaceFolderInfo[];
  /** The folder that contains the file system path `path`; undefined when none does. */
  folderOf(path: string): WorkspaceFolderInfo | undefined;
  /** File system paths of the files matching `search`. */
  findFiles(search: FileSearch): Promise<string[]>;
}
