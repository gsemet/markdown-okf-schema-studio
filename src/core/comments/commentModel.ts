/**
 * Review comments (T42): the model of the sidecar file `<name>.comments.json` that sits next to a
 * document. Pure module: it must not import `vscode`, so the host, the page and the tests share it.
 *
 * The file is untrusted data. `parseSidecar` validates every field strictly and copies the valid
 * ones into fresh objects (unknown fields are dropped); a file with any problem yields no threads
 * at all, so the page never shows half of a broken file. Bodies are plain text.
 */

 const SIDECAR_VERSION = 1;
export const MAX_SIDECAR_BYTES = 2 * 1024 * 1024;
export const MAX_THREADS = 1000;
export const MAX_COMMENTS_PER_THREAD = 200;
export const MAX_STRING_LENGTH = 10_000;

export interface CommentAnchor {
  /** First source line of the commented block (1-based). */
  line: number;
  /** Last source line of the commented block. */
  endLine: number;
  /** The quoted text; empty when the thread is attached to the block only. */
  quote: string;
  prefix: string;
  suffix: string;
}

export interface CommentEntry {
  id: string;
  author: string;
  createdAt: string;
  body: string;
}

export interface CommentThread {
  id: string;
  anchor: CommentAnchor;
  resolved: boolean;
  createdAt: string;
  comments: CommentEntry[];
}

export interface CommentSidecar {
  version: 1;
  document: string;
  threads: CommentThread[];
}

export interface ParsedSidecar {
  /** Empty whenever `errors` is not. */
  threads: CommentThread[];
  document: string;
  errors: string[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/u;

/** True for an ISO 8601 date-time with a time zone that names a real instant. */
 function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40 && ISO_DATE.test(value)
    && !Number.isNaN(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBounded(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_STRING_LENGTH;
}

function isId(value: unknown): value is string {
  return isBounded(value) && value !== "";
}

function isLine(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1;
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-001
/** `notes.md` -> `notes.comments.json`; a name without extension just gets the suffix. */
export function sidecarNameFor(documentName: string): string {
  const slash = Math.max(documentName.lastIndexOf("/"), documentName.lastIndexOf("\\"));
  const directory = documentName.slice(0, slash + 1);
  const base = documentName.slice(slash + 1);
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  return `${directory}${stem}.comments.json`;
}

function parseAnchor(value: unknown, where: string, errors: string[]): CommentAnchor | undefined {
  if (!isRecord(value)) {
    errors.push(`${where}.anchor must be an object`);
    return undefined;
  }
  const { line, endLine, quote, prefix, suffix } = value;
  if (!isLine(line) || !isLine(endLine) || endLine < line) {
    errors.push(`${where}.anchor needs integer lines with 1 <= line <= endLine`);
    return undefined;
  }
  if (!isBounded(quote) || !isBounded(prefix) || !isBounded(suffix)) {
    errors.push(`${where}.anchor quote, prefix and suffix must be strings of at most ${MAX_STRING_LENGTH} characters`);
    return undefined;
  }
  return { line, endLine, quote, prefix, suffix };
}

function parseComment(value: unknown, where: string, errors: string[]): CommentEntry | undefined {
  if (!isRecord(value)) {
    errors.push(`${where} must be an object`);
    return undefined;
  }
  const { id, author, createdAt, body } = value;
  if (!isId(id) || !isBounded(author) || !isBounded(body) || !isIsoDate(createdAt)) {
    errors.push(`${where} needs an id, an author, a body and an ISO createdAt`);
    return undefined;
  }
  return { id, author, createdAt, body };
}

function parseThread(value: unknown, where: string, errors: string[]): CommentThread | undefined {
  if (!isRecord(value)) {
    errors.push(`${where} must be an object`);
    return undefined;
  }
  const { id, resolved, createdAt, comments } = value;
  if (!isId(id) || typeof resolved !== "boolean" || !isIsoDate(createdAt)) {
    errors.push(`${where} needs an id, a boolean resolved and an ISO createdAt`);
    return undefined;
  }
  if (!Array.isArray(comments) || comments.length === 0 || comments.length > MAX_COMMENTS_PER_THREAD) {
    errors.push(`${where}.comments must hold 1 to ${MAX_COMMENTS_PER_THREAD} comments`);
    return undefined;
  }
  const anchor = parseAnchor(value.anchor, where, errors);
  const parsed = comments.map((comment, index) => parseComment(comment, `${where}.comments[${index}]`, errors));
  if (!anchor || parsed.some((comment) => comment === undefined)) return undefined;
  return { id, anchor, resolved, createdAt, comments: parsed as CommentEntry[] };
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-004
/** Validates the text of a sidecar file. Never throws. */
export function parseSidecar(text: string): ParsedSidecar {
  const failure = (message: string, extra: string[] = []): ParsedSidecar =>
    ({ threads: [], document: "", errors: [message, ...extra] });
  if (typeof text !== "string") return failure("the sidecar is not text");
  // UTF-8 length without a Buffer: this module also runs in the page tests.
  if (text.length > MAX_SIDECAR_BYTES || new TextEncoder().encode(text).length > MAX_SIDECAR_BYTES) {
    return failure(`the sidecar is larger than ${MAX_SIDECAR_BYTES} bytes`);
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return failure("the sidecar is not valid JSON");
  }
  if (!isRecord(data)) return failure("the sidecar must be a JSON object");
  if (data.version !== SIDECAR_VERSION) return failure(`unsupported sidecar version (expected ${SIDECAR_VERSION})`);
  if (!isBounded(data.document)) return failure("the sidecar needs a document name");
  if (!Array.isArray(data.threads)) return failure("the sidecar needs a threads array");
  if (data.threads.length > MAX_THREADS) return failure(`the sidecar holds more than ${MAX_THREADS} threads`);
  const errors: string[] = [];
  const threads: CommentThread[] = [];
  const seen = new Set<string>();
  data.threads.forEach((candidate, index) => {
    const thread = parseThread(candidate, `threads[${index}]`, errors);
    if (!thread) return;
    if (seen.has(thread.id)) {
      errors.push(`threads[${index}] repeats the id of an earlier thread`);
      return;
    }
    seen.add(thread.id);
    threads.push(thread);
  });
  if (errors.length > 0) return { threads: [], document: data.document, errors };
  return { threads, document: data.document, errors: [] };
}

/** Stable text of a model: fixed key order, 2-space indent, trailing newline. */
export function serializeSidecar(model: { document: string; threads: readonly CommentThread[] }): string {
  const ordered = {
    version: SIDECAR_VERSION,
    document: model.document,
    threads: model.threads.map((thread) => ({
      id: thread.id,
      anchor: {
        line: thread.anchor.line,
        endLine: thread.anchor.endLine,
        quote: thread.anchor.quote,
        prefix: thread.anchor.prefix,
        suffix: thread.anchor.suffix,
      },
      resolved: thread.resolved,
      createdAt: thread.createdAt,
      comments: thread.comments.map((comment) => ({
        id: comment.id,
        author: comment.author,
        createdAt: comment.createdAt,
        body: comment.body,
      })),
    })),
  };
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

 const MAX_QUOTE_LENGTH = 500;
 const MAX_CONTEXT_LENGTH = 32;
export const MAX_BODY_LENGTH = 10_000;

/**
 * True for an anchor sent by the page (T43): integer lines with 1 <= line <= endLine, a quote of at
 * most 500 characters and a prefix and suffix of at most 32 each.
 */
export function isValidAnchor(value: unknown): value is CommentAnchor {
  if (!isRecord(value)) return false;
  const { line, endLine, quote, prefix, suffix } = value;
  return isLine(line) && isLine(endLine) && endLine >= line
    && typeof quote === "string" && quote.length <= MAX_QUOTE_LENGTH
    && typeof prefix === "string" && prefix.length <= MAX_CONTEXT_LENGTH
    && typeof suffix === "string" && suffix.length <= MAX_CONTEXT_LENGTH;
}

/** The trimmed body when it holds 1 to 10 000 characters, else undefined. */
export function normalizeBody(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > MAX_BODY_LENGTH) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-054
/** Adds a thread with its first comment; undefined when the file is full or the id is taken. */
export function addThread(
  threads: readonly CommentThread[],
  input: { threadId: string; commentId: string; anchor: CommentAnchor; author: string; body: string; now: Date },
): CommentThread[] | undefined {
  if (threads.length >= MAX_THREADS || threads.some((thread) => thread.id === input.threadId)) return undefined;
  const createdAt = input.now.toISOString();
  const { line, endLine, quote, prefix, suffix } = input.anchor;
  return [...threads, {
    id: input.threadId,
    anchor: { line, endLine, quote, prefix, suffix },
    resolved: false,
    createdAt,
    comments: [{ id: input.commentId, author: input.author, createdAt, body: input.body }],
  }];
}

// @implements_req SwRS-MDOKFSTUDIO-REVIEW-074
/** Appends a comment to a thread; undefined when the thread is missing or already full. */
export function addReply(
  threads: readonly CommentThread[],
  threadId: string,
  input: { commentId: string; author: string; body: string; now: Date },
): CommentThread[] | undefined {
  const target = threads.find((thread) => thread.id === threadId);
  if (!target || target.comments.length >= MAX_COMMENTS_PER_THREAD) return undefined;
  const comment: CommentEntry = {
    id: input.commentId, author: input.author, createdAt: input.now.toISOString(), body: input.body,
  };
  return threads.map((thread) => (thread === target ? { ...thread, comments: [...thread.comments, comment] } : thread));
}

/** Sets the resolved flag of the named thread; undefined when it does not exist. */
export function setResolved(
  threads: readonly CommentThread[],
  threadId: string,
  resolved: boolean,
): CommentThread[] | undefined {
  const target = threads.find((thread) => thread.id === threadId);
  if (!target) return undefined;
  return threads.map((thread) => (thread === target ? { ...thread, resolved } : thread));
}

/** Removes the named thread (the list may become empty); undefined when it does not exist. */
export function deleteThread(threads: readonly CommentThread[], threadId: string): CommentThread[] | undefined {
  if (!threads.some((thread) => thread.id === threadId)) return undefined;
  return threads.filter((thread) => thread.id !== threadId);
}
