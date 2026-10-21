/**
 * Message registry: webview-to-host message types that are validated in one place.
 *
 * Adding a message type takes two steps:
 *   1. Add a validator to `REGISTERED_PREVIEW_MESSAGES` below, keyed by the message `type`. It
 *      checks only the payload fields; the common envelope (`documentId`, `documentVersion`,
 *      `requestId`) is checked by the checker before the validator runs.
 *   2. Register a host handler in `registeredMessageHandlers` (src/extension.ts). Stale messages
 *      are dropped before the handler runs, with the same gate as every other preview message.
 *
 * A registered type is never accepted by `isPreviewSyncMessage`; do not add it there. This module
 * must not import `vscode`.
 */

import { isValidAnchor, MAX_BODY_LENGTH } from "../comments/commentModel";
import { isValidLabelName } from "../mapping/labelRename";
import { isBase64, MAX_PASTED_IMAGE_BASE64_LENGTH, PASTED_IMAGE_MIME_TYPES } from "../mapping/pastedImage";

export type MessageValidator = (message: Readonly<Record<string, unknown>>) => boolean;

export interface RegisteredPreviewMessage {
  type: string;
  documentId: string;
  documentVersion: number;
  requestId: number;
  editId?: string;
  [field: string]: unknown;
}

const MAX_DOCUMENT_ID_LENGTH = 4096;

export function isBoundedString(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

export function isSourceLine(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1;
}

export function isOneOf<T extends string | number>(value: unknown, list: readonly T[]): value is T {
  return (list as readonly unknown[]).includes(value);
}

export function createPreviewMessageChecker(
  validators: Readonly<Record<string, MessageValidator>>,
): (value: unknown) => value is RegisteredPreviewMessage {
  return (value: unknown): value is RegisteredPreviewMessage => {
    if (!value || typeof value !== "object") {
      return false;
    }
    const message = value as Readonly<Record<string, unknown>>;
    const type = message.type;
    return typeof type === "string"
      && Object.hasOwn(validators, type)
      && typeof validators[type] === "function"
      && isBoundedString(message.documentId, MAX_DOCUMENT_ID_LENGTH)
      && Number.isSafeInteger(message.documentVersion)
      && Number.isSafeInteger(message.requestId)
      && validators[type](message);
  };
}

const VIEW_PREFERENCE_VALIDATORS: Record<string, (value: unknown) => boolean> = {
  zoom: (value) => Number.isSafeInteger(value) && (value as number) >= 70 && (value as number) <= 200,
  widthMode: (value) => isOneOf(value, ["margin", "auto", "full"] as const),
  toc: (value) => typeof value === "boolean",
  incomingChanges: (value) => typeof value === "boolean",
};

const MAX_COPY_TEXT_LENGTH = 1_000_000;

const MAX_EDIT_ID_LENGTH = 100;

/** The list and pick requests of the MyST palette carry only the id their answer is matched by. */
const isHostRequest: MessageValidator = (message) =>
  isBoundedString(message.editId, MAX_EDIT_ID_LENGTH) && message.editId !== "";

const isPinViewportTop = (value: unknown): boolean => value === undefined
  || (typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 100000);

const isCommentBody = (value: unknown): boolean =>
  typeof value === "string" && value.length >= 1 && value.length <= MAX_BODY_LENGTH;

const PALETTE_MODES = ["strict", "gfm", "myst"] as const;

export const REGISTERED_PREVIEW_MESSAGES: Record<string, MessageValidator> = {
  // Raw code of a code block, copied to the clipboard by the host.
  previewCopyText: (message) => isBoundedString(message.text, MAX_COPY_TEXT_LENGTH),
  // Back / Next of toolbar row 2: the host walks the panel's navigation history.
  previewHistoryGo: (message) => isOneOf(message.direction, ["back", "forward"] as const),
  // A view preference of toolbar row 2 (zoom, width mode, TOC, incoming changes).
  previewViewPreferenceChanged: (message) => typeof message.preference === "string"
    && Object.hasOwn(VIEW_PREFERENCE_VALIDATORS, message.preference)
    && VIEW_PREFERENCE_VALIDATORS[message.preference](message.value),
  // The palette mode select of the edition palette: strict, GFM or MyST buttons (workspace state).
  previewPaletteModeChanged: (message) => isOneOf(message.mode, PALETTE_MODES),
  // Rename of a MyST label from its anchor icon: the source line of `(oldName)=` and both names.
  previewLabelRename: (message) => isSourceLine(message.line)
    && isValidLabelName(message.oldName) && isValidLabelName(message.newName),
  // Move of a body block past its neighbour from the "+" bar: both line ranges, the direction and
  // the moved block's viewport top (the host knows the new line). The host re-checks the ranges.
  previewBlockMove: (message) => isSourceLine(message.line) && isSourceLine(message.endLine)
    && isSourceLine(message.neighbourLine) && isSourceLine(message.neighbourEndLine)
    && isOneOf(message.direction, ["up", "down"] as const)
    && (message.pinViewportTop === undefined
      || (typeof message.pinViewportTop === "number" && Number.isFinite(message.pinViewportTop)
        && Math.abs(message.pinViewportTop) <= 100000)),
  // Copy, cut and paste of selected blocks as Markdown (T40): the source lines of the selection
  // (or the line to paste after) and the viewport top of the block the screen is held on. The
  // host re-checks every line against the document.
  previewBlocksCopy: (message) => isSourceLine(message.line) && isSourceLine(message.endLine),
  previewBlocksCut: (message) => isSourceLine(message.line) && isSourceLine(message.endLine)
    && isPinViewportTop(message.pinViewportTop),
  previewBlocksPaste: (message) => Number.isSafeInteger(message.insertAfterLine)
    && (message.insertAfterLine as number) >= 0
    && (message.pinLine === undefined || isSourceLine(message.pinLine))
    && isPinViewportTop(message.pinViewportTop),
  // Review comments (T43): a new thread on a selection and a reply. The host picks the author, the
  // ids and the time; it refuses read-only previews and writes the sidecar file.
  previewCommentCreate: (message) => isValidAnchor(message.anchor) && isCommentBody(message.body),
  previewCommentReply: (message) => isBoundedString(message.threadId, MAX_BODY_LENGTH)
    && message.threadId !== "" && isCommentBody(message.body),
  // Resolve, reopen and delete a thread (T44). The host refuses read-only previews and answers.
  previewCommentResolve: (message) => isBoundedString(message.threadId, MAX_BODY_LENGTH)
    && message.threadId !== "" && typeof message.resolved === "boolean",
  previewCommentDelete: (message) => isBoundedString(message.threadId, MAX_BODY_LENGTH)
    && message.threadId !== "",
  // The MyST palette's pickers: labels of the document, citation keys of the workspace `.bib`
  // files, and a native open dialog for a `{doc}` path. They read only; the answer repeats `editId`.
  previewListTargets: isHostRequest,
  previewListCitations: isHostRequest,
  previewPickDocument: isHostRequest,
  // The image button and the Figure button: a native open dialog for an image file.
  previewPickImage: isHostRequest,
  // An image pasted into the text box: its MIME type and bytes as plain base64. The host sniffs
  // the bytes, picks the file name and writes next to the document; the page names nothing.
  previewPasteImage: (message) => isHostRequest(message)
    && isOneOf(message.mime, PASTED_IMAGE_MIME_TYPES as readonly string[])
    && typeof message.dataBase64 === "string"
    && message.dataBase64.length > 0
    && message.dataBase64.length <= MAX_PASTED_IMAGE_BASE64_LENGTH
    && isBase64(message.dataBase64),
};

export const isRegisteredPreviewMessage = createPreviewMessageChecker(REGISTERED_PREVIEW_MESSAGES);
