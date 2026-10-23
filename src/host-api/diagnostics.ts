/**
 * The `Diagnostics` port: problems reported against documents, shown in the host's problems list
 * (VS Code: the Problems panel).
 */

import type { TextRange } from "./documentStore";
import type { Disposable } from "./events";

/** How serious a diagnostic is. */
export type DiagnosticSeverity = "error" | "warning" | "information" | "hint";

/** One problem in a document. */
export interface DiagnosticEntry {
  range: TextRange;
  message: string;
  severity: DiagnosticSeverity;
  /** Who reports it, as the problems list shows it. */
  source?: string;
  /** A stable code of the kind of problem. */
  code?: string;
}

/** One named set of diagnostics, by document id (a URI string). */
export interface DiagnosticsSink extends Disposable {
  /** Replaces the diagnostics of a document. */
  set(documentId: string, entries: readonly DiagnosticEntry[]): void;
  /** True when the set has an entry (possibly empty) for the document. */
  has(documentId: string): boolean;
  /** Removes the document's diagnostics. */
  delete(documentId: string): void;
}

/** Creates diagnostic sets. */
export interface Diagnostics {
  /** A new set; `name` identifies it to the host. */
  create(name: string): DiagnosticsSink;
}
