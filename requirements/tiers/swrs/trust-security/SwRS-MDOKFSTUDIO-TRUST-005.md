---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-005
uuid: 5e4cdfef-45cc-4199-be05-a4feed623017
title: 'The host handles the page messages of every preview, whatever the trust'
description: 'When the host receives a page message from a preview, the extension
  SHALL handle it as for a trusted workspace, whether the preview belongs to a trusted
  workspace, to Restricted Mode or to a standalone file, and SHALL refuse a write
  request only for a reason that does not depend on trust (an older render, an open
  edit, a document that is not a saved file, a file VS Code holds read-only, a malformed
  request) or because it needs a read that Restricted Mode narrows (the citation list).
  A refusal names its real cause and changes nothing.'
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
- StRS-MDOKFSTUDIO-PALETTE-018
- StRS-MDOKFSTUDIO-PALETTE-013
- StRS-MDOKFSTUDIO-TOOLBAR-001
- StRS-MDOKFSTUDIO-TOOLBAR-009
- StRS-MDOKFSTUDIO-TOOLBAR-011
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-065
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/blockEdits.ts
- src/session/features/comments.ts
- src/session/features/history.ts
- src/session/features/hostRequests.ts
- src/session/features/links.ts
- src/session/features/sourceEdits.ts
- src/session/features/viewState.ts
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
- test/session/diagReq.viewState.requirements.test.ts
- test/session/dropFiles.requirements.test.ts
- test/session/paletteReq.requirements.test.ts
- test/session/renderReq.codeCopy.requirements.test.ts
- test/session/renderReq.labelRename.requirements.test.ts
- test/session/reviewReqComments.requirements.test.ts
- test/session/reviewReqThreads.requirements.test.ts
- test/session/toolbarReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CODE-025
- SwRS-MDOKFSTUDIO-FMEDIT-051
- SwRS-MDOKFSTUDIO-GFM-026
- SwRS-MDOKFSTUDIO-MYST-042
- SwRS-MDOKFSTUDIO-TRUST-006
---

## The host handles the page messages of every preview, whatever the trust

### Normative behavior

When the host receives a page message from a preview, the extension SHALL handle it as for a trusted workspace, whether the preview belongs to a trusted workspace, to Restricted Mode or to a standalone file, and SHALL refuse a write request only for a reason that does not depend on trust (an older render, an open edit, a document that is not a saved file, a file VS Code holds read-only, a malformed request) or because it needs a read that Restricted Mode narrows (the citation list). A refusal names its real cause and changes nothing.

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

### Scenario (nominal): Viewing actions of a preview with restricted reads

A preview has restricted reads because the workspace is untrusted or the file is standalone. Each action below reaches its handler and has the outcome of the row.

| Action (page message) | Outcome in a preview with restricted reads |
| --- | --- |
| Theme button (previewThemeModeChanged) | the mode is stored for the workspace, no error is shown |
| Zoom in (zoom preference of previewViewPreferenceChanged) | the zoom is stored for the workspace and applied to the next page |
| Table of contents button (previewViewPreferenceChanged) | the host stores the toc preference |
| Back and Next (previewHistoryGo) | the previous or next document opens, for a file outside the workspace with a history of two places |
| Follow a link to a sibling Markdown file (previewLink) | the file opens |
| Ask about a visible relative link (previewLinkDiscover) | the host answers with the target or the reason |
| Copy code (previewCopyText) | the requested code text is on the clipboard and the document is unchanged |
| Label list (previewListTargets) | answered from the document text, as with full reads |

### Scenario (nominal): The dispatcher stops no request for trust

- GIVEN a preview with restricted reads
- WHEN the page sends previewEditOpen, previewViewPreferenceChanged, previewHistoryGo, previewLink or previewLinkDiscover
- THEN each reaches the handler of its type; a theme message stays accepted while an edit request is handled (see SwRS-MDOKFSTUDIO-TRUST-005)

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
| previewThemeModeChanged or a zoom change with the old revision after a newer render | Dropped by the render gate, as for a preview with full reads |

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
- Method: test/session/renderReq.codeCopy.requirements.test.ts (Copy code row, untrusted and standalone); test/session/diagReq.viewState.requirements.test.ts (`a restricted-reads preview stores a theme choice; its edit requests reach the handlers`, `a preview with restricted reads stores a zoom change, and a message of an older render is dropped`); test/session/toolbarReq.requirements.test.ts (the toc preference, Back and Next, a link to a sibling Markdown file, the link discovery); test/session/paletteReq.requirements.test.ts (`the label list is answered in a preview with restricted reads, the citation list is refused`).
- Untested: view preferences from a preview with restricted reads at host level in the integration suite (the toc row is checked by a unit test only).
- Criteria: the dispatcher stops no message type for restricted reads; the label list handler reads only the document text of the render and touches no file; no handler checks the trust or the missing workspace folder before it edits; PageMessageDispatcher stops no edit request for restricted reads; the citation handler is the only one that answers a trust reason; the paste root is the workspace folder, or the folder of the document when no workspace folder holds it.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-001](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-001.md): A document opens editable whatever the trust, with narrow reads outside a trusted folder
  - [StRS-MDOKFSTUDIO-BLOCK-014](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-014.md): A writer reorders blocks with arrows, keys and selections
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
  - [StRS-MDOKFSTUDIO-BLOCK-016](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-016.md): A writer selects blocks and copies, cuts and pastes them as Markdown
  - [StRS-MDOKFSTUDIO-BLOCK-006](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-006.md): Typed text is saved, survives updates and is never lost on leaving
  - [StRS-MDOKFSTUDIO-PALETTE-018](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-018.md): A writer pastes screenshots and rich text safely as Markdown
  - [StRS-MDOKFSTUDIO-PALETTE-013](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-013.md): A writer picks labels, documents, citations and code languages from host lists, with feedback
  - [StRS-MDOKFSTUDIO-TOOLBAR-001](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-001.md): The toolbar groups its controls, collapses and remembers its collapsed state
  - [StRS-MDOKFSTUDIO-TOOLBAR-009](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-009.md): The reader goes Back and Next through followed links without losing typed text
  - [StRS-MDOKFSTUDIO-TOOLBAR-011](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-011.md): Links open the right target, show where they lead, or are refused with a reason
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-065](SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
- Supersedes:
  - [SwRS-MDOKFSTUDIO-CODE-025](../code-blocks/SwRS-MDOKFSTUDIO-CODE-025.md): Allow copying in read-only previews
  - [SwRS-MDOKFSTUDIO-FMEDIT-051](../frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-051.md): A save in an untrusted workspace is refused
  - [SwRS-MDOKFSTUDIO-GFM-026](../gfm/SwRS-MDOKFSTUDIO-GFM-026.md): Read-only previews disable checkboxes
  - [SwRS-MDOKFSTUDIO-MYST-042](../myst/SwRS-MDOKFSTUDIO-MYST-042.md): The host refuses a rename in an untrusted or read-only preview
  - [SwRS-MDOKFSTUDIO-TRUST-006](SwRS-MDOKFSTUDIO-TRUST-006.md): A preview with restricted reads keeps every viewing action
<!-- okf:links:end -->
