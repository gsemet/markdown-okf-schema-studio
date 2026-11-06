---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-006
uuid: 2bfef6a2-6ff1-4861-b049-89854e961b8f
title: A preview with restricted reads keeps every viewing action
description: When a preview with restricted reads sends a page message that is
  not a write request, the host SHALL give it to the handler of its type, which
  answers it as it does for a preview with full reads.
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
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
supersedes:
- SwRS-MDOKFSTUDIO-CODE-025
---

## A preview with restricted reads keeps every viewing action

### Normative behavior

When a preview with restricted reads sends a page message that is not a write request, the host SHALL give it to the handler of its type, which answers it as it does for a preview with full reads.

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

### Scenario (boundary): Messages that read beyond what the preview may use

| Input | Outcome |
| --- | --- |
| previewListCitations from a preview with restricted reads | refused as SwRS-MDOKFSTUDIO-TRUST-005 says; the label list is answered |
| previewThemeModeChanged or a zoom change with the old revision after a newer render | dropped by the render gate, as for a preview with full reads |

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-005: the write requests of every preview are handled
- SwRS-MDOKFSTUDIO-TRUST-001: every editing control is offered whatever the trust

### Verification notes

- Method: test/session/renderReq.codeCopy.requirements.test.ts (Copy code row, untrusted and standalone).
- Method: test/session/paletteReq.requirements.test.ts (`the label list is answered in a preview with restricted reads, the citation list is refused`: label list row, citation row).
- Method: test/session/diagReq.viewState.requirements.test.ts (`a restricted-reads preview stores a theme choice; its edit requests reach the handlers`: theme row and the dispatcher scenario; `a preview with restricted reads stores a zoom change, and a message of an older render is dropped`: zoom row, old revision row).
- Method: test/session/toolbarReq.requirements.test.ts (`a preview with restricted reads stores a view preference like any other`: toc row; `Back and Next work in a preview with restricted reads`; `a preview with restricted reads follows a link to a sibling Markdown file`; `a preview with restricted reads answers the link discovery`).
- Untested: view preferences from a preview with restricted reads at host level in the integration suite (the toc row is checked by a unit test only).
- Criteria: The dispatcher stops no message type for restricted reads. The label list handler reads only the document text of the render and touches no file.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-001](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-001.md): A document opens editable whatever the trust, with narrow reads outside a trusted folder
  - [StRS-MDOKFSTUDIO-CODE-004](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-004.md): A reader copies the exact code of a block
  - [StRS-MDOKFSTUDIO-PALETTE-013](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-013.md): A writer picks labels, documents, citations and code languages from host lists, with feedback
  - [StRS-MDOKFSTUDIO-THEME-011](../../strs/theme-zoom/StRS-MDOKFSTUDIO-THEME-011.md): A reader zooms the text and the column and keeps the zoom
  - [StRS-MDOKFSTUDIO-TOOLBAR-001](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-001.md): The toolbar groups its controls, collapses and remembers view choices
  - [StRS-MDOKFSTUDIO-TOOLBAR-009](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-009.md): The reader goes Back and Next through followed links without losing typed text
  - [StRS-MDOKFSTUDIO-TOOLBAR-011](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-011.md): Links open the right target, show where they lead, or are refused with a reason
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-005](SwRS-MDOKFSTUDIO-TRUST-005.md): The host handles the write requests of every preview, whatever the trust
  - [SwRS-MDOKFSTUDIO-TRUST-001](SwRS-MDOKFSTUDIO-TRUST-001.md): A document is editable whatever the trust; only its reads are restricted
- Supersedes:
  - [SwRS-MDOKFSTUDIO-CODE-025](../code-blocks/SwRS-MDOKFSTUDIO-CODE-025.md): Allow copying in read-only previews
<!-- okf:links:end -->
