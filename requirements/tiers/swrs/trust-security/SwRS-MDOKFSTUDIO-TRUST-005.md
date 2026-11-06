---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-005
uuid: 5e4cdfef-45cc-4199-be05-a4feed623017
title: The host handles the write requests of every preview, whatever the trust
description: When the host receives a write request from a preview for the
  render it holds, the extension SHALL handle it as for a trusted workspace, in
  Restricted Mode and for a standalone file too, and refuse it only for a reason
  that does not depend on trust or because it needs a read that Restricted Mode
  narrows.
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
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
- test/session/blockReq.requirements.test.ts
- test/session/checkboxRefusal.test.ts
- test/session/dropFiles.requirements.test.ts
- test/session/paletteReq.requirements.test.ts
- test/session/renderReq.labelRename.requirements.test.ts
- test/session/reviewReqComments.requirements.test.ts
- test/session/reviewReqThreads.requirements.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMEDIT-051
- SwRS-MDOKFSTUDIO-GFM-026
- SwRS-MDOKFSTUDIO-MYST-042
---

## The host handles the write requests of every preview, whatever the trust

### Normative behavior

When the host receives a write request from a preview for the render it holds, the extension SHALL handle it as for a trusted workspace, whether the preview belongs to a trusted workspace, to Restricted Mode or to a standalone file, and SHALL refuse it only for a reason that does not depend on trust (an older render, an open edit, a document that is not a saved file, a file VS Code holds read-only, a malformed request) or because it needs a read that Restricted Mode narrows (the citation list). A refusal names its real cause and changes nothing.

### Scenario (nominal): Every write request type is handled

- GIVEN a preview with restricted reads (an untrusted workspace, or a file outside every workspace folder) and a valid, current write request of any type in the table
- WHEN the host receives the request
- THEN the request is handled by the handler of its type, as in a trusted workspace

| Request type | Outcome in a preview with restricted reads |
| --- | --- |
| previewEditOpen, previewEditSave, previewEditCancel | the block editor opens, saves and closes; the document is edited |
| previewFrontmatterSave | the frontmatter is saved in one document edit |
| previewCheckboxToggle | the checkbox or radio option is written to the source |
| previewBlockMove | the two blocks swap in one edit |
| previewBlocksCopy, previewBlocksCut, previewBlocksPaste, previewDropFiles | the blocks are copied, cut and pasted; dropped files are written as links, a Markdown file without a title read in a preview with restricted reads, and for a standalone document any file, linked relative to the document |
| previewLabelRename | the label line is renamed |
| previewThreadReply, previewThreadDelete | the thread comment is changed in the document |
| previewFindReplace | the matched spans are replaced in one undo step |
| previewCommentCreate, previewCommentReply, previewCommentResolve, previewCommentDelete | the comments file next to the document is read and written |
| previewPickDocument | the document dialog opens |
| previewPickImage | the image dialog opens; the picked image must lie in a workspace folder, or in the folder of the document for a standalone file ("The image must be inside the folder of the document.") |
| previewPasteImage | the image is saved next to the document; for a standalone file the folder of the document is the root, for a document in a workspace folder that folder is |
| previewPaletteModeChanged, previewEditModeChanged | the choice is stored for the workspace |

### Scenario (refusal): The citation list needs a trusted workspace folder

- GIVEN a preview with restricted reads
- WHEN the page sends previewListCitations for the current render
- THEN the host answers ok false with "Listing citations searches the workspace for .bib files, which needs a trusted workspace folder that holds this file." and reads no file; the label list (previewListTargets) is answered from the document text

### Scenario (refusal): Reasons that do not depend on trust

| Input | Outcome |
| --- | --- |
| A write request that names an older render | Answered with the out-of-date reason, or dropped for a message of another document (see SwRS-MDOKFSTUDIO-TRUST-065) |
| A write while a Markdown edit is open on the host side | Refused with "Save or cancel the open Markdown edit ..." |
| A document that is not a saved file | Refused (for example "Save the document before pasting an image.") |
| A file that VS Code holds read-only (files.readonlyInclude, or made read-only in the session) | VS Code accepts the edit and writes nothing: every write above (the label rename, thread reply and delete, find and replace, block save, move, cut, paste and drop, checkbox toggle, metadata save) checks that the text changed and answers "This file is read-only in VS Code." instead of success (see SwRS-MDOKFSTUDIO-TRUST-001); a pasted image whose block save fails that way is deleted again |
| A malformed checkbox toggle or radio group | Answered with "The checkbox request was not understood. Refresh the preview." |

### Scenario (nominal): Host-side writes follow the trust-free rule

| Input | Outcome |
| --- | --- |
| A preview with restricted reads switches document | A previewFlushEdit is posted, like for any preview |
| A document is saved and the only preview of it has restricted reads | The moved lines are written to the review comments file |

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-001: the page offers every editing control in every preview
- SwRS-MDOKFSTUDIO-TRUST-065: the render check that runs before the handler of a write request

### Verification notes

- Method: test/session/blockReq.requirements.test.ts, unit tests `a restricted-reads preview opens, saves and cancels a block like a writable one`, `a restricted-reads preview and a writable one both post a flush request before a switch`, `an open, save or cancel from an older page of a preview is answered with an error` and the edit mode test (block edit, flush and edit mode rows). Before the change these were refusals with the read-only reason.
- Method: test/session/checkboxRefusal.test.ts and test/session/radioChoice.test.ts (a checkbox toggle and a radio choice of a standalone file or in Restricted Mode reach the handler through PageMessageDispatcher; the malformed rows).
- Method: test/host/fmtableReq.requirements.test.ts, unit test a frontmatter save in an untrusted workspace is applied like in a trusted one (frontmatter row).
- Method: test/session/renderReq.labelRename.requirements.test.ts (a rename in a standalone file or in Restricted Mode is applied; rename row), test/session/reviewReqThreads.requirements.test.ts (reply, delete and find and replace of a preview with restricted reads are applied; thread and find rows), test/session/dropFiles.requirements.test.ts (a drop is written; no Markdown file is read under restricted reads; a standalone document links any file; a read-only file is refused).
- Method: test/session/reviewReqComments.requirements.test.ts (a comment of a standalone file or in Restricted Mode is written next to the document, and the moved lines are written when the document is saved; comment and host-side rows).
- Method: test/session/paletteReq.requirements.test.ts (the document picker opens; the image picker of a standalone file accepts an image of the document folder and refuses one elsewhere; an image paste is saved next to a standalone file and in Restricted Mode; the citation list is refused with its reason and no file is read).
- Method: test/integration/untrusted-suite.ts, blockMove.test.ts, blockClipboard.test.ts and commentWrite.test.ts (runUntrusted) and test/integration/standalone-suite.ts run the same requests in a real Restricted Mode window and for a standalone file; they run in the real-window jobs only and were compiled but not run on the author's machine.
- Criteria: no handler checks the trust or the missing workspace folder before it edits; PageMessageDispatcher stops no edit request for restricted reads; the citation handler is the only one that answers a trust reason; the paste root is the workspace folder, or the folder of the document when no workspace folder holds it.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-001](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-001.md): A document opens editable whatever the trust, with narrow reads outside a trusted folder
  - [StRS-MDOKFSTUDIO-BLOCK-014](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-014.md): A writer reorders blocks with arrows, keys and selections
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
  - [StRS-MDOKFSTUDIO-BLOCK-016](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-016.md): A writer selects blocks and copies, cuts and pastes them as Markdown
  - [StRS-MDOKFSTUDIO-BLOCK-006](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-006.md): Typed text is saved, survives updates and is never lost on leaving
  - [StRS-MDOKFSTUDIO-FMEDIT-008](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-008.md): Metadata edits keep the source intact, follow the schema and never lose text
  - [StRS-MDOKFSTUDIO-GFM-003](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-003.md): A writer toggles task checkboxes from the preview
  - [StRS-MDOKFSTUDIO-MYST-009](../../strs/myst/StRS-MDOKFSTUDIO-MYST-009.md): A writer sees, links and renames labels safely
  - [StRS-MDOKFSTUDIO-PALETTE-013](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-013.md): A writer picks labels, documents, citations and code languages from host lists, with feedback
  - [StRS-MDOKFSTUDIO-PALETTE-007](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-007.md): A writer inserts links, images, figures, tables, colours and emoji through pickers
  - [StRS-MDOKFSTUDIO-PALETTE-018](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-018.md): A writer pastes screenshots and rich text safely as Markdown
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-065](SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
- Supersedes:
  - [SwRS-MDOKFSTUDIO-FMEDIT-051](../frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-051.md): A save in an untrusted workspace is refused
  - [SwRS-MDOKFSTUDIO-GFM-026](../gfm/SwRS-MDOKFSTUDIO-GFM-026.md): Read-only previews disable checkboxes
  - [SwRS-MDOKFSTUDIO-MYST-042](../myst/SwRS-MDOKFSTUDIO-MYST-042.md): The host refuses a rename in an untrusted or read-only preview
<!-- okf:links:end -->
