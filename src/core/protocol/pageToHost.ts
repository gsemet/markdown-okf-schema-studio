/**
 * Page-to-host messages: every message a preview page sends, as one discriminated union with one
 * validator per type in {@link PAGE_TO_HOST_VALIDATORS}. Pure module: no host API, no DOM, no Node
 * built-ins, so every host and the tests share it.
 *
 * Adding a message type takes three steps:
 *   1. Add its interface to {@link PageToHostMessage} in `pageToHostMessages.ts` (the envelope comes
 *      from {@link PageMessageBase}).
 *   2. Add its validator to {@link PAGE_TO_HOST_VALIDATORS}, keyed by the type. It checks the
 *      payload; {@link isPageToHostMessage} checks the envelope before it runs. The table is typed
 *      by the union, so a type without a validator does not compile.
 *   3. Give the host a handler (`on(type, handler)` on its router) and a gate, the rule that drops a
 *      stale message before the handler runs (`PAGE_MESSAGE_GATES` in
 *      `src/session/pageMessages.ts`).
 *
 * Two families share the union. The page-state messages (scrolling, readiness, inline edits; see
 * {@link PAGE_STATE_MESSAGE_TYPES}) were validated as one group before the registry existed: their
 * optional fields are checked on every type that carries them, and a field that belongs to one
 * type (a pin, a checkbox column, a frontmatter action) is refused on every other type. The other
 * types validate their own payload only, and bound the document id.
 */

import { isValidAnchor, MAX_BODY_LENGTH } from "../comments/commentModel";
import { MAX_THREAD_REPLY_LENGTH } from "../comments/inlineThread";
import { isValidLabelName } from "../mapping/labelRename";
import { isBase64, MAX_PASTED_IMAGE_BASE64_LENGTH, PASTED_IMAGE_MIME_TYPES } from "../mapping/pastedImage";
import { isPreviewThemeMode } from "../state/previewTheme";
import {
  hasPageIdentity,
  isBoundedString,
  isOneOf,
  isSourceLine,
  MAX_DOCUMENT_ID_LENGTH,
  type MessageValidator,
} from "./envelope";
import {
  PAGE_STATE_MESSAGE_TYPES,
  type PageStateMessageUnion,
  type PageToHostMessage,
  type PageToHostType,
} from "./pageToHostMessages";

export type * from "./pageToHostMessages";
export { isPageStateMessage } from "./pageToHostMessages";

// ---------------------------------------------------------------------------------------------
// Validators

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-013
const VIEW_PREFERENCE_VALIDATORS: Record<string, (value: unknown) => boolean> = {
  zoom: (value) => Number.isSafeInteger(value) && (value as number) >= 70 && (value as number) <= 200,
  widthMode: (value) => isOneOf(value, ["margin", "auto", "full"] as const),
  toc: (value) => typeof value === "boolean",
  incomingChanges: (value) => typeof value === "boolean",
  comments: (value) => typeof value === "boolean",
  toolbarCollapsed: (value) => typeof value === "boolean",
};

export const MAX_COPY_TEXT_LENGTH = 1_000_000;
const MAX_COPY_TEXT_TRANSPORT_LENGTH = 20_000_000;

const MAX_EDIT_ID_LENGTH = 100;

/** Most replacements one find-and-replace request carries, and the longest text of one. */
const MAX_FIND_REPLACE_ITEMS = 5000;
const MAX_FIND_REPLACE_TEXT_LENGTH = 2000;

const MAX_PASTED_HTML_LENGTH = 1_000_000;

const MAX_PLANTUML_INCLUDE_PATH_LENGTH = 4096;

const MAX_WARNING_KEY_LENGTH = 32;

// @implements_req SwRS-MDOKFSTUDIO-TRUST-090
/** The list and pick requests of the MyST palette carry only the id their answer is matched by. */
const isHostRequest: MessageValidator = (message) =>
  isBoundedString(message.editId, MAX_EDIT_ID_LENGTH) && message.editId !== "";

const isFindReplaceItem = (item: unknown): boolean => {
  if (typeof item !== "object" || item === null) return false;
  const value = item as Record<string, unknown>;
  return isSourceLine(value.line) && isSourceLine(value.endLine) && (value.endLine as number) >= (value.line as number)
    && typeof value.find === "string" && value.find !== "" && value.find.length <= MAX_FIND_REPLACE_TEXT_LENGTH
    && typeof value.replacement === "string" && value.replacement.length <= MAX_FIND_REPLACE_TEXT_LENGTH
    && Number.isSafeInteger(value.occurrence) && (value.occurrence as number) >= 0
    && Number.isSafeInteger(value.occurrences) && (value.occurrences as number) > (value.occurrence as number);
};

/** Most options one radio group request names. */
const MAX_RADIO_GROUP_OPTIONS = 256;

// @implements_req SwRS-MDOKFSTUDIO-GFM-039
/**
 * The options of a radio choice: 2 to 256 distinct source positions, the clicked one among them,
 * and a request that selects (never clears) the clicked option.
 */
const isRadioGroup: MessageValidator = (message) => {
  const group = message.radioGroup;
  if (message.checked !== true || !Array.isArray(group) || group.length < 2 || group.length > MAX_RADIO_GROUP_OPTIONS) {
    return false;
  }
  const keys = new Set<string>();
  for (const option of group as unknown[]) {
    if (typeof option !== "object" || option === null) return false;
    const { line, column } = option as Record<string, unknown>;
    if (!isSourceLine(line) || !Number.isSafeInteger(column) || (column as number) < 0) return false;
    keys.add(`${String(line)}:${String(column)}`);
  }
  return keys.size === group.length && keys.has(`${String(message.line)}:${String(message.column)}`);
};

const isPinViewportTop = (value: unknown): boolean => value === undefined
  || (typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 100000);

const isCommentBody = (value: unknown): boolean =>
  typeof value === "string" && value.length >= 1 && value.length <= MAX_BODY_LENGTH;

const PALETTE_MODES = ["strict", "gfm", "myst", "full"] as const;

type PageStateType = PageStateMessageUnion["type"];

const BLOCK_EDIT_TYPES: readonly PageStateType[] = ["previewEditOpen", "previewEditSave", "previewEditCancel"];

const EDIT_REQUEST_TYPES: readonly PageStateType[] = [
  ...BLOCK_EDIT_TYPES, "previewFrontmatterSave", "previewCheckboxToggle",
];

/**
 * The optional fields of a page-state message of type `type`: each one is valid when present, and
 * a field that belongs to other types is absent.
 */
function hasValidStateFields(message: Readonly<Record<string, unknown>>, type: PageStateType): boolean {
  const frontmatter = type === "previewFrontmatterSave";
  const optionalLine = (value: unknown): boolean => value === undefined || isSourceLine(value);
  const pinOwner = frontmatter || (type === "previewEditSave" && message.final === true);
  return optionalLine(message.line)
    && optionalLine(message.endLine)
    && optionalLine(message.sourceLine)
    && (message.anchorLine === undefined
      || (typeof message.anchorLine === "number" && Number.isFinite(message.anchorLine) && message.anchorLine >= 1))
    && optionalLine(message.selectionLine)
    && (message.scrollTop === undefined
      || (typeof message.scrollTop === "number" && Number.isFinite(message.scrollTop) && message.scrollTop >= 0))
    && (message.previewThemeMode === undefined || isPreviewThemeMode(message.previewThemeMode))
    && (message.anchorToEditor === undefined || typeof message.anchorToEditor === "boolean")
    && (message.editMode === undefined || typeof message.editMode === "boolean")
    && (message.request === undefined || typeof message.request === "string")
    && ((message.pinLine === undefined && message.pinViewportTop === undefined)
      || (pinOwner
        && isSourceLine(message.pinLine)
        && typeof message.pinViewportTop === "number"
        && Number.isFinite(message.pinViewportTop)
        && Math.abs(message.pinViewportTop) <= 100000))
    && (message.insertAfterLine === undefined
      || (BLOCK_EDIT_TYPES.includes(type)
        && Number.isSafeInteger(message.insertAfterLine) && (message.insertAfterLine as number) >= 0))
    && (message.blockEditOpen === undefined
      || (type === "previewReady" && typeof message.blockEditOpen === "boolean"))
    && (message.final === undefined || (type === "previewEditSave" && typeof message.final === "boolean"))
    && (message.fieldValueFormat === undefined || (frontmatter && message.fieldValueFormat === "yaml"))
    && (message.fieldValueStyle === undefined
      || (frontmatter
        && message.fieldValueStyle === "plain"
        && message.frontmatterAction === undefined
        && message.fieldValueFormat === undefined))
    && (message.flush === undefined
      || ((frontmatter || type === "previewEditSave") && message.flush === true))
    && (message.newFieldName === undefined || (frontmatter && typeof message.newFieldName === "string"))
    && (type === "previewCheckboxToggle"
      || (message.column === undefined && message.checked === undefined && message.radioGroup === undefined))
    && (message.afterField === undefined
      || (frontmatter
        && message.frontmatterAction === "add"
        && typeof message.afterField === "string"
        && message.afterField.length >= 1
        && message.afterField.length <= 1024
        && !/[\r\n]/u.test(message.afterField)))
    && (message.frontmatterAction === undefined
      || (frontmatter && (message.frontmatterAction === "add" || message.frontmatterAction === "remove")))
    && (!EDIT_REQUEST_TYPES.includes(type) || isEditRequest(message, type));
}

/** An edit request names its editor, and a field or a line range. */
function isEditRequest(message: Readonly<Record<string, unknown>>, type: PageStateType): boolean {
  return typeof message.editId === "string"
    && message.editId.length > 0
    && (type === "previewFrontmatterSave"
      ? typeof message.fieldName === "string" && message.fieldName.length > 0
      : message.line !== undefined && message.endLine !== undefined
        && (message.endLine as number) >= (message.line as number));
}

/** The validator of a page-state type: its optional fields, then `payload`. */
const stateMessage = (type: PageStateType, payload: MessageValidator = () => true): MessageValidator =>
  (message) => hasValidStateFields(message, type) && payload(message);

/**
 * One validator per page message type, keyed by the type. A validator checks the payload only; the
 * envelope is checked by {@link isPageToHostMessage} before it runs.
 */
 const PAGE_TO_HOST_VALIDATORS: { readonly [T in PageToHostType]: MessageValidator } = {
  // Page state: readiness, scrolling, reveal, the scroll state, links and the toolbar toggles.
  previewReady: stateMessage("previewReady"),
  previewScroll: stateMessage("previewScroll"),
  previewReveal: stateMessage("previewReveal"),
  previewState: stateMessage("previewState"),
  previewLink: stateMessage("previewLink"),
  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-083
  previewLinkDiscover: stateMessage("previewLinkDiscover", (message) => Array.isArray(message.requests)
    && message.requests.length <= 64
    && message.requests.every((request) => typeof request === "string" && request.length <= 4096)),
  // @implements_req SwRS-MDOKFSTUDIO-THEME-013
  previewThemeModeChanged: stateMessage("previewThemeModeChanged",
    (message) => isPreviewThemeMode(message.previewThemeMode)),
  previewRefresh: stateMessage("previewRefresh"),
  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-126
  previewAnchorModeChanged: stateMessage("previewAnchorModeChanged",
    (message) => typeof message.anchorToEditor === "boolean"),
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-236
  previewEditModeChanged: stateMessage("previewEditModeChanged", (message) => typeof message.editMode === "boolean"),
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-237
  // Inline edits: a block editor, a frontmatter field and a task-list checkbox.
  previewEditOpen: stateMessage("previewEditOpen"),
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-238
  previewEditSave: stateMessage("previewEditSave",
    (message) => typeof message.originalText === "string" && typeof message.editedText === "string"),
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-239
  previewEditCancel: stateMessage("previewEditCancel"),
  // @implements_req SwRS-MDOKFSTUDIO-FMEDIT-054
  previewFrontmatterSave: stateMessage("previewFrontmatterSave", (message) => message.frontmatterAction === "remove"
    || Object.prototype.hasOwnProperty.call(message, "fieldValue")),
  // @implements_req SwRS-MDOKFSTUDIO-GFM-027
  previewCheckboxToggle: stateMessage("previewCheckboxToggle", (message) => Number.isSafeInteger(message.column)
    && (message.column as number) >= 0
    && typeof message.checked === "boolean"
    && message.line === message.endLine
    && (message.radioGroup === undefined || isRadioGroup(message))),
  // @implements_req SwRS-MDOKFSTUDIO-CODE-026
  // Raw code of a code block, copied to the clipboard by the host.
  // The size limit is the host's to answer (`previewCopyTextResult`); the shape check only keeps
  // a message of absurd size out of the host.
  previewCopyText: (message) => isHostRequest(message) && isBoundedString(message.text, MAX_COPY_TEXT_TRANSPORT_LENGTH)
    && typeof message.userGesture === "boolean",
  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-058
  // Back / Next of toolbar row 2: the host walks the panel's navigation history.
  previewHistoryGo: (message) => isOneOf(message.direction, ["back", "forward"] as const),
  // A view preference of the toolbar (zoom, width mode, TOC, incoming changes, collapsed toolbar).
  previewViewPreferenceChanged: (message) => typeof message.preference === "string"
    && Object.hasOwn(VIEW_PREFERENCE_VALIDATORS, message.preference)
    && VIEW_PREFERENCE_VALIDATORS[message.preference](message.value),
  // @implements_req SwRS-MDOKFSTUDIO-PALETTE-010
  // The palette mode select of the edition palette: strict, GFM or MyST buttons (workspace state).
  previewPaletteModeChanged: (message) => isOneOf(message.mode, PALETTE_MODES),
  // @implements_req SwRS-MDOKFSTUDIO-MYST-051
  // Rename of a MyST label from its anchor icon: the source line of `(oldName)=` and both names.
  previewLabelRename: (message) => isSourceLine(message.line)
    && isValidLabelName(message.oldName) && isValidLabelName(message.newName),
  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-178
  // Inline comment threads (`<!-- THREAD`): reply to or delete the thread at these source lines.
  // The host picks the author and the time and re-checks that the lines are still a thread.
  previewThreadReply: (message) => isHostRequest(message) && isSourceLine(message.line)
    && isSourceLine(message.endLine) && (message.endLine as number) >= (message.line as number)
    && isBoundedString(message.text, MAX_THREAD_REPLY_LENGTH) && message.text.trim() !== "",
  previewThreadDelete: (message) => isHostRequest(message) && isSourceLine(message.line)
    && isSourceLine(message.endLine) && (message.endLine as number) >= (message.line as number),
  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-012
  // Find and replace: matches of the find bar as (source lines, matched text, occurrence, replacement).
  previewFindReplace: (message) => isHostRequest(message) && Array.isArray(message.items)
    && message.items.length >= 1 && message.items.length <= MAX_FIND_REPLACE_ITEMS
    && message.items.every(isFindReplaceItem),
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-240
  // Move of a body block past its neighbour from the "+" bar: both line ranges, the direction and
  // the moved block's viewport top (the host knows the new line). The host re-checks the ranges.
  previewBlockMove: (message) => isSourceLine(message.line) && isSourceLine(message.endLine)
    && isSourceLine(message.neighbourLine) && isSourceLine(message.neighbourEndLine)
    && isOneOf(message.direction, ["up", "down"] as const)
    && (message.pinViewportTop === undefined
      || (typeof message.pinViewportTop === "number" && Number.isFinite(message.pinViewportTop)
        && Math.abs(message.pinViewportTop) <= 100000)),
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-241
  // Copy, cut and paste of selected blocks as Markdown (T40): the source lines of the selection
  // (or the line to paste after) and the viewport top of the block the screen is held on. The
  // host re-checks every line against the document.
  previewBlocksCopy: (message) => isSourceLine(message.line) && isSourceLine(message.endLine),
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-242
  previewBlocksCut: (message) => isSourceLine(message.line) && isSourceLine(message.endLine)
    && isPinViewportTop(message.pinViewportTop),
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-243
  previewBlocksPaste: (message) => Number.isSafeInteger(message.insertAfterLine)
    && (message.insertAfterLine as number) >= 0
    && (message.pinLine === undefined || isSourceLine(message.pinLine))
    && isPinViewportTop(message.pinViewportTop),
  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-069
  // Review comments (T43): a new thread on a selection and a reply. The host picks the author, the
  // ids and the time; it refuses read-only previews and writes the sidecar file.
  previewCommentCreate: (message) => isValidAnchor(message.anchor) && isCommentBody(message.body),
  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-070
  previewCommentReply: (message) => isBoundedString(message.threadId, MAX_BODY_LENGTH)
    && message.threadId !== "" && isCommentBody(message.body),
  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-071
  // Resolve, reopen and delete a thread (T44). The host refuses read-only previews and answers.
  previewCommentResolve: (message) => isBoundedString(message.threadId, MAX_BODY_LENGTH)
    && message.threadId !== "" && typeof message.resolved === "boolean",
  previewCommentDelete: (message) => isBoundedString(message.threadId, MAX_BODY_LENGTH)
    && message.threadId !== "",
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-245
  // The page's answer to a host flush request (CR 025): it posted the final save of every open
  // editor before this message, so the host can wait for those saves. It edits nothing.
  previewEditFlushed: (message) => isBoundedString(message.flushId, MAX_EDIT_ID_LENGTH)
    && message.flushId !== "" && typeof message.flushed === "boolean",
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-244
  // The page closed an inline editor the host asked about with `previewEditorWatch` (STAB-03): the
  // page updates that waited for it can run. It edits nothing.
  previewEditClosed: (message) => isBoundedString(message.editId, MAX_EDIT_ID_LENGTH) && message.editId !== "",
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
  // @implements_req SwRS-MDOKFSTUDIO-DIAG-050
  // A local file of a PlantUML `!include` for the built-in engine: the name the directive gives and
  // the id (absolute path) the host gave the including file, or null for the document itself. The
  // host reads it under the rules of `{include}`; the answer repeats `editId`.
  previewPlantUmlInclude: (message) => isHostRequest(message)
    && isBoundedString(message.path, MAX_PLANTUML_INCLUDE_PATH_LENGTH) && message.path.trim() !== ""
    && (message.from === null
      || (isBoundedString(message.from, MAX_PLANTUML_INCLUDE_PATH_LENGTH) && message.from !== "")),
  // CR 050: the warning banner's button opens the Problems view; it carries nothing else.
  previewShowProblems: () => true,
  // @implements_req SwRS-MDOKFSTUDIO-TRUST-086
  // CR 050: the warning banner was closed; the key of its warning set (made by the page) is kept
  // for the document until the end of the session.
  previewWarningBannerClosed: (message) => isBoundedString(message.key, MAX_WARNING_KEY_LENGTH)
    && /^[0-9a-z]+-[0-9a-f]{8}$/u.test(message.key),
  // Rich text pasted into the text box: the clipboard's HTML, converted to Markdown by the host.
  previewPasteHtml: (message) => isHostRequest(message)
    && isBoundedString(message.html, MAX_PASTED_HTML_LENGTH) && message.html !== "",
};

// @implements_req SwRS-MDOKFSTUDIO-TRUST-052
/**
 * A checker for a table of validators: the value is an object whose `type` is a key of the table
 * (never an inherited one), whose envelope is a page identity, and whose validator accepts it. The
 * document id is at most {@link MAX_DOCUMENT_ID_LENGTH} long, except for the types listed in
 * `unboundedDocumentIdTypes`.
 */
export function createMessageChecker<M extends { type: string }>(
  validators: Readonly<Record<string, MessageValidator>>,
  unboundedDocumentIdTypes: ReadonlySet<string> = new Set(),
): (value: unknown) => value is M {
  return (value: unknown): value is M => {
    if (!value || typeof value !== "object") {
      return false;
    }
    const message = value as Readonly<Record<string, unknown>>;
    const type = message.type;
    return typeof type === "string"
      && Object.hasOwn(validators, type)
      && typeof validators[type] === "function"
      && hasPageIdentity(message, unboundedDocumentIdTypes.has(type) ? Infinity : MAX_DOCUMENT_ID_LENGTH)
      && validators[type](message);
  };
}

/** Whether a value received from a page is a valid {@link PageToHostMessage}. */
export const isPageToHostMessage: (value: unknown) => value is PageToHostMessage =
  createMessageChecker<PageToHostMessage>(PAGE_TO_HOST_VALIDATORS, PAGE_STATE_MESSAGE_TYPES);
