/**
 * Revisions: the protocol's name for "this state of the document text". Pure module: no host
 * API, no DOM, no Node built-ins.
 *
 * A message names the revision of the render it belongs to, and a stale message is one whose
 * revision is not the one the host holds. The protocol only ever compares revisions for
 * equality: the page never reads, orders or computes them, it repeats the revision the host gave
 * it. Each host maps its own notion of a document version onto revisions:
 *
 * - a host whose editor already counts the changes of a document (VS Code's
 *   `TextDocument.version`) uses that count as the revision;
 * - a host without one counts with {@link RevisionCounter}.
 */

/**
 * One state of a document's text as the host knows it: a safe integer that is the same for the
 * same state and different after a change, within one session of the host.
 */
export type Revision = number;

/** Whether `value` can be a {@link Revision} on the wire (any safe integer). */
export function isRevision(value: unknown): value is Revision {
  return Number.isSafeInteger(value);
}

/**
 * The revision counter of a host that has no document version of its own: every document starts
 * at revision 1 and each recorded change moves it to the next integer. Revisions of one document
 * only grow, so a message that names an earlier one is stale.
 */
export class RevisionCounter {
  private readonly revisions = new Map<string, Revision>();

  /** The current revision of a document; 1 for a document no change was recorded for. */
  current(documentId: string): Revision {
    return this.revisions.get(documentId) ?? 1;
  }

  /** Records a change of the document's text and returns its new revision. */
  advance(documentId: string): Revision {
    const next = this.current(documentId) + 1;
    this.revisions.set(documentId, next);
    return next;
  }
}
