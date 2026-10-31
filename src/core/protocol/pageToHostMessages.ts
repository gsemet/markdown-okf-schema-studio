/**
 * The page-to-host message types: one interface per message a preview page sends, the
 * {@link PageToHostMessage} union, and the page-state family. The validators of these messages
 * are in `pageToHost.ts`, which re-exports every type of this module.
 */

import type { CommentAnchor } from "../comments/commentModel";
import type { PreviewThemeMode } from "../state/previewTheme";
import type { ViewPreferenceKey } from "../state/previewViewPreferences";
import type { PageIdentity } from "./envelope";

/** The envelope of every page message: its type and the identity of the render the page shows. */
export interface PageMessageBase<T extends string> extends PageIdentity {
  /** The message type, the discriminant of {@link PageToHostMessage}. */
  readonly type: T;
}

// ---------------------------------------------------------------------------------------------
// Page-state messages

/**
 * Optional fields any page-state message may carry. The validator checks the first group whenever
 * it is present; the second group is reported state that the host normalizes before use.
 */
export interface PageStateFields {
  /** A 1-based source line (the block the message is about, or the line to reveal). */
  line?: number;
  /** The last source line of that block. */
  endLine?: number;
  /** The source line at the reading line of the page. */
  sourceLine?: number;
  /** The fractional source line the page's scroll anchor holds (see `docs/scroll-anchoring.md`). */
  anchorLine?: number;
  /** The source line of the selection the page marks. */
  selectionLine?: number;
  /** The page's scroll offset in CSS pixels. */
  scrollTop?: number;
  /** The theme mode the toolbar shows. */
  previewThemeMode?: PreviewThemeMode;
  /** The state of the toolbar's anchor button. */
  anchorToEditor?: boolean;
  /** The state of the toolbar's edit button. */
  editMode?: boolean;
  /** The navigation request of a link (`data-sphinx-preview-navigation`). */
  request?: string;
  /** Not checked by the validator: the file of the revealed block. */
  sourceFile?: string;
  /** Not checked by the validator: reported page state, normalized by the host. */
  focusedBlockId?: string;
  /** Not checked by the validator: reported page state, normalized by the host. */
  selectedText?: string;
  /** Not checked by the validator: reported page state, normalized by the host. */
  openDisclosures?: number[];
  /** Not checked by the validator: reported page state, normalized by the host. */
  descriptionsCollapsed?: boolean;
  /** Not checked by the validator: how a reveal was started. */
  activation?: "click" | "keyboard";
}

/** A page-state message: the envelope plus the optional {@link PageStateFields}. */
export interface PageStateMessage<T extends string> extends PageMessageBase<T>, PageStateFields {}

/** The page listens and shows its render (after a load or a content patch). */
export interface PreviewReadyMessage extends PageStateMessage<"previewReady"> {
  /** True while the page has an inline block editor open. */
  blockEditOpen?: boolean;
}

/** The reader scrolled the page: the host may move the text editor. */
export type PreviewScrollMessage = PageStateMessage<"previewScroll">;
/** The reader asked to reveal a block in the text editor (click or keyboard). */
export type PreviewRevealMessage = PageStateMessage<"previewReveal">;
/** The page's scroll and disclosure state, kept by the host for the next render. */
export type PreviewStateMessage = PageStateMessage<"previewState">;
/** The toolbar's Refresh button. */
export type PreviewRefreshMessage = PageStateMessage<"previewRefresh">;
/** The reader followed a link; `request` names it. */
export type PreviewLinkMessage = PageStateMessage<"previewLink">;

/** The links that came into view: the host answers with their targets (`previewLinkTargets`). */
export interface PreviewLinkDiscoverMessage extends PageStateMessage<"previewLinkDiscover"> {
  /** At most 64 navigation requests of at most 4096 characters. */
  requests: string[];
}

/** The theme mode chosen with the toolbar. */
export interface PreviewThemeModeChangedMessage extends PageStateMessage<"previewThemeModeChanged"> {
  previewThemeMode: PreviewThemeMode;
}

/** The anchor button was toggled: the preview follows the text editor or not. */
export interface PreviewAnchorModeChangedMessage extends PageStateMessage<"previewAnchorModeChanged"> {
  anchorToEditor: boolean;
}

/** The edit button was toggled (remembered for the workspace). */
export interface PreviewEditModeChangedMessage extends PageStateMessage<"previewEditModeChanged"> {
  editMode: boolean;
}

/** Fields shared by the three block-edit messages: which editor and which source lines. */
export interface BlockEditFields {
  /** The editor's id, repeated in the host's answer. */
  editId: string;
  line: number;
  endLine: number;
  /** Block insertion: the source line after which the new block goes (0 = start of the body). */
  insertAfterLine?: number;
}

/** The fields of a save that the validator refuses on an open or a cancel. */
export interface NoSaveFields {
  final?: undefined;
  flush?: undefined;
  pinLine?: undefined;
  pinViewportTop?: undefined;
}

/** The page opens an inline block editor: the host answers with the block's source text. */
export interface PreviewEditOpenMessage extends PageStateMessage<"previewEditOpen">, BlockEditFields, NoSaveFields {
  line: number;
  endLine: number;
}

/** The text of an open block editor: an autosave (`final: false`) or the final save. */
export interface PreviewEditSaveMessage extends PageStateMessage<"previewEditSave">, BlockEditFields {
  line: number;
  endLine: number;
  originalText: string;
  editedText: string;
  /** False for an autosave; true or absent for the final save. */
  final?: boolean;
  /** A save sent by the flush before a navigation. */
  flush?: true;
  /** Final saves: source line and viewport top of the edited element (anchoring rule R7). */
  pinLine?: number;
  pinViewportTop?: number;
}

/** The block editor was cancelled. */
export interface PreviewEditCancelMessage extends PageStateMessage<"previewEditCancel">, BlockEditFields, NoSaveFields {
  line: number;
  endLine: number;
}

/** The three block-edit messages. */
export type BlockEditMessage = PreviewEditOpenMessage | PreviewEditSaveMessage | PreviewEditCancelMessage;

/** A change of one frontmatter field from the properties table. */
export interface PreviewFrontmatterSaveMessage extends PageStateMessage<"previewFrontmatterSave"> {
  editId: string;
  fieldName: string;
  /** Absent for a value edit. */
  frontmatterAction?: "add" | "remove";
  /** For an add: the existing top-level field after which the new field is inserted. */
  afterField?: string;
  newFieldName?: string;
  /** The new value (absent only for a remove). */
  fieldValue?: unknown;
  fieldValueFormat?: "yaml";
  /** For a value edit: "plain" writes a safe string as a plain YAML scalar (a new custom key). */
  fieldValueStyle?: "plain";
  /** A value edit sent by the flush before a navigation: text that is not valid YAML is kept as typed. */
  flush?: true;
  pinLine?: number;
  pinViewportTop?: number;
}

/** A task-list checkbox or a radio option was clicked. */
export interface PreviewCheckboxToggleMessage extends PageStateMessage<"previewCheckboxToggle"> {
  editId: string;
  line: number;
  endLine: number;
  /** Zero-based column of the marker's opening bracket. */
  column: number;
  /** The requested state. */
  checked: boolean;
  /**
   * For a radio option (`( )` at the start of a list item): every option of its group, the clicked
   * one included, by the line and column of its opening parenthesis. `checked` is then true.
   */
  radioGroup?: Array<{ line: number; column: number }>;
}

/** Every page-state message. */
export type PageStateMessageUnion =
  | PreviewReadyMessage
  | PreviewScrollMessage
  | PreviewRevealMessage
  | PreviewStateMessage
  | PreviewLinkMessage
  | PreviewLinkDiscoverMessage
  | PreviewThemeModeChangedMessage
  | PreviewRefreshMessage
  | PreviewAnchorModeChangedMessage
  | PreviewEditOpenMessage
  | PreviewEditSaveMessage
  | PreviewEditCancelMessage
  | PreviewFrontmatterSaveMessage
  | PreviewCheckboxToggleMessage
  | PreviewEditModeChangedMessage;

/** The type names of the page-state family, which accept a document id of any length. */
export const PAGE_STATE_MESSAGE_TYPES: ReadonlySet<PageStateMessageUnion["type"]> = new Set([
  "previewReady", "previewScroll", "previewReveal", "previewState", "previewLink", "previewLinkDiscover",
  "previewThemeModeChanged", "previewRefresh", "previewAnchorModeChanged", "previewEditOpen",
  "previewEditSave", "previewEditCancel", "previewFrontmatterSave", "previewCheckboxToggle",
  "previewEditModeChanged",
] as const);

/** Whether a page message belongs to the page-state family. */
export function isPageStateMessage(message: { readonly type: string }): message is PageStateMessageUnion {
  return (PAGE_STATE_MESSAGE_TYPES as ReadonlySet<string>).has(message.type);
}

// ---------------------------------------------------------------------------------------------
// Registered messages

/** A host round trip of the page: the answer (`<type>Result`) repeats `editId`. */
export interface HostRequestFields {
  editId: string;
}

/** Raw code of a code block, copied to the clipboard by the host. */
export interface PreviewCopyTextMessage extends PageMessageBase<"previewCopyText">, HostRequestFields {
  text: string;
  /** True when the request follows a click the user made on the copy button (the host refuses without it). */
  userGesture: boolean;
}

/** Back / Next of toolbar row 2: the host walks the panel's navigation history. */
export interface PreviewHistoryGoMessage extends PageMessageBase<"previewHistoryGo"> {
  direction: "back" | "forward";
}

/** A view preference of the toolbar, with a value valid for that preference. */
export interface PreviewViewPreferenceChangedMessage extends PageMessageBase<"previewViewPreferenceChanged"> {
  preference: ViewPreferenceKey;
  value: unknown;
}

/** The palette mode select of the edition palette (workspace state). */
export interface PreviewPaletteModeChangedMessage extends PageMessageBase<"previewPaletteModeChanged"> {
  mode: "strict" | "gfm" | "myst" | "full";
}

/** Rename of a MyST label from its anchor icon. */
export interface PreviewLabelRenameMessage extends PageMessageBase<"previewLabelRename"> {
  /** Not checked by the validator: repeated in the answer, which the page matches by it. */
  editId?: string;
  /** The source line of `(oldName)=`. */
  line: number;
  oldName: string;
  newName: string;
}

/** Reply to the inline comment thread (`<!-- THREAD`) at these source lines. */
export interface PreviewThreadReplyMessage extends PageMessageBase<"previewThreadReply">, HostRequestFields {
  line: number;
  endLine: number;
  text: string;
}

/** Delete the inline comment thread at these source lines. */
export interface PreviewThreadDeleteMessage extends PageMessageBase<"previewThreadDelete">, HostRequestFields {
  line: number;
  endLine: number;
}

/** One replacement of the find bar: a matched text of the rendered page and what it becomes. */
export interface FindReplaceItem {
  /** The source lines of the mapped block the match is in. */
  line: number;
  endLine: number;
  /** The matched text as the page shows it. */
  find: string;
  /** Which occurrence of `find` among the `occurrences` of the block's rendered text it is (0-based). */
  occurrence: number;
  occurrences: number;
  /** The replacement text (a regular expression's `$1` groups are already expanded). */
  replacement: string;
}

/**
 * Replace matches of the find bar: the host edits only the matched source spans. A dry run plans
 * the replacement and answers its counts without editing the document.
 */
export interface PreviewFindReplaceMessage extends PageMessageBase<"previewFindReplace">, HostRequestFields {
  items: FindReplaceItem[];
  dryRun?: boolean;
}

/** Move of a body block past its neighbour from the "+" bar. */
export interface PreviewBlockMoveMessage extends PageMessageBase<"previewBlockMove"> {
  line: number;
  endLine: number;
  neighbourLine: number;
  neighbourEndLine: number;
  direction: "up" | "down";
  /** The moved block's viewport top (the host knows the new line). */
  pinViewportTop?: number;
}

/** Copy of the selected blocks as Markdown. */
export interface PreviewBlocksCopyMessage extends PageMessageBase<"previewBlocksCopy"> {
  line: number;
  endLine: number;
}

/** Cut of the selected blocks. */
export interface PreviewBlocksCutMessage extends PageMessageBase<"previewBlocksCut"> {
  line: number;
  endLine: number;
  pinViewportTop?: number;
}

/** Paste of the clipboard as blocks after a source line (0 = start of the body). */
export interface PreviewBlocksPasteMessage extends PageMessageBase<"previewBlocksPaste"> {
  insertAfterLine: number;
  pinLine?: number;
  pinViewportTop?: number;
}

/** Files dropped from the Explorer: their `file:` addresses and the source line to write the links after. */
export interface PreviewDropFilesMessage extends PageMessageBase<"previewDropFiles"> {
  insertAfterLine: number;
  uris: string[];
  pinLine?: number;
  pinViewportTop?: number;
}

/** A new review comment thread on a selection. */
export interface PreviewCommentCreateMessage extends PageMessageBase<"previewCommentCreate"> {
  anchor: CommentAnchor;
  body: string;
}

/** A reply to a review comment thread. */
export interface PreviewCommentReplyMessage extends PageMessageBase<"previewCommentReply"> {
  threadId: string;
  body: string;
}

/** Resolve or reopen a review comment thread. */
export interface PreviewCommentResolveMessage extends PageMessageBase<"previewCommentResolve"> {
  threadId: string;
  resolved: boolean;
}

/** Delete a review comment thread. */
export interface PreviewCommentDeleteMessage extends PageMessageBase<"previewCommentDelete"> {
  threadId: string;
}

/** The page's answer to a host flush request: its final saves were posted before it. */
export interface PreviewEditFlushedMessage extends PageMessageBase<"previewEditFlushed"> {
  flushId: string;
  flushed: boolean;
}

/** The page closed the inline editor the host asked about with `previewEditorWatch`. */
export interface PreviewEditClosedMessage extends PageMessageBase<"previewEditClosed"> {
  editId: string;
}

/** The labels of the document, for the MyST palette. */
export type PreviewListTargetsMessage = PageMessageBase<"previewListTargets"> & HostRequestFields;
/** The citation keys of the workspace `.bib` files, for the MyST palette. */
export type PreviewListCitationsMessage = PageMessageBase<"previewListCitations"> & HostRequestFields;
/** A native open dialog for a `{doc}` path. */
export type PreviewPickDocumentMessage = PageMessageBase<"previewPickDocument"> & HostRequestFields;
/** A native open dialog for an image file. */
export type PreviewPickImageMessage = PageMessageBase<"previewPickImage"> & HostRequestFields;

/** An image pasted into the text box, as plain base64; the host names and writes the file. */
export interface PreviewPasteImageMessage extends PageMessageBase<"previewPasteImage">, HostRequestFields {
  mime: string;
  dataBase64: string;
}

/** A local file of a PlantUML `!include` for the built-in engine. */
export interface PreviewPlantUmlIncludeMessage extends PageMessageBase<"previewPlantUmlInclude">, HostRequestFields {
  /** The name the directive gives. */
  path: string;
  /** The id the host gave the including file, or null for the document itself. */
  from: string | null;
}

/** The warning banner's button opens the Problems view. */
export type PreviewShowProblemsMessage = PageMessageBase<"previewShowProblems">;

/** The warning banner was closed for the warning set named by `key`. */
export interface PreviewWarningBannerClosedMessage extends PageMessageBase<"previewWarningBannerClosed"> {
  key: string;
}

/** Rich text pasted into the text box: the clipboard's HTML, converted to Markdown by the host. */
export interface PreviewPasteHtmlMessage extends PageMessageBase<"previewPasteHtml">, HostRequestFields {
  html: string;
}

/** Every message a preview page sends to its host. */
export type PageToHostMessage =
  | PageStateMessageUnion
  | PreviewCopyTextMessage
  | PreviewHistoryGoMessage
  | PreviewViewPreferenceChangedMessage
  | PreviewPaletteModeChangedMessage
  | PreviewLabelRenameMessage
  | PreviewThreadReplyMessage
  | PreviewThreadDeleteMessage
  | PreviewFindReplaceMessage
  | PreviewBlockMoveMessage
  | PreviewBlocksCopyMessage
  | PreviewBlocksCutMessage
  | PreviewBlocksPasteMessage
  | PreviewDropFilesMessage
  | PreviewCommentCreateMessage
  | PreviewCommentReplyMessage
  | PreviewCommentResolveMessage
  | PreviewCommentDeleteMessage
  | PreviewEditFlushedMessage
  | PreviewEditClosedMessage
  | PreviewListTargetsMessage
  | PreviewListCitationsMessage
  | PreviewPickDocumentMessage
  | PreviewPickImageMessage
  | PreviewPasteImageMessage
  | PreviewPlantUmlIncludeMessage
  | PreviewShowProblemsMessage
  | PreviewWarningBannerClosedMessage
  | PreviewPasteHtmlMessage;

/** The type names of {@link PageToHostMessage}. */
export type PageToHostType = PageToHostMessage["type"];

/** The page message of one type (or of a union of types). */
export type PageMessageOf<T extends PageToHostType> = Extract<PageToHostMessage, { type: T }>;
