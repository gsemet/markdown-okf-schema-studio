/**
 * What the preview page accepts from the host, as one table: every host message type the page
 * handles, the identity rule it is matched by, and a payload it must refuse. Each case first shows
 * that the well-formed message has an effect (so a refusal is never vacuous), then that the same
 * message with another identity or a bad payload has none. The identity rules differ on purpose:
 * most messages must name the exact render the page shows; a few are matched by an id of their own
 * because the host may already follow the next document.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  DOCUMENT_ID,
  DOCUMENT_VERSION,
  HARNESS_PAGE,
  NO_IDENTITY,
  PATCH_NEXT,
  REQUEST_ID,
  renderIdentity,
} from "../shared/previewIdentity";
import { createRuntimeHarness, type RuntimeHarness } from "./runtimeHarness";

const IDS = HARNESS_PAGE;

/** How a message type is matched to the page. */
type IdentityRule =
  /** documentId, documentVersion and requestId must all equal the page's own. */
  | "render"
  /** documentId must equal the page's; version and request may differ. */
  | "document"
  /** No identity at all: matched by an id the message carries (editId, flushId). */
  | "own-id";

interface MessageCase {
  readonly type: string;
  readonly rule: IdentityRule;
  /** Prepares the page (for example opens an editor) before the message arrives. */
  readonly prepare?: (harness: RuntimeHarness) => void;
  /** The well-formed message, identity fields included when the rule needs them. */
  readonly message: (harness: RuntimeHarness) => Record<string, unknown>;
  /** What the message changes; compared with JSON before and after. */
  readonly probe: (harness: RuntimeHarness) => unknown;
  /** Payload fields that make the page refuse the message although the identity matches. */
  readonly badPayloads: ReadonlyArray<Record<string, unknown>>;
  readonly harness?: Parameters<typeof createRuntimeHarness>[0];
}

const postedTypes = (harness: RuntimeHarness): string[] => harness.messages.map((message) => String(message.type));

function openBlockEditorRequest(harness: RuntimeHarness): void {
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
}

const lastEditId = (harness: RuntimeHarness): unknown =>
  [...harness.messages].reverse().find((message) => message.type === "previewEditOpen")?.editId;

const CASES: readonly MessageCase[] = [
  {
    type: "previewPendingOverlay",
    rule: "render",
    message: () => ({ type: "previewPendingOverlay", ...IDS, visible: true, label: "Pending", message: "Rendering." }),
    probe: (harness) => harness.body.childElements
      .filter((child) => child.getAttribute("data-sphinx-preview-pending-overlay") !== null && !child.removed).length,
    badPayloads: [{ visible: "yes" }, { label: 7 }, { label: "x".repeat(501) }, { message: undefined }],
  },
  {
    type: "previewContentPatch",
    rule: "render",
    message: () => ({
      type: "previewContentPatch",
      ...IDS,
      [PATCH_NEXT]: renderIdentity(8, 12),
      contentHtml: "<p>fresh</p>",
      status: "success",
      label: "Preview ready",
      diagnostics: [],
    }),
    probe: (harness) => ({
      ready: postedTypes(harness).filter((type) => type === "previewReady").length,
      request: harness.documentElement.getAttribute("data-sphinx-preview-request-id"),
    }),
    badPayloads: [
      { [PATCH_NEXT]: undefined },
      { [PATCH_NEXT]: { ...renderIdentity(8, 12), [DOCUMENT_VERSION]: "8" } },
      { [PATCH_NEXT]: { ...renderIdentity(8, 12), initialPin: { line: "x", viewportTop: 0 } } },
      { contentHtml: 42 },
      { status: "unknown" },
      { label: undefined },
      { diagnostics: "none" },
      { diagnostics: [{ severity: "error" }] },
    ],
  },
  {
    type: "previewPropertiesTable",
    rule: "render",
    message: () => ({ type: "previewPropertiesTable", ...IDS, seq: 1, markup: "<section data-okf-properties></section>" }),
    probe: (harness) => harness.htmlInsertions.length,
    badPayloads: [{ markup: 42 }, { markup: undefined }],
  },
  {
    type: "previewPairing",
    rule: "render",
    message: () => ({ type: "previewPairing", ...IDS, pairedTextEditor: false }),
    probe: (harness) => [harness.anchorButton.disabled, harness.anchorButton.getAttribute("title")],
    badPayloads: [],
  },
  {
    type: "themeChanged",
    rule: "render",
    message: () => ({ type: "themeChanged", ...IDS, themeKind: 2 }),
    probe: (harness) => harness.documentElement.getAttribute("data-sphinx-preview-theme"),
    badPayloads: [],
  },
  {
    type: "previewShowComments",
    rule: "render",
    message: () => ({ type: "previewShowComments", ...IDS, showComments: false }),
    probe: (harness) => harness.documentElement.getAttribute("data-okf-show-comments"),
    badPayloads: [],
  },
  {
    type: "previewHistoryState",
    rule: "render",
    message: () => ({ type: "previewHistoryState", ...IDS, canBack: true, canForward: true }),
    probe: (harness) => [harness.backButton.disabled, harness.nextButton.disabled],
    badPayloads: [{ canBack: "true", canForward: 1 }],
  },
  {
    type: "navigateAnchor",
    rule: "render",
    message: () => ({ type: "navigateAnchor", ...IDS, value: "#section" }),
    probe: (harness) => {
      harness.flushFrames();
      return harness.windowState.scrollY;
    },
    badPayloads: [{ value: 42 }, { value: "section" }, { value: "#%E0%A4%A" }, { value: "#missing" }],
  },
  {
    type: "sourceScroll",
    rule: "render",
    message: () => ({ type: "sourceScroll", ...IDS, line: 50 }),
    probe: (harness) => {
      harness.flushFrames();
      return harness.windowState.scrollY;
    },
    badPayloads: [{ line: 0 }, { line: -3 }, { line: "abc" }, { line: undefined }],
  },
  {
    type: "previewEditSource",
    rule: "render",
    prepare: openBlockEditorRequest,
    message: (harness) => ({
      type: "previewEditSource",
      ...IDS,
      editId: lastEditId(harness),
      originalText: "Second paragraph.\n",
    }),
    probe: (harness) => harness.createdElements.filter((element) => element.tagName === "TEXTAREA").length,
    badPayloads: [{ editId: "another-edit" }],
  },
  {
    type: "previewPlantUmlIncludesChanged",
    rule: "document",
    message: () => ({ type: "previewPlantUmlIncludesChanged", ...IDS }),
    probe: (harness) => harness.dispatchedEvents.filter((type) => type === "studio:plantuml-includes-changed").length,
    badPayloads: [],
  },
  {
    type: "previewEditorWatch",
    rule: "own-id",
    prepare: (harness) => {
      openBlockEditorRequest(harness);
      harness.dispatchMessage({
        type: "previewEditSource",
        ...IDS,
        editId: lastEditId(harness),
        originalText: "Second paragraph.\n",
      });
      // Closes the editor without a save: the host watch then gets its answer at once.
      const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA");
      textarea?.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
    },
    message: (harness) => ({ type: "previewEditorWatch", editId: lastEditId(harness) }),
    probe: (harness) => postedTypes(harness).filter((type) => type === "previewEditClosed").length,
    badPayloads: [{ editId: 42 }, { editId: undefined }],
  },
  {
    type: "previewFlushEdit",
    rule: "own-id",
    message: () => ({ type: "previewFlushEdit", flushId: "flush-1" }),
    probe: (harness) => postedTypes(harness).filter((type) => type === "previewEditFlushed").length,
    badPayloads: [{ flushId: 42 }, { flushId: undefined }],
  },
];

/** The identity variants a message must be refused with, per rule. */
function foreignIdentities(rule: IdentityRule): Array<[string, Record<string, unknown>]> {
  const otherDocument: [string, Record<string, unknown>] = [`another ${DOCUMENT_ID}`, { [DOCUMENT_ID]: "file:///other.md" }];
  const noDocument: [string, Record<string, unknown>] = [`no ${DOCUMENT_ID}`, { [DOCUMENT_ID]: undefined }];
  if (rule === "own-id") return [];
  if (rule === "document") return [otherDocument, noDocument];
  return [
    otherDocument,
    noDocument,
    [`an older ${DOCUMENT_VERSION}`, { [DOCUMENT_VERSION]: IDS[DOCUMENT_VERSION] - 1 }],
    [`a newer ${DOCUMENT_VERSION}`, { [DOCUMENT_VERSION]: IDS[DOCUMENT_VERSION] + 1 }],
    [`${DOCUMENT_VERSION} as a string`, { [DOCUMENT_VERSION]: String(IDS[DOCUMENT_VERSION]) }],
    [`an older ${REQUEST_ID}`, { [REQUEST_ID]: IDS[REQUEST_ID] - 1 }],
    [`a newer ${REQUEST_ID}`, { [REQUEST_ID]: IDS[REQUEST_ID] + 1 }],
    [`${REQUEST_ID} as a string`, { [REQUEST_ID]: String(IDS[REQUEST_ID]) }],
    [`no ${REQUEST_ID}`, { [REQUEST_ID]: undefined }],
  ];
}

/** Identity variants a message must still be accepted with, per rule. */
function acceptedIdentities(rule: IdentityRule): Array<[string, Record<string, unknown>]> {
  if (rule === "render") return [];
  const looser: Array<[string, Record<string, unknown>]> = [
    [`another ${DOCUMENT_VERSION}`, { [DOCUMENT_VERSION]: 99 }],
    [`another ${REQUEST_ID}`, { [REQUEST_ID]: 99 }],
  ];
  return rule === "document"
    ? looser
    : [...looser, [`another ${DOCUMENT_ID}`, { [DOCUMENT_ID]: "file:///other.md" }], ["no identity", {}]];
}

/** A short, unique test name for a payload: absent fields and long strings stay readable. */
function payloadLabel(payload: Record<string, unknown>): string {
  return Object.entries(payload).map(([key, value]) => `${key}=${value === undefined
    ? "<absent>"
    : typeof value === "string" && value.length > 40 ? `<${value.length} characters>` : JSON.stringify(value)}`)
    .join(" ");
}

function withFields(message: Record<string, unknown>, fields: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...message, ...fields };
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) delete merged[key];
  }
  return merged;
}

/** Boots a page, prepares it, sends `fields` merged into the case's message; returns before / after. */
function deliver(entry: MessageCase, fields: Record<string, unknown> | "exact" = "exact", replaceIdentity = false): {
  before: string;
  after: string;
} {
  const harness = createRuntimeHarness(entry.harness);
  harness.flushFrames();
  entry.prepare?.(harness);
  harness.flushFrames();
  const before = JSON.stringify(entry.probe(harness));
  const base = entry.message(harness);
  const identityFree = replaceIdentity
    ? withFields(base, NO_IDENTITY)
    : base;
  harness.dispatchMessage(fields === "exact" ? base : withFields(identityFree, fields));
  harness.flushMicrotasks();
  return { before, after: JSON.stringify(entry.probe(harness)) };
}

for (const entry of CASES) {
  test(`host message ${entry.type}: the well-formed message changes the page`, () => {
    const { before, after } = deliver(entry);
    assert.notEqual(after, before, `${entry.type} has an observable effect`);
  });

  for (const [label, fields] of foreignIdentities(entry.rule)) {
    test(`host message ${entry.type}: refused with ${label}`, () => {
      const { before, after } = deliver(entry, fields);
      assert.equal(after, before);
    });
  }

  for (const [label, fields] of acceptedIdentities(entry.rule)) {
    test(`host message ${entry.type}: still accepted with ${label} (${entry.rule} rule)`, () => {
      const { before, after } = deliver(entry, fields, label === "no identity");
      assert.notEqual(after, before);
    });
  }

  for (const payload of entry.badPayloads) {
    test(`host message ${entry.type}: refused with the payload ${payloadLabel(payload)}`, () => {
      const { before, after } = deliver(entry, payload);
      assert.equal(after, before);
    });
  }
}

test("host messages that are not objects, or of an unknown type, change nothing and never throw", () => {
  const harness = createRuntimeHarness();
  harness.flushFrames();
  const snapshot = (): string => JSON.stringify({
    messages: harness.messages,
    scrollY: harness.windowState.scrollY,
    created: harness.createdElements.length,
    body: harness.body.childElements.length,
    insertions: harness.htmlInsertions.length,
    events: harness.dispatchedEvents,
    theme: harness.documentElement.getAttribute("data-sphinx-preview-theme"),
    request: harness.documentElement.getAttribute("data-sphinx-preview-request-id"),
  });
  const before = snapshot();
  const unusable: unknown[] = [
    null,
    undefined,
    "sourceScroll",
    42,
    [],
    {},
    { type: 42, ...IDS },
    { type: "previewNoSuchMessage", ...IDS, line: 50 },
    { type: "SOURCESCROLL", ...IDS, line: 50 },
  ];
  for (const message of unusable) {
    assert.doesNotThrow(() => harness.dispatchMessage(message as Record<string, unknown>), JSON.stringify(message));
    harness.flushFrames();
    harness.flushMicrotasks();
  }
  assert.equal(snapshot(), before);
});

test("a content patch moves the page to the next identity: the previous one is refused afterwards", () => {
  const harness = createRuntimeHarness();
  harness.flushFrames();
  const patch = CASES.find((entry) => entry.type === "previewContentPatch")!;
  harness.dispatchMessage(patch.message(harness));
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-request-id"), "12");
  harness.flushFrames();
  const scrollBefore = harness.windowState.scrollY;
  harness.dispatchMessage({ type: "sourceScroll", ...IDS, line: 50 });
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, scrollBefore, "the identity of the patched-away render is stale");
  harness.dispatchMessage({ type: "themeChanged", ...IDS, ...renderIdentity(8, 12), themeKind: 3 });
  assert.equal(harness.documentElement.getAttribute("data-sphinx-preview-theme"), "3", "the next identity is current");
});
