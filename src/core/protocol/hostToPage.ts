/**
 * Host-to-page messages: every message a host sends to a preview page, as one discriminated union,
 * and the page's filter {@link createHostMessageFilter}, which says per type how a message is
 * matched to the page and what payload it must have. Pure module: no host API, no DOM, no Node
 * built-ins.
 *
 * Adding a message type takes three steps:
 *   1. Add its interface to {@link HostToPageMessage}.
 *   2. Add its rule to the table in {@link createHostMessageFilter}: the addressing (see
 *      {@link HostMessageAddressing}) and, when the page must refuse some payloads, a validator.
 *   3. Register the page handler on the page's router (`router.on(type, handler)`, see
 *      `src/page/hostMessages.ts`) in the page feature that owns it (`src/page/`), and send it from
 *      the host through its typed `postToPage`.
 *
 * The page imports {@link createHostMessageFilter} through its bundle (`src/page/main.ts`).
 */

import type { CommentThread } from "../comments/commentModel";
import type { PageIdentity, RenderIdentity } from "./envelope";

/** A message addressed to the exact render a page shows. */
export interface RenderMessage<T extends string> extends PageIdentity {
  /** The message type, the discriminant of {@link HostToPageMessage}. */
  readonly type: T;
}

/** A 1-based, inclusive range of source lines. */
export interface SourceLineRange {
  start: number;
  end: number;
}

/** One line of a status region: a render diagnostic. */
export interface StatusDiagnostic {
  severity: string;
  text: string;
  code?: string;
}

/** The floating "Preview pending" overlay is shown or hidden. */
export interface PreviewPendingOverlayMessage extends RenderMessage<"previewPendingOverlay"> {
  visible: boolean;
  label: string;
  message: string;
}

/** A new properties table (frontmatter) for the page; `seq` orders the tables of one render. */
export interface PreviewPropertiesTableMessage extends RenderMessage<"previewPropertiesTable"> {
  seq: number;
  markup: string;
}

/** The render a content patch moves the page to, with the reading position to restore. */
export interface ContentPatchNext extends RenderIdentity {
  /** Fractional source line to show at the reading line. */
  initialAnchor?: number;
  /** The edited element's source line and viewport top (anchoring rule R7). */
  initialPin?: { line: number; viewportTop: number };
}

/**
 * The page's new content, replaced in place (T34). The message is addressed to the render the page
 * shows; `next` names the render it moves to.
 */
export interface PreviewContentPatchMessage extends RenderMessage<"previewContentPatch"> {
  next: ContentPatchNext;
  /** The sanitized inner HTML of the content container. */
  contentHtml: string;
  status: "pending" | "success" | "stale" | "error" | "missing-source" | "recovery";
  label: string;
  message?: string;
  diagnostics: readonly StatusDiagnostic[];
  /** The blocks that glow after a change made outside the preview (CR 046). */
  updatedRanges?: readonly SourceLineRange[];
}

/** The answer to `previewFrontmatterSave`: saved, or the error the field shows. */
export interface PreviewFrontmatterResultMessage extends RenderMessage<"previewFrontmatterResult"> {
  editId: string;
  saved?: true;
  error?: string;
}

/** The answer to a block-edit message: the source text to edit, or the error the editor shows. */
export interface PreviewEditSourceMessage extends RenderMessage<"previewEditSource"> {
  editId: string;
  error?: string;
  line?: number;
  endLine?: number;
  originalText?: string;
  insertAfterLine?: number;
}

/** The answer to `previewCheckboxToggle`. */
export interface PreviewCheckboxResultMessage extends RenderMessage<"previewCheckboxResult"> {
  editId: string;
  saved?: true;
  error?: string;
}

/** The answer to `previewLabelRename`, matched by `editId`. */
export interface PreviewLabelRenameResultMessage extends RenderMessage<"previewLabelRenameResult"> {
  editId?: string;
  ok: boolean;
  /** Uses of the old name left in the document. */
  remainingRefs?: number;
  reason?: string;
}

/** The answer to a move of a block. */
export interface PreviewBlockMoveResultMessage extends RenderMessage<"previewBlockMoveResult"> {
  ok: boolean;
  /** The moved block's new first line. */
  line?: number;
  reason?: string;
}

/** The answer to a copy, cut or paste of blocks. */
export interface PreviewBlocksResultMessage extends RenderMessage<"previewBlocksResult"> {
  op: "copy" | "cut" | "paste";
  ok: boolean;
  reason?: string;
}

/** The page message types that are host round trips answered by `<type>Result`. */
export type HostRequestType =
  | "previewCopyText"
  | "previewThreadReply"
  | "previewThreadDelete"
  | "previewListTargets"
  | "previewListCitations"
  | "previewPickDocument"
  | "previewPickImage"
  | "previewPasteImage"
  | "previewPasteHtml"
  | "previewPlantUmlInclude";

/**
 * The answer to a host round trip, matched by `editId` (an edit can move the revision before the
 * answer arrives). The payload depends on the request.
 */
export interface HostRequestResultMessage extends RenderMessage<`${HostRequestType}Result`> {
  editId: string;
  ok: boolean;
  reason?: string;
  /** List requests: the choices and whether the list was cut. */
  items?: ReadonlyArray<{ value: string; label: string; detail?: string }>;
  truncated?: boolean;
  /** Pickers: the chosen path, or `cancelled`. */
  path?: string;
  cancelled?: boolean;
  /** Pasted image: the name the file was written under. */
  fileName?: string;
  /** Pasted HTML: the Markdown it became. */
  markdown?: string;
  /** PlantUML include: the id of the file read and its text. */
  id?: string;
  text?: string;
}

/** The text editor scrolled or its selection moved: the page follows. */
export interface SourceScrollMessage extends RenderMessage<"sourceScroll"> {
  line?: number;
  selectionLine?: number;
  /** Scroll to `line` even when the preview does not follow the editor (a Back or Next move). */
  reveal?: boolean;
}

/** The targets of the links the page discovered (answer to `previewLinkDiscover`). */
export interface PreviewLinkTargetsMessage extends RenderMessage<"previewLinkTargets"> {
  targets: ReadonlyArray<{ request: string; kind?: string; path?: string; reason?: string }>;
}

/** What the navigation history of the panel allows. */
export interface PreviewHistoryStateMessage extends RenderMessage<"previewHistoryState"> {
  canBack: boolean;
  canForward: boolean;
}

/** Whether the gray comment chips show. */
export interface PreviewShowCommentsMessage extends RenderMessage<"previewShowComments"> {
  showComments: boolean;
}

/** The source lines that differ from HEAD, and whether the marks are enabled (T16). */
export interface PreviewIncomingChangesMessage extends RenderMessage<"previewIncomingChanges"> {
  enabled: boolean;
  ranges: readonly SourceLineRange[];
}

/** One difference with HEAD: base lines `baseStart..baseEnd` became lines `start..end` (empty: end = start - 1). */
export interface BaselineHunk {
  baseStart: number;
  baseEnd: number;
  start: number;
  end: number;
}

/**
 * The text at HEAD rendered like the page (`html`: the sanitized inner HTML of the content container,
 * its blocks numbered with the lines of the HEAD text) and the hunks that tell which HEAD lines became
 * which current lines. The side-by-side diff of changed blocks is made from it.
 */
export interface PreviewBaselineDiffMessage extends RenderMessage<"previewBaselineDiff"> {
  html: string;
  hunks: readonly BaselineHunk[];
}

/** The review comment threads of the document (T42), orphaned ones flagged. */
export interface PreviewCommentsMessage extends RenderMessage<"previewComments"> {
  threads: ReadonlyArray<CommentThread & { orphaned?: boolean }>;
}

/** How a comment create, reply, resolve or delete ended. */
export interface PreviewCommentResultMessage extends RenderMessage<"previewCommentResult"> {
  ok: boolean;
  reason?: string;
  kind: string;
  threadId?: string;
}

/** The host is about to replace the page: post the final saves, then `previewEditFlushed`. */
export interface PreviewFlushEditMessage extends RenderMessage<"previewFlushEdit"> {
  flushId: string;
}

/** Scroll to an anchor of the page (a same-page link). */
export interface NavigateAnchorMessage extends RenderMessage<"navigateAnchor"> {
  /** The link's fragment (`#name`). */
  value: string;
  /** The source lines the fragment resolved to, when the host knows them. */
  sourceLine?: number;
  sourceEndLine?: number;
}

/** Report the close of this inline editor with `previewEditClosed` (STAB-03). */
export interface PreviewEditorWatchMessage {
  readonly type: "previewEditorWatch";
  /** The document the host follows (it may already be the next one): not matched. */
  readonly documentId: string;
  editId: string;
}

/** A file read by a PlantUML `!include` changed: the page draws its diagrams again. */
export interface PreviewPlantUmlIncludesChangedMessage {
  readonly type: "previewPlantUmlIncludesChanged";
  readonly documentId: string;
}

/** Whether a visible text editor shows the page's document (the anchor button can be used). */
export interface PreviewPairingMessage extends RenderMessage<"previewPairing"> {
  pairedTextEditor: boolean;
}

/** The color theme kind of the host changed. */
export interface ThemeChangedMessage extends RenderMessage<"themeChanged"> {
  themeKind: number;
}

/** The editing commands VS Code's own key bindings run on the text box that has the caret. */
export const PREVIEW_EDIT_COMMANDS = ["undo", "redo", "selectAll", "deleteLine"] as const;

/** One of {@link PREVIEW_EDIT_COMMANDS}. */
export type PreviewEditCommandName = (typeof PREVIEW_EDIT_COMMANDS)[number];

/** A key binding of the host ran an editing command: the page applies it to the focused text box. */
export interface PreviewEditCommandMessage extends RenderMessage<"previewEditCommand"> {
  command: PreviewEditCommandName;
}

/** The folding commands of the command palette, run on the focused preview. */
export const PREVIEW_FOLD_COMMANDS = ["foldAll", "unfoldAll"] as const;

/** One of {@link PREVIEW_FOLD_COMMANDS}. */
export type PreviewFoldCommandName = (typeof PREVIEW_FOLD_COMMANDS)[number];

/** A command of the host folds or unfolds every section of the page. */
export interface PreviewFoldCommandMessage extends RenderMessage<"previewFoldCommand"> {
  command: PreviewFoldCommandName;
}

/** Every message a host sends to a preview page. */
export type HostToPageMessage =
  | PreviewPendingOverlayMessage
  | PreviewPropertiesTableMessage
  | PreviewContentPatchMessage
  | PreviewFrontmatterResultMessage
  | PreviewEditSourceMessage
  | PreviewCheckboxResultMessage
  | PreviewLabelRenameResultMessage
  | PreviewBlockMoveResultMessage
  | PreviewBlocksResultMessage
  | HostRequestResultMessage
  | SourceScrollMessage
  | PreviewLinkTargetsMessage
  | PreviewHistoryStateMessage
  | PreviewShowCommentsMessage
  | PreviewIncomingChangesMessage
  | PreviewBaselineDiffMessage
  | PreviewCommentsMessage
  | PreviewCommentResultMessage
  | PreviewFlushEditMessage
  | NavigateAnchorMessage
  | PreviewEditorWatchMessage
  | PreviewPlantUmlIncludesChangedMessage
  | PreviewPairingMessage
  | PreviewEditCommandMessage
  | PreviewFoldCommandMessage
  | ThemeChangedMessage;

/** The type names of {@link HostToPageMessage}. */
export type HostToPageType = HostToPageMessage["type"];

/** The host message of one type (or of a union of types). */
export type HostMessageOf<T extends HostToPageType> = Extract<HostToPageMessage, { type: T }>;

/**
 * How a page matches a host message to itself:
 * - `render`: document id, revision and request id must all equal the page's own;
 * - `document`: the document id must equal the page's; the render may differ;
 * - `own-id`: no identity; the message is matched by an id of its own (`editId`, `flushId`),
 *   because the host may already follow the next document or render.
 */
export type HostMessageAddressing = "render" | "document" | "own-id";

/** The page's rule for one host message type. */
export interface HostMessageRule {
  readonly addressing: HostMessageAddressing;
  /** The payload check; absent when the handler takes any payload of an addressed message. */
  readonly isValid?: (message: Readonly<Record<string, unknown>>) => boolean;
}

/** The page side of the protocol: whether a received value is a host message for this page. */
export interface HostMessageFilter {
  /** The rule of every host message type. */
  readonly rules: { readonly [T in HostToPageType]: HostMessageRule };
  /**
   * True when `value` is a host message of a known type, addressed to `page` by its rule, with a
   * payload its validator accepts.
   */
  accepts(value: unknown, page: PageIdentity): value is HostToPageMessage;
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-056
// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-122
// @implements_req SwRS-MDOKFSTUDIO-TRUST-059
/** The page's filter of host messages. */
export function createHostMessageFilter(): HostMessageFilter {
  // In-place content patch (T34): the limits the host's patch stays within.
  const PATCH_STATUSES = ["pending", "success", "stale", "error", "missing-source", "recovery"];
  const MAX_PATCH_CONTENT_LENGTH = 20 * 1024 * 1024;
  const MAX_PATCH_DIAGNOSTICS = 500;
  // @implements_req SwRS-MDOKFSTUDIO-TRUST-061
  const isValidContentPatch = (message: Readonly<Record<string, unknown>>): boolean => {
    const next = message.next as Record<string, unknown> | undefined;
    if (!next || typeof next !== "object"
      || !Number.isSafeInteger(next.revision) || !Number.isSafeInteger(next.requestId)) return false;
    if (next.initialAnchor !== undefined && !Number.isFinite(next.initialAnchor)) return false;
    const pin = next.initialPin as Record<string, unknown> | undefined;
    if (pin !== undefined && (!pin || typeof pin !== "object"
      || !Number.isFinite(pin.line) || !Number.isFinite(pin.viewportTop))) return false;
    if (typeof message.contentHtml !== "string" || message.contentHtml.length > MAX_PATCH_CONTENT_LENGTH) return false;
    if (!PATCH_STATUSES.includes(message.status as string)) return false;
    if (typeof message.label !== "string" || message.label.length > 500) return false;
    if (message.message !== undefined && (typeof message.message !== "string" || message.message.length > 20000)) return false;
    const diagnostics = message.diagnostics;
    return Array.isArray(diagnostics)
      && diagnostics.length <= MAX_PATCH_DIAGNOSTICS
      && diagnostics.every((entry) => entry && typeof entry.severity === "string"
        && entry.severity.length <= 50 && typeof entry.text === "string" && entry.text.length <= 20000
        && (entry.code === undefined || (typeof entry.code === "string" && entry.code.length <= 100)));
  };
  const MAX_BASELINE_LENGTH = 20 * 1024 * 1024;
  const MAX_BASELINE_HUNKS = 100_000;
  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-007
  const isValidBaselineDiff = (message: Readonly<Record<string, unknown>>): boolean => {
    if (typeof message.html !== "string" || message.html.length > MAX_BASELINE_LENGTH) return false;
    const hunks = message.hunks;
    return Array.isArray(hunks) && hunks.length <= MAX_BASELINE_HUNKS && hunks.every((hunk) => {
      if (!hunk || typeof hunk !== "object") return false;
      const { baseStart, baseEnd, start, end } = hunk as Record<string, unknown>;
      return [baseStart, baseEnd, start, end].every((value) => Number.isSafeInteger(value) && (value as number) >= 0)
        && (baseEnd as number) >= (baseStart as number) - 1 && (end as number) >= (start as number) - 1;
    });
  };
  const render: HostMessageRule = { addressing: "render" };
  const ownId: HostMessageRule = { addressing: "own-id" };
  const rules: { readonly [T in HostToPageType]: HostMessageRule } = {
    previewPendingOverlay: render,
    // @implements_req SwRS-MDOKFSTUDIO-TRUST-062
    previewPropertiesTable: { addressing: "render", isValid: (message) => typeof message.markup === "string" },
    previewContentPatch: { addressing: "render", isValid: isValidContentPatch },
    previewFrontmatterResult: render,
    previewEditSource: render,
    previewCheckboxResult: render,
    // Matched by edit id: the rename itself moves the revision before the answer arrives.
    previewLabelRenameResult: ownId,
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-129
    previewBlockMoveResult: render,
    previewBlocksResult: render,
    // Host round trips, matched by edit id by the page's pending requests.
    previewCopyTextResult: ownId,
    previewThreadReplyResult: ownId,
    previewThreadDeleteResult: ownId,
    previewListTargetsResult: ownId,
    previewListCitationsResult: ownId,
    previewPickDocumentResult: ownId,
    previewPickImageResult: ownId,
    previewPasteImageResult: ownId,
    previewPasteHtmlResult: ownId,
    previewPlantUmlIncludeResult: ownId,
    sourceScroll: render,
    // @implements_req SwRS-MDOKFSTUDIO-TRUST-063
    previewLinkTargets: { addressing: "render", isValid: (message) => Array.isArray(message.targets) },
    previewHistoryState: render,
    previewShowComments: render,
    previewIncomingChanges: render,
    previewBaselineDiff: { addressing: "render", isValid: isValidBaselineDiff },
    previewComments: render,
    previewCommentResult: render,
    // @implements_req SwRS-MDOKFSTUDIO-TRUST-064
    // The host is about to switch document: the flush id is the match.
    previewFlushEdit: { addressing: "own-id", isValid: (message) => typeof message.flushId === "string" },
    navigateAnchor: render,
    // The editor id is the match; the document id may already be the next document.
    previewEditorWatch: { addressing: "own-id", isValid: (message) => typeof message.editId === "string" },
    previewPlantUmlIncludesChanged: { addressing: "document" },
    previewPairing: render,
    // @implements_req SwRS-MDOKFSTUDIO-BLOCK-003
    previewEditCommand: {
      addressing: "render",
      isValid: (message) => (PREVIEW_EDIT_COMMANDS as readonly unknown[]).includes(message.command),
    },
    // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-005
    previewFoldCommand: {
      addressing: "render",
      isValid: (message) => (PREVIEW_FOLD_COMMANDS as readonly unknown[]).includes(message.command),
    },
    themeChanged: render,
  };
  return {
    rules,
    accepts(value: unknown, page: PageIdentity): value is HostToPageMessage {
      if (!value || typeof value !== "object") return false;
      const message = value as Readonly<Record<string, unknown>>;
      const type = message.type;
      if (typeof type !== "string" || !Object.prototype.hasOwnProperty.call(rules, type)) return false;
      const rule = rules[type as HostToPageType];
      const addressed = rule.addressing === "own-id"
        || (message.documentId === page.documentId
          && (rule.addressing === "document"
            || (message.revision === page.revision && message.requestId === page.requestId)));
      return addressed && (rule.isValid === undefined || rule.isValid(message));
    },
  };
}
