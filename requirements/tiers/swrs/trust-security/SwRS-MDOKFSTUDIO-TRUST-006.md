---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-006
uuid: 2bfef6a2-6ff1-4861-b049-89854e961b8f
title: A read-only preview keeps every viewing action
description: When a read-only preview sends a page message that is none of the
  five edit requests, the host SHALL give it to the handler of its type, which
  answers it as it does for a writable preview unless that handler itself
  refuses a write.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-001
- StRS-MDOKFSTUDIO-CODE-004
- StRS-MDOKFSTUDIO-PALETTE-013
- StRS-MDOKFSTUDIO-THEME-011
- StRS-MDOKFSTUDIO-TOOLBAR-001
- StRS-MDOKFSTUDIO-TOOLBAR-009
- StRS-MDOKFSTUDIO-TOOLBAR-011
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/history.ts
- src/session/features/hostRequests.ts
- src/session/features/links.ts
- src/session/features/viewState.ts
- src/session/pageMessages.ts
tested_in_files:
- test/integration/untrusted-suite.ts
- test/session/diagReq.viewState.requirements.test.ts
- test/session/paletteReq.requirements.test.ts
- test/session/renderReq.codeCopy.requirements.test.ts
- test/session/toolbarReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## A read-only preview keeps every viewing action

### Normative behavior

When a read-only preview sends a page message that is none of the five edit requests, the host SHALL give it to the handler of its type, which answers it as it does for a writable preview unless that handler itself refuses a write.

### Scenario (nominal): Viewing actions of a read-only preview

A preview is read-only because the workspace is untrusted or the file is standalone. Each action below reaches its handler and has the outcome of the row.

| Action (page message) | Outcome in a read-only preview |
| --- | --- |
| Theme button (previewThemeModeChanged) | the mode is stored for the workspace, no error is shown |
| Zoom in (zoom preference of previewViewPreferenceChanged) | the zoom is stored for the workspace and applied to the next page |
| Table of contents button (previewViewPreferenceChanged) | the host stores the toc preference |
| Back and Next (previewHistoryGo) | the previous or next document opens, for a file outside the workspace with a history of two places |
| Follow a link to a sibling Markdown file (previewLink) | the file opens |
| Ask about a visible relative link (previewLinkDiscover) | the host answers with the target or the reason |
| Copy code (previewCopyText) | the requested code text is on the clipboard and the document is unchanged; no edit request is processed |
| Label list (previewListTargets) | answered from the document text, as in a writable preview |

### Scenario (nominal): The dispatcher stops only the five edit requests

- GIVEN a read-only preview and the list of edit requests (previewEditOpen, previewEditSave, previewEditCancel, previewFrontmatterSave, previewCheckboxToggle)
- WHEN previewViewPreferenceChanged, previewHistoryGo, previewLink or previewLinkDiscover is looked up in that list
- THEN none is in it, so the read-only refusal of the dispatcher does not apply to it and the handler of its type runs

### Scenario (refusal): A write handled by its own handler

- GIVEN a read-only preview
- WHEN the page sends previewBlockMove
- THEN the handler of the move answers its own refusal and changes nothing; see SwRS-MDOKFSTUDIO-TRUST-005

### Scenario (boundary): Messages that read nothing the preview may not use

| Input | Outcome |
| --- | --- |
| previewListCitations from a read-only preview | refused as SwRS-MDOKFSTUDIO-TRUST-005 says; the label list is answered |
| previewPaletteModeChanged from a read-only preview | nothing is stored |
| previewPickImage or previewPasteImage from a read-only preview | no dialog and no file written |
| previewThemeModeChanged or a zoom change with the old revision after a newer render | dropped by the render gate, as for a writable preview |
| previewEditOpen from the same read-only preview | refused with the read-only reason; the theme message is not an edit request and stays accepted |

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-005: the write requests of a read-only preview are refused with a reason
- SwRS-MDOKFSTUDIO-TRUST-001: a read-only preview offers no editing affordance

### Verification notes

- Method: test/integration/untrusted-suite.ts sends previewPaletteModeChanged, previewPickImage and previewPasteImage to a read-only preview (nothing stored, no dialog, no file written) and runs the untrusted checks of blockMove, blockClipboard and commentWrite (refusal scenario, boundary rows palette mode and image).
- Method: test/session/renderReq.codeCopy.requirements.test.ts (Copy code row, untrusted and standalone).
- Method: test/session/paletteReq.requirements.test.ts (`the label list is answered in a read-only preview, the citation list is refused`: label list row, citation row).
- Method: test/session/diagReq.viewState.requirements.test.ts (`a read-only preview stores a theme choice; its edit requests are refused`: theme row, previewEditOpen row; `a read-only preview stores a zoom change, and a message of an older render is dropped`: zoom row, old revision row).
- Method: test/session/toolbarReq.requirements.test.ts (`a read-only preview stores a view preference like a writable one`: toc row; `Back and Next work in a read-only preview`; `a read-only preview follows a link to a sibling Markdown file`; `a read-only preview answers the link discovery`).
- Untested: view preferences from a read-only preview at host level in the integration suite (the toc row is checked by a unit test only).
- Criteria: No type outside the five edit requests is stopped by the read-only check of the dispatcher. The label list handler reads only the document text of the render and touches no file.
