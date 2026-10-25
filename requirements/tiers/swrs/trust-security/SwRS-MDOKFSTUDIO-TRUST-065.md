---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-065
uuid: cb895a14-b414-4332-b219-b2d6aac319d3
title: A page message is matched to the shown render or document by the gate of
  its type
description: When a page message reaches the host, the extension SHALL pass it
  only to the handler of its type after it matches the render or document the
  host holds by the gate of that type (render, comment, document, own-id or
  page-state), drop a message that fails the gate without an answer, and answer
  a write whose document is newer than the render with "The preview is out of
  date. Try again once it has refreshed." or a reopen hint.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-006
- StRS-MDOKFSTUDIO-BLOCK-014
- StRS-MDOKFSTUDIO-BLOCK-016
- StRS-MDOKFSTUDIO-BLOCK-025
- StRS-MDOKFSTUDIO-CODE-004
- StRS-MDOKFSTUDIO-DIAG-009
- StRS-MDOKFSTUDIO-FMEDIT-008
- StRS-MDOKFSTUDIO-MYST-009
- StRS-MDOKFSTUDIO-PALETTE-007
- StRS-MDOKFSTUDIO-PALETTE-013
- StRS-MDOKFSTUDIO-REVIEW-015
- StRS-MDOKFSTUDIO-TOOLBAR-011
- StRS-MDOKFSTUDIO-TRUST-009
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/hostRequests.ts
- src/session/features/sourceEdits.ts
- src/session/pageMessages.ts
- src/session/previewManager.ts
- src/session/sessionDocuments.ts
tested_in_files:
- test/host/fmtableReq.requirements.test.ts
- test/integration/blockClipboard.test.ts
- test/integration/blockMove.test.ts
- test/integration/commentWrite.test.ts
- test/integration/labelRename.test.ts
- test/session/blockReq.requirements.test.ts
- test/session/diagReq.plantuml.requirements.test.ts
- test/session/paletteReq.requirements.test.ts
- test/session/renderReq.codeCopy.requirements.test.ts
- test/session/reviewReqThreads.requirements.test.ts
- test/session/toolbarReq.requirements.test.ts
- test/session/trustReq.requirements.test.ts
---

## A page message is matched to the shown render or document by the gate of its type

### Normative behavior

When a page message reaches the host, the extension SHALL pass it only to the handler of its type after it matches the render or document the host holds by the gate of that type (render, comment, document, own-id or page-state), drop a message that fails the gate without an answer, and answer a write whose document is newer than the render with "The preview is out of date. Try again once it has refreshed." or a reopen hint.

### Scenario (nominal): Current render passes the render gate

- GIVEN a preview that holds revision 4, request 9 and a previewBlockMove message that names them
- WHEN the message arrives
- THEN its handler runs

### Scenario (boundary): The five gates

Every page message type has one gate. A message with a registered type and a valid envelope (see SwRS-MDOKFSTUDIO-TRUST-052) is matched by it:

| Gate | Message types | Passes when | Otherwise |
| --- | --- | --- | --- |
| render | previewHistoryGo, previewViewPreferenceChanged, previewPaletteModeChanged, previewLabelRename, previewThreadReply, previewThreadDelete, previewBlockMove, previewBlocksCopy, previewBlocksCut, previewBlocksPaste, previewListTargets, previewListCitations, previewPickDocument, previewPickImage, previewPasteImage, previewPasteHtml | its document, revision and request identifiers equal those of the render the host holds, the preview is alive and has a rendered stage | dropped, with no answer and no change |
| comment | previewCommentCreate, previewCommentReply, previewCommentResolve, previewCommentDelete | its document and request identifiers equal those of the render the host holds, whatever its revision (comments live in a sidecar file and the quote is anchored again, so typed text is not lost to a race with typing) | dropped, with no answer and no write |
| document | previewCopyText, previewPlantUmlInclude, previewShowProblems, previewWarningBannerClosed | the preview is alive and its documentId equals that of the document the preview shows, even one render behind; revision and request are not compared | dropped without an answer |
| own-id | previewEditClosed, previewEditFlushed | the preview is not disposed, whatever document, revision and request the message names (the waiting host matches the answer by the identifier it sent) | dropped (disposed preview) |
| page-state | previewReady, previewScroll, previewReveal, previewState, previewLink, previewLinkDiscover, previewThemeModeChanged, previewRefresh, previewAnchorModeChanged, previewEditModeChanged, previewEditOpen, previewEditSave, previewEditCancel, previewFrontmatterSave, previewCheckboxToggle | it names the render the host holds, or it is one of the exceptions below | dropped without changing anything |

The page-state exceptions are the ready reports (see SwRS-MDOKFSTUDIO-LIFE-071), the save or cancel of the block editor the host has open for exactly the render that message names (same editId, document, revision and request), and the stale save, cancel or frontmatter save of the second table.

### Scenario (refusal): Older or foreign render is dropped

| Input | Outcome |
| --- | --- |
| previewBlockMove naming revision 3 while the host holds revision 4 | dropped, with no answer and no change |
| previewBlockMove, previewBlocksCopy, previewBlocksCut or previewBlocksPaste naming an earlier request id | dropped and nothing is answered |
| previewCopyText of a page whose document version or render request is no longer current | handled: the text is written to the clipboard and the page is answered, because a copy edits nothing |
| previewCopyText naming another document | dropped, the clipboard is not written |
| previewLink with another document identity, revision or request than the host render | ignored: nothing opens and nothing is recorded |
| previewLink after the preview was disposed | ignored: nothing happens |
| message of a disposed preview, or of a preview without a rendered stage | dropped |
| previewCommentReply naming another request | dropped, nothing is written |
| previewCommentCreate naming another document id | dropped, nothing is written |
| previewScroll naming request 8 while the host holds request 9 | dropped, the text editor does not scroll |
| previewLabelRename for a stale render revision | dropped without an answer; the page ends with its timeout text |
| previewPlantUmlInclude, previewShowProblems or previewWarningBannerClosed naming another document | dropped without an answer |
| previewEditFlushed or previewEditClosed on a disposed preview | dropped |

### Scenario (nominal): Gates that accept an older revision

| Input | Outcome |
| --- | --- |
| previewCommentCreate naming revision 3 of the same render while the host holds revision 4 | the handler runs and the thread is written and answered ok |
| previewWarningBannerClosed for the shown document from a preview one render behind | the handler runs |
| previewPlantUmlInclude addressed to the current document from a page one render behind | the include is answered |
| previewEditFlushed or previewEditClosed naming an older render, on a live preview | the handler runs and the waiting host continues |
| previewEditSave of the block editor opened on revision 3 after the document moved to revision 4, same editId | accepted |
| previewListTargets, previewListCitations, previewPickDocument or previewPickImage naming render 3 while the block editor the host holds is open on render 3 and its own saves moved the document to revision 4 | the request is answered as for a current preview (the preview refreshes only when the editor closes) |

### Scenario (refusal): Stale write answered out of date or with a reopen hint

A message that passes its gate but writes for a document newer than the render is answered with a reason and changes nothing. The page-state gate answers a stale save or cancel of a writable preview instead of dropping it:

| Request | Stale case | Answer |
| --- | --- | --- |
| previewBlockMove | the document was edited after the last render | ok false, "The preview is out of date. Try again once it has refreshed."; a render of the current text plans the move |
| previewBlocksCopy, previewBlocksCut, previewBlocksPaste | the document changed since the render | ok false, "The preview is out of date. Try again once it has refreshed."; a render of the current text plans the copy |
| previewLabelRename | the document was edited after rendering | "The preview is out of date. Try again once it has refreshed." and nothing changes |
| previewListTargets | the document is no longer the one of the render, or was edited after it with no block editor open on that render | ok false, "The preview is out of date. Try again once it has refreshed."; an unedited document answers the labels |
| previewListCitations | the document is no longer the one of the render, or was edited after it with no block editor open on that render | ok false, "The preview is out of date. Try again once it has refreshed." and no file is read; an unedited document answers the keys |
| previewPickImage | the preview is out of date (no block editor open on that render), or the document is an untitled document that is not a saved Markdown file | "The preview is out of date, or the document is not a file." and the dialog is not opened |
| previewPickDocument | the preview is out of date (no block editor open on that render), or the document is not a saved Markdown file | "The preview is out of date, or the document is not a file." and the dialog is not opened |
| previewThreadReply, previewThreadDelete | the request names another revision of the document than the host holds | "The preview is out of date. Try again once it has refreshed." and nothing changes; a request naming the current revision is handled |
| previewEditSave, previewEditCancel (block editor) | the editor was opened on an older page than the host holds, in a writable preview | "The preview changed while this block was being edited. Copy your text, then reopen the block." |
| previewFrontmatterSave | the editor was opened on an older render (render 1 while the host shows render 2 of the same document) | "The preview changed while this field was being edited. Reopen the field." and the document is unchanged |

### Scenario (refusal): No stale answer where none is owed

| Input | Outcome |
| --- | --- |
| stale previewEditSave of a read-only preview | no answer is sent |
| stale previewFrontmatterSave naming another document | no answer is sent |
| stale save of a read-only or disposed preview | no stale answer is sent |
| stale previewScroll or any other page-state message that is not a save, cancel or frontmatter save | dropped without an answer |

### Known issues

- Known issue: a request of the render gate that names an older render than the one the host holds is dropped by the gate without any answer. No reason is shown; an arrow click stays marked pending; a keyboard move and a selection move are forgotten by the page after five seconds; and an open request (which the host answers only for saves and cancels) leaves its frame empty.
- Known issue: the include request (previewPlantUmlInclude) is not an edit: it is allowed in read-only previews and in Restricted Mode.

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-052: a message needs a registered type and a valid envelope before any gate
- SwRS-MDOKFSTUDIO-TRUST-005: an edit request of a read-only preview is refused after the gate, with "Editing requires a trusted workspace."
- SwRS-MDOKFSTUDIO-LIFE-071: the ready reports that the page-state gate lets through
- SwRS-MDOKFSTUDIO-BLOCK-058: the outcome of a host source edit that passes the gate

### Verification notes

- Method: test/session/trustReq.requirements.test.ts (render gate current, older and foreign identity, disposed and stage-less preview; comment gate; document gate; own-id gate; page-state gate with previewScroll and the open editor save; stale save answered with an error; read-only gets no answer). It runs PageMessageDispatcher.handle in src/session/pageMessages.ts with the real matchesCurrent of the preview manager. The other render-gated types share the same gate.
- Method: test/integration/commentWrite.test.ts (comment gate: a previewCommentCreate with an old documentVersion is written and answered ok; the same message with a wrong document id is dropped and writes nothing).
- Method: test/integration/blockMove.test.ts and test/integration/blockClipboard.test.ts (stale version: document and clipboard unchanged, current render plans the move or copy). The message text has no assertion.
- Method: test/session/blockReq.requirements.test.ts (a save or cancel from an older page of a writable preview is answered with an error; read-only gets none).
- Method: test/session/renderReq.codeCopy.requirements.test.ts (stale copy request copied and answered, another document dropped).
- Method: test/session/diagReq.plantuml.requirements.test.ts (include request handled for the current document even one render behind, dropped otherwise).
- Method: test/host/fmtableReq.requirements.test.ts (frontmatter save from an older render answered with the reopen hint; another document gets no answer).
- Method: test/integration/labelRename.test.ts (rename out-of-date answer; stale revision dropped, the page ends with the timeout text).
- Method: test/session/paletteReq.requirements.test.ts (label, citation, image picker and document picker requests answered with the out-of-date reason; current requests answered, and answered while a block editor is open on the render after its autosave moved the document, but not when no editor is open or it is open on another render; no file read and no dialog opened for a refused request).
- Method: test/session/reviewReqThreads.requirements.test.ts (thread request that names another revision gets the out-of-date answer).
- Method: test/session/toolbarReq.requirements.test.ts (link request of a stale page or a disposed preview is ignored).
- Criteria: the reason texts equal those of the tables (the move and clipboard messages have no assertion on the text). currentPreviewDocument returns nothing when the revision differs, the stage differs, or the document is not a .md file (eligibility needs a file path ending in .md in any case). The ready reports and the stale-save cases beyond the open-editor save are covered by the tests of SwRS-MDOKFSTUDIO-LIFE-071.
