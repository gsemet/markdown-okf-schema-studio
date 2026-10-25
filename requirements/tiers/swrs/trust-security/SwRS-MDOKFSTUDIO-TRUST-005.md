---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-005
uuid: 5e4cdfef-45cc-4199-be05-a4feed623017
title: The host refuses every write request of a read-only preview with a reason
description: When the host receives a write request from a read-only preview for
  the render it holds, the extension SHALL refuse it with the read-only reason
  that names the real cause, before it reads the document, opens a dialog or
  writes a file, and change nothing.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-001
- StRS-MDOKFSTUDIO-BLOCK-014
- StRS-MDOKFSTUDIO-BLOCK-025
- StRS-MDOKFSTUDIO-BLOCK-016
- StRS-MDOKFSTUDIO-BLOCK-006
- StRS-MDOKFSTUDIO-FMEDIT-008
- StRS-MDOKFSTUDIO-GFM-003
- StRS-MDOKFSTUDIO-MYST-009
- StRS-MDOKFSTUDIO-PALETTE-013
- StRS-MDOKFSTUDIO-PALETTE-007
- StRS-MDOKFSTUDIO-PALETTE-018
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-065
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/checkboxes.ts
- src/session/features/blockEdits.ts
- src/session/features/comments.ts
- src/session/features/hostRequests.ts
- src/session/features/sourceEdits.ts
- src/session/pageMessages.ts
tested_in_files:
- test/host/fmtableReq.requirements.test.ts
- test/integration/blockClipboard.test.ts
- test/integration/blockMove.test.ts
- test/integration/commentWrite.test.ts
- test/integration/imagePaste.test.ts
- test/integration/standalone-suite.ts
- test/integration/untrusted-suite.ts
- test/page/runtimePageControls.test.ts
- test/session/blockReq.requirements.test.ts
- test/session/checkboxRefusal.test.ts
- test/session/paletteReq.requirements.test.ts
- test/session/readOnlyFirstLoad.test.ts
- test/session/renderReq.labelRename.requirements.test.ts
- test/session/reviewReqComments.requirements.test.ts
- test/session/reviewReqThreads.requirements.test.ts
---

## The host refuses every write request of a read-only preview with a reason

### Normative behavior

When the host receives a write request from a read-only preview for the render it holds, the extension SHALL refuse it with the read-only reason that names the real cause (an untrusted workspace, or a file outside every workspace folder), before it reads the document, opens a dialog or writes a file, and change nothing.

### Scenario (refusal): The read-only reason

| Cause of the read-only preview | Read-only reason |
| --- | --- |
| The workspace is not trusted | Editing requires a trusted workspace. |
| The file is outside every workspace folder (a standalone file) | Editing needs the file's folder opened as a workspace folder in VS Code. |

- GIVEN a read-only preview
- WHEN any refusal below is shown, or the tooltip of a disabled checkbox
- THEN the text is the read-only reason of the table above for the cause of that preview, never the trust text for a standalone file, and the page receives the same reason in its boot context for the tooltip

### Scenario (refusal): Every write request type

- GIVEN a read-only preview (an untrusted workspace, or a file outside every workspace folder) and a valid, current write request of any type in the table
- WHEN the host receives the request
- THEN the page is answered with the read-only reason (column "Reason text") before the document is read, a dialog opens or a file is written (the five edit types previewEditOpen, previewEditSave, previewEditCancel, previewFrontmatterSave and previewCheckboxToggle are refused before their handler runs; every other type is refused by its own handler first), and the document, the clipboard, the comments file and the disk are unchanged

| Request type | Reason text | Answered as |
| --- | --- | --- |
| previewEditOpen, previewEditSave, previewEditCancel | the read-only reason | block edit error |
| previewFrontmatterSave | the read-only reason | frontmatter edit error |
| previewCheckboxToggle | the read-only reason | checkbox result with an error |
| previewBlockMove | the read-only reason | move result, ok false |
| previewBlocksCopy, previewBlocksCut, previewBlocksPaste | the read-only reason | blocks result, ok false |
| previewLabelRename | the read-only reason | rename result, ok false |
| previewThreadReply, previewThreadDelete | the read-only reason | thread result, ok false |
| previewCommentCreate, previewCommentReply, previewCommentResolve, previewCommentDelete | the read-only reason | comment result, ok false, and a warning is shown |
| previewListCitations | the read-only reason | host result, ok false; no file is read |
| previewPickDocument | the read-only reason | host result, ok false; no dialog opens |
| previewPickImage | the read-only reason | host result, ok false; no dialog opens |
| previewPasteImage | the read-only reason | host result, ok false; nothing is written |

### Scenario (nominal): Writable preview

- GIVEN a writable preview
- WHEN the same request of any type in the table arrives
- THEN it is handled by the handler of its type (the open is handled, the move, cut and thread reply are planned and applied, the citation keys are answered, the document and image dialogs open, the pasted image is saved)
- AND GIVEN a trusted workspace and a file inside it, the same previewFrontmatterSave is processed normally

### Scenario (refusal): Message of an older render

- GIVEN a read-only preview and a previewEditSave that names an older render
- WHEN the message arrives
- THEN it is dropped by the render check, with no answer, before the read-only check (see SwRS-MDOKFSTUDIO-TRUST-065)

### Scenario (refusal): Frontmatter save and rename in a read-only preview

- GIVEN a read-only preview of a document with frontmatter, or of a document with a MyST label
- WHEN the page sends previewFrontmatterSave for the current render, or a previewLabelRename
- THEN the host answers with the error of the table and the document text is unchanged; for previewFrontmatterSave the handler does not run

### Scenario (boundary): Disabled checkbox in a read-only preview

- GIVEN a read-only preview of a document with task checkboxes
- WHEN it is rendered
- THEN the checkboxes are disabled with the read-only reason as the tooltip, and a previewCheckboxToggle sent anyway is refused with the reason of the table (the tooltip of the disabled box carries the same reason)

### Scenario (boundary): Host-side writes that a read-only preview never starts

| Input | Outcome |
| --- | --- |
| A read-only preview switches document | No previewFlushEdit is posted (a writable preview posts it) |
| A document is saved and the only previews of it are read-only | Nothing is written to the review comments file (a writable preview of the document gets its moved lines written) |

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-001: the page offers no control for these requests in a read-only preview
- SwRS-MDOKFSTUDIO-TRUST-065: the render check that runs before the read-only check

### Verification notes

- Method: test/integration/standalone-suite.ts sends previewFrontmatterSave to a read-only preview and checks that the document text is unchanged (frontmatter row, document unchanged). The older render scenario, the order of the checks and the missing handler call for the other types are untested through the dispatcher: no unit test covers PageMessageDispatcher in src/session/pageMessages.ts.
- Method: test/session/blockReq.requirements.test.ts, unit tests `a read-only preview answers the open, save and cancel of a block with the read-only reason` (block edit row) and `a read-only preview posts no flush request before a switch, a writable preview does` (flush row, writable scenario). The page does not offer the Edit button in such a preview, so the refusal is a second line of defence. The read-only reason of the file-outside-the-workspace cause is the one asserted there.
- Method: test/host/fmtableReq.requirements.test.ts, unit test a frontmatter save in an untrusted workspace is refused with the trust message and changes nothing (frontmatter row). The frontmatter row uses the same read-only reason function as the other rows.
- Method: test/page/runtimePageControls.test.ts, unit test "checkboxes are disabled when the preview cannot edit the document" (disabled checkbox scenario). The host refusal of previewCheckboxToggle (both reasons) is tested in test/session/checkboxRefusal.test.ts.
- Method: test/integration/blockMove.test.ts (a read-only preview must not move a block; move row and writable scenario).
- Method: test/integration/blockClipboard.test.ts and test/integration/untrusted-suite.ts (an untrusted preview leaves document and clipboard unchanged; copy, cut and paste row; the untrusted suite also shows that a read-only preview opens no image dialog and writes no file; the answered image picker text is untested).
- Method: test/session/renderReq.labelRename.requirements.test.ts, unit test "a rename in an untrusted or read-only preview changes nothing and answers with the read-only reason" (rename row).
- Method: test/session/reviewReqThreads.requirements.test.ts, unit test a reply or a delete from a read-only preview is refused and changes nothing (thread row).
- Method: test/integration/commentWrite.test.ts (runUntrusted: no comments file written, the refusal reported, resolve and delete answered; comment row).
- Method: test/session/reviewReqComments.requirements.test.ts, unit test "a comment from a read-only preview is refused with the real cause" (comment row, both causes), and the unit test saving writes nothing to the comments file when the only previews are read-only (host-side writes table, second row).
- Method: test/session/paletteReq.requirements.test.ts, unit tests the citation list is refused in a read-only preview and no file is read, and the document picker is refused in a read-only preview and opens no dialog; a writable preview opens it (citation and document picker rows, writable scenario).
- Method: test/integration/imagePaste.test.ts (refusals write nothing and the document is unchanged; image paste row); the answered text of the paste is untested. Unlike the pickers, the paste handler does not check the render revision.
- Criteria: EDIT_REQUEST_TYPES holds exactly previewEditOpen, previewEditSave, previewEditCancel, previewFrontmatterSave and previewCheckboxToggle, and handlePageState refuses them after the render check; every other handler in the table checks readOnly first and answers before reading the document, opening a dialog or writing a file; the disabled state and the refusal text of the checkbox match.
