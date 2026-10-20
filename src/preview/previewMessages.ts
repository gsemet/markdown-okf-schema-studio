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

import { isValidLabelName } from "../mapping/labelRename";

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
};

export const isRegisteredPreviewMessage = createPreviewMessageChecker(REGISTERED_PREVIEW_MESSAGES);
