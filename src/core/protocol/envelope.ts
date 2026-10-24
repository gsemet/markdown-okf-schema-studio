/**
 * The envelope every preview message carries, and the field checks the validators of both
 * directions share. Pure module: no host API, no DOM, no Node built-ins.
 */

import type { Revision } from "./revision";

/**
 * The render a page shows, as both sides name it: the document, the revision of its text the
 * render was made from, and the render request. A message addressed to a page carries the page's
 * identity; a message from a page carries the identity of the render it shows.
 */
export interface PageIdentity {
  /** The document the render belongs to (the host's document key, a URI string). */
  readonly documentId: string;
  /** The revision of the document text the render was made from. */
  readonly revision: Revision;
  /** The render request; a new render of the same revision has another one. */
  readonly requestId: number;
}

/** The revision and render part of a {@link PageIdentity}: what a content patch moves the page to. */
export type RenderIdentity = Omit<PageIdentity, "documentId">;

/** A validator of one message type: true when the message has the shape of that type. */
export type MessageValidator = (message: Readonly<Record<string, unknown>>) => boolean;

/** Longest document id the registered page messages accept. */
export const MAX_DOCUMENT_ID_LENGTH = 4096;

/** A string of at most `max` UTF-16 code units. */
export function isBoundedString(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

/** A 1-based source line: a safe integer of at least 1. */
export function isSourceLine(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1;
}

/** One of the listed values (compared with `includes`). */
export function isOneOf<T extends string | number>(value: unknown, list: readonly T[]): value is T {
  return (list as readonly unknown[]).includes(value);
}

/**
 * Whether a message carries a page identity: a document id (a string, at most `maxDocumentIdLength`
 * long), and integer revision and request ids.
 */
export function hasPageIdentity(
  message: Readonly<Record<string, unknown>>,
  maxDocumentIdLength = MAX_DOCUMENT_ID_LENGTH,
): boolean {
  return isBoundedString(message.documentId, maxDocumentIdLength)
    && Number.isSafeInteger(message.revision)
    && Number.isSafeInteger(message.requestId);
}
