---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-014
uuid: d735dd40-78af-418c-992e-bce421ed708d
title: "A click or Enter on a mapped block opens its editor"
description: "When a writer clicks a rendered block in edit mode, or presses Enter
  or Space on a focused mapped block, the page SHALL open the editor of the mapped
  block under the click with previewEditOpen for its source lines instead of revealing
  its source, and show in the editor the source text or the error that the host returns
  in previewEditSource."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-003
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-001
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystRenderer.ts
- src/page/features/blockEditor.ts
- src/page/features/editMode.ts
- src/page/features/mappedBlocks.ts
- src/page/features/pageInput.ts
tested_in_files:
- test/core/render/includeMapping.test.ts
- test/integration/previewEditing.test.ts
- test/integration/realInput.markers.ts
- test/page/blockReq.requirements.test.ts
- test/page/runtimeBlockEditor.test.ts
- test/visual/scenarioDefinitions2.ts
---

## A click or Enter on a mapped block opens its editor

### Normative behavior

When a writer clicks a rendered block in edit mode, or presses Enter or Space on a focused mapped block, the page SHALL open the editor of the mapped block under the click with previewEditOpen for its source lines instead of revealing its source, and show in the editor the source text or the error that the host returns in previewEditSource.

### Scenario (nominal): Paragraph, image or admonition

- GIVEN edit mode on, a paragraph mapped to lines 5 to 6, a plain image paragraph and an admonition directive
- WHEN the writer clicks the paragraph, the image, or the title or the body of the admonition
- THEN the page posts previewEditOpen with the lines of the mapped block (5 and 6 for the paragraph, the complete directive from opening to closing fence for the admonition), hides the block and shows an editor frame after it

### Scenario (nominal): Enter or Space on a focused block

- GIVEN edit mode on and a focused paragraph
- WHEN the writer presses Enter
- THEN the default action is prevented and the editor of the paragraph opens with the caret at the end, like a click

### Scenario (nominal): Line range and placement per kind of block

| Clicked block in edit mode | Editor |
| --- | --- |
| an item of a list mapped to lines 5 to 8 with items at lines 5, 6 and 7 (also in a 460 px wide pane with long wrapped items), click on the item at line 6 | previewEditOpen carries line 5 and endLine 8; one editor holds every item and continuation line, appears after the hidden list, and the wrapped list source is not clipped |
| an item of a list nested in another list | the editor holds the nested list only, not the outer list (the nearest list wins) |
| a fenced code block | the frame is a sibling after the pre, the pre carries data-sphinx-preview-editing true, and the text box holds the fence lines exactly as in the file; after the writer adds a line and presses Done, the final save still starts and ends with the fence lines |
| a block that comes from an {include} | previewEditOpen names the lines of the {include} directive in the edited document and the editor holds the directive text; the included block carries data-sphinx-preview-included true |
| the words Diagram source of the collapsed disclosure of a Mermaid or PlantUML figure | the default toggle is prevented, the disclosure stays closed and the editor of the figure opens on the lines of the diagram block |

### Scenario (boundary): A linked image

| Input | Outcome |
| --- | --- |
| click on an image inside a link, edit mode, no modifier | the default action is prevented, the link is not followed and the block's editor opens |
| the same click with Cmd or Ctrl held | the link navigation runs and no editor opens |

### Scenario (refusal): Targets that open no block editor

| Input in edit mode | Outcome |
| --- | --- |
| Enter or Space with focus on a text box, a button, a link value of the properties table, a comment chip, an insert point or the Description toggle | no block editor opens |
| click on a comment chip in a paragraph | the chip expands and no editor opens |
| click on the body of an open comment thread | no editor opens |
| click on a mapped block that is itself inside a link | no editor opens |
| click on a cell of the properties table | no block editor opens; the field editor of the cell is specified by SwRS-MDOKFSTUDIO-FMEDIT-001 |
| click on a paragraph below the properties table | its block editor opens as usual |

### Scenario (refusal): Reading mode

| Input in reading mode | Outcome |
| --- | --- |
| click on a paragraph | no previewEditOpen is posted and no editor frame appears |
| click on the words Diagram source of a Mermaid figure | the disclosure opens or closes as usual, no editor opens, and the click reveals the source line |

### Scenario (nominal): The host answers with previewEditSource

- GIVEN the page posted previewEditOpen with an edit id and a line range, and no other block is being edited
- WHEN the host answers with previewEditSource for the same render and the same edit id
- THEN the answer carries line, endLine and originalText, the exact source text of those lines (originalText is "" and insertAfterLine is set for an insertion editor), and the editor of that edit id fills its text box with originalText and remembers its line ending (CRLF, LF, CR or none)

### Scenario (refusal): An error or a malformed previewEditSource

| Input | Outcome |
| --- | --- |
| previewEditSource with an error string for the active edit id | the editor stays, its status line shows the error text, pending navigation and selection are cleared and the editor accepts input again |
| previewEditOpen for lines that no longer exist in the document | the host answers with previewEditSource carrying the error "The preview is stale. Refresh it before editing this block." |
| previewEditOpen while another block is being edited | the host answers with previewEditSource carrying the error "Another Markdown block is already being edited." (see SwRS-MDOKFSTUDIO-BLOCK-041) |
| previewEditSource with an edit id other than the active editor's, or with no active editor | ignored |
| previewEditSource with neither an error string nor a string originalText | ignored |
| previewEditSource that arrives when the text box already exists | ignored |

### Known issues

- Known issue: Enter or Space on a focused link inside a paragraph follows the link and also opens the paragraph editor: the keydown listener excludes only links of the properties table, and the paragraph is the mapped target (deduced from the listener; no test).
- Known issue: a click on a link inside a paragraph is not excluded: the navigation handler posts previewLink and the document click handler then opens the editor of the paragraph (deduced from the handler order and the mapping of block elements only; no test clicks an inline link in edit mode).

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-001: a read-only preview offers no editing affordance
- SwRS-MDOKFSTUDIO-BLOCK-041: one edit at a time
- SwRS-MDOKFSTUDIO-TRUST-059: the page accepts only host messages addressed to its render
- SwRS-MDOKFSTUDIO-BLOCK-237: the accepted shape of previewEditOpen
- SwRS-MDOKFSTUDIO-FMEDIT-001: the field editor of a properties table cell
- SwRS-MDOKFSTUDIO-CORE-012: the mapping of included blocks
- SwRS-MDOKFSTUDIO-DIAG-001: the Mermaid figure markup and its Diagram source disclosure
- SwRS-MDOKFSTUDIO-DIAG-023: the PlantUML figure markup
- SwRS-MDOKFSTUDIO-TABLE-001: the editor of a pipe table cell

### Verification notes

- Method: test/page/runtimeBlockEditor.test.ts (`edit mode loads raw Markdown and saves changes when the block loses focus`: paragraph click and previewEditSource fills the text box; `fenced Markdown editors sit outside the rendered pre and preserve source when saving`: fenced code row). The reading mode paragraph row is not asserted here.
- Method: test/page/blockReq.requirements.test.ts (`Enter or Space on a focused block opens its editor with the caret at the end`: Enter scenario; `a click on a comment chip, an open thread or a block inside a link opens no editor`: chip, open thread and linked block rows; `a click on a cell of the properties table never opens a block editor`: properties table rows; `a click on Diagram source in edit mode opens the editor of the figure and not the disclosure`: Diagram source row and reading mode row). The insert point part of the Enter and Space row is asserted by `T28: document-level click and keydown on an insertion point never open a block editor` in test/page/runtimeBlockMoves.test.ts.
- Method: test/integration/realInput.test.ts (scenarioImageEditing, screenshot block-editing/r04, clicks plain, linked and raw img blocks: paragraph or image scenario; scenarioSaveKeepsBlockInPlace: fenced code row). No unit test covers the capture listener or the Cmd and Ctrl click of the linked image scenario.
- Method: visual scenarios in test/visual/scenarioDefinitions2.ts, block-editing/v04 (paragraph click), block-editing/v05 (admonition title click and fenced block; a click on the admonition body has no test) and block-editing/v12 (edit-list-narrow: list item row). The nested list case, the line range of a list (sourceRangeForList in src/page/features/mappedBlocks.ts) and lists that mix files are untested.
- Method: test/core/render/includeMapping.test.ts and test/integration/previewEditing.test.ts (an included block maps to the directive lines and carries data-sphinx-preview-included; a changed include target renders only after the edit: include row).
- Method: the previewEditSource scenarios (nominal answer, error and malformed rows) are not asserted by a dedicated test; the page receives the answer in the unit tests of test/page/runtimeBlockEditor.test.ts and in the integration flow of test/integration/previewEditing.test.ts.
- Criteria: One previewEditOpen per click, carrying the mapped line range of the clicked block; the keydown listener opens the editor only for a mapped block outside the listed controls; the line range of a list is the span of the mapped elements of the nearest list that belong to the same source file and document; the frame is never inside the pre and the rendered text of the fence is the raw source; the capture listener of bindEditModeCaptureClicks acts only for an IMG inside an anchor outside the properties table and the editors; the click handler returns before openMappedEditor for the excluded targets and openMappedEditor returns at once when the event target is inside [data-okf-properties]; the editor range equals the directive lines and the included file is never opened; the click target of Diagram source resolves to the figure through the mapped-block selector and event.preventDefault is called in edit mode.
