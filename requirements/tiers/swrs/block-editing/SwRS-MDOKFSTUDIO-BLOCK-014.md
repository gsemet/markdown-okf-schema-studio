---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-014
uuid: d735dd40-78af-418c-992e-bce421ed708d
title: "A click or Enter on a mapped block opens its editor"
description: "When a writer clicks a rendered block in edit mode, or presses Enter
  or Space on a focused mapped block, the page SHALL open the editor of the mapped
  block under the click with previewEditOpen for its source lines instead of revealing
  its source, show in the editor the source text or the error that the host returns
  in previewEditSource, and give every rendered horizontal rule a box 25 px tall (the
  1 px line plus 12 px of transparent padding above and below, with the page spacing
  unchanged) so that a click within 12 px of the line opens the rule's block editor."
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-003
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-001
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-TRUST-059
scenarios:
- id: S1
  title: Paragraph, image or admonition
- id: S2
  title: Enter or Space on a focused block
- id: S3
  title: Line range and placement per kind of block
- id: S4
  title: A link inside a mapped block
- id: S5
  title: The tooltip says how to follow a link in edit mode
- id: S6
  title: Targets that open no block editor
- id: S7
  title: Reading mode
- id: S8
  title: The host answers with previewEditSource
- id: S9
  title: An error or a malformed previewEditSource
- id: S10
  title: Click above the line
- id: S11
  title: Spacing unchanged
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.ts
- src/core/preview/styles/editModeStyles.ts
- src/core/render/mystBoxLines.ts
- src/core/render/mystRenderer.ts
- src/page/features/blockEditor.ts
- src/page/features/editMode.ts
- src/page/features/linkEditing.ts
- src/page/features/mappedBlocks.ts
- src/page/features/pageInput.ts
- src/page/modules/linkNavigation.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/core/render/includeMapping.test.ts
- test/integration/realInput/editorWidgets.ts
- test/page/blockReq.requirements.test.ts
- test/page/linkEditModeClick.test.ts
- test/page/runtimeBlockEditor.test.ts
- test/page/runtimeContentPatch.test.ts
- test/page/runtimeStructuralNavigation.test.ts
- test/session/alertBlockEditOpen.test.ts
- test/session/boxBlockSourceLines.test.ts
- test/session/listItemEditOpen.test.ts
- test/visual/alertEditingScenarios.ts
- test/visual/capture_list_numbers.py
- test/visual/linkEditModeScenarios.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-BLOCK-002
---

## A click or Enter on a mapped block opens its editor

### Normative behavior

When a writer clicks a rendered block in edit mode, or presses Enter or Space on a focused mapped block, the page SHALL open the editor of the mapped block under the click with previewEditOpen for its source lines instead of revealing its source, and show in the editor the source text or the error that the host returns in previewEditSource.

### Scenario S1 (nominal): Paragraph, image or admonition

- GIVEN edit mode on, a paragraph mapped to lines 5 to 6, a plain image paragraph, an admonition directive (a `{note}` in a backtick or colon fence) and a GitHub alert (`> [!NOTE]`)
- WHEN the writer clicks the paragraph, the image, the title or the frame of the admonition or of the alert, or a paragraph or a list item of their body
- THEN the page posts previewEditOpen with the lines of the mapped block (5 and 6 for the paragraph; the complete directive from opening to closing fence for a click on the title or the frame of the admonition; the whole alert from its marker line to its last quoted line for a click on the title or the frame of the alert; the paragraph or the item on its own lines for a click on it in the body of either), hides the block and shows an editor frame after it

### Scenario S2 (nominal): Enter or Space on a focused block

- GIVEN edit mode on and a focused paragraph
- WHEN the writer presses Enter
- THEN the default action is prevented and the editor of the paragraph opens with the caret at the end, like a click

### Scenario S3 (nominal): Line range and placement per kind of block

| Clicked block in edit mode | Editor |
| --- | --- |
| an item of a list mapped to lines 5 to 8 with items at lines 5, 6 and 7 (also in a 460 px wide pane with long wrapped items), click on the item at line 6 | previewEditOpen carries the lines of that item only: the range the renderer gives the item, from its first line to the line before the next item (a blank line between two items belongs to the first, as it belongs to the list), whatever the item holds (paragraphs, an inline code span or a comment over several lines, an HTML block, a code block); the editor holds the item and its continuation lines, appears after the hidden item, and the wrapped source is not clipped; in an ordered list the next items keep their numbers while the item is edited |
| an item of a list nested in another list, or the rest of the outer item | the editor holds the nested item only (the nearest item wins); a click elsewhere in the outer item opens the outer item, its nested list included |
| the list itself, outside its items | the editor holds the whole list; from the keyboard, the selected list opens the whole list too (SwRS-MDOKFSTUDIO-BLOCK-254) |
| a wrapped item of a tight list (no blank line between items) | the editor holds every wrapped line of the item |
| another block, while an item editor holds changes, then a click on the first item of a list | once the save is rendered, the first item opens, not the list that starts on the same line |
| a paragraph or a list item in the body of a MyST admonition (`{note}` in a backtick or colon fence) | previewEditOpen carries the lines of that paragraph or item only, and the editor holds them; the list rows above apply inside the body; a list around the admonition never takes over a block of its body; with nested admonitions the nearest one decides, and the outer one opens only from its own title or frame; the title or the frame of the admonition opens the whole directive, opening fence to closing fence |
| a paragraph or a list item in the body of a GitHub alert, also an alert indented in a list item | previewEditOpen carries the lines of that paragraph or item exactly as in the file, quote markers and list-item indentation included; a list around the alert never takes over a block of its body; the title or the frame of the alert opens the whole alert, marker line to last quoted line, with its indentation (SwRS-MDOKFSTUDIO-GFM-009) |
| a directive in the body of a MyST admonition or a GitHub alert (`{mermaid}`, `{math}`, `{code-block}` with or without a caption, `{code}`, `{code-cell}`, `{list-table}`, `{csv-table}`, a Quarto callout, a nested admonition) or a bare LaTeX environment, also a directive in a list item of that body (Enter on the selected directive) | previewEditOpen carries every line of the directive, opening fence to closing fence (the LaTeX environment, `\begin` to `\end`); no block of a box holds a fence line of a directive around it |
| inside an admonition or an alert, text written on a directive's opening line (the body of `:::{warning} Text`, a card title, the caption argument of a `{table}`) | it is no block of its own: the click or Enter opens the nearest block around it (the one-line directive itself, the card, or, for the table caption, the admonition) |
| the body of a `{versionadded}`, `{versionchanged}` or `{deprecated}` admonition | previewEditOpen carries the lines the clicked block is written on, after the blank lines and options before it; when those lines cannot be found (an included body, option lines the parser rewrites), the whole directive opens |
| a fenced code block | the frame is a sibling after the pre, the pre carries data-sphinx-preview-editing true, and the text box holds the fence lines exactly as in the file; after the writer adds a line and presses Done, the final save still starts and ends with the fence lines |
| a block that comes from an {include} | previewEditOpen names the lines of the {include} directive in the edited document and the editor holds the directive text; the included block carries data-sphinx-preview-included true |
| the words Diagram source of the collapsed disclosure of a Mermaid or PlantUML figure | the default toggle is prevented, the disclosure stays closed and the editor of the figure opens on the lines of the diagram block |

### Scenario S4 (boundary): A link inside a mapped block

A link here is any link inside a mapped block: a link inside a paragraph, a paragraph made only of a link (the closing "Next: Related" line of a chapter), the title, header, body or footer of a `:link:` card (SwRS-MDOKFSTUDIO-BLOCK-258), a linked image, a same-page anchor, a footnote reference or an external URL.

| Input, edit mode on | Outcome |
| --- | --- |
| click on a link, no modifier | the default action is prevented, the link is not followed (no previewLink) and the editor of the block that holds the link opens, as a click on the text around it does |
| Enter or Space on a focused link | the same as a click: the default action is prevented and the block's editor opens |
| click on a mapped block that is itself inside a link | the editor of that block opens and the link is not followed |
| click on a link with Cmd or Ctrl held, or Cmd/Ctrl+Enter on a focused link | the link navigation runs (SwRS-MDOKFSTUDIO-TOOLBAR-077) and no editor opens |
| middle click on a link | the link navigation runs and no editor opens |
| click on a link while the editor of another block is open | as a click on any other block (SwRS-MDOKFSTUDIO-BLOCK-041): the open editor is saved first, no other file opens, so the keys typed next never reach the link target |
| the pointer over a link | the block that holds it gets the edit-hover outline (SwRS-MDOKFSTUDIO-BLOCK-017) and the text cursor, like the text around the link; on a `:link:` card only the part under the pointer is outlined; a link whose click keeps its own behaviour (properties table, comment thread, open editor, outside a mapped block) keeps the pointer cursor and gets no outline |

| Input, edit mode off (reading) | Outcome |
| --- | --- |
| click, Enter or Space on a link | unchanged: the link is followed and no editor opens |

### Scenario S5 (nominal): The tooltip says how to follow a link in edit mode

| Given | When | Then |
| --- | --- | --- |
| a link inside a mapped block whose tooltip is its target path, its blocked reason or its `link-alt` text | edit mode is turned on | the tooltip keeps that text on its first line and gets the second line "Cmd+click to follow" on macOS, "Ctrl+click to follow" elsewhere; a link without a tooltip shows only that line |
| the same link in edit mode | the host answers a target discovery for it, or the content is rendered again | the new target is the first line and the second line stays |
| the same link | edit mode is turned off | the second line is removed and the tooltip is the text it had without it |
| a link value of the properties table | edit mode is turned on | its tooltip is unchanged |

### Scenario S6 (refusal): Targets that open no block editor

| Input in edit mode | Outcome |
| --- | --- |
| Enter or Space with focus on a text box, a button, a link value of the properties table, a comment chip, an insert point or the Description toggle | no block editor opens |
| click on a comment chip in a paragraph | the chip expands and no editor opens |
| click on the body of an open comment thread | no editor opens |
| click, Enter or Space on a link value of the properties table, in a comment thread or on the anchor icon of a label | the link keeps its own behaviour (field editor, thread, label rename) and no block editor opens |
| click on a cell of the properties table | no block editor opens; the field editor of the cell is specified by SwRS-MDOKFSTUDIO-FMEDIT-001 |
| click on a paragraph below the properties table | its block editor opens as usual |

### Scenario S7 (refusal): Reading mode

| Input in reading mode | Outcome |
| --- | --- |
| click on a paragraph | no previewEditOpen is posted and no editor frame appears |
| click on the words Diagram source of a Mermaid figure | the disclosure opens or closes as usual, no editor opens, and the click reveals the source line |

### Scenario S8 (nominal): The host answers with previewEditSource

- GIVEN the page posted previewEditOpen with an edit id and a line range, and no other block is being edited
- WHEN the host answers with previewEditSource for the same render and the same edit id
- THEN the answer carries line, endLine and originalText, the exact source text of those lines (originalText is "" and insertAfterLine is set for an insertion editor), and the editor of that edit id fills its text box with originalText and remembers its line ending (CRLF, LF, CR or none)

### Scenario S9 (refusal): An error or a malformed previewEditSource

| Input | Outcome |
| --- | --- |
| previewEditSource with an error string for the active edit id | the editor stays, its status line shows the error text, pending navigation and selection are cleared and the editor accepts input again |
| previewEditOpen for lines that no longer exist in the document | the host answers with previewEditSource carrying the error "The preview is stale. Refresh it before editing this block." |
| previewEditOpen while another block is being edited | the host answers with previewEditSource carrying the error "Another Markdown block is already being edited." (see SwRS-MDOKFSTUDIO-BLOCK-041) |
| previewEditSource with an edit id other than the active editor's, or with no active editor | ignored |
| previewEditSource with neither an error string nor a string originalText | ignored |
| previewEditSource that arrives when the text box already exists | ignored |

### Scenario S10 (nominal): Click above the line

- GIVEN a rendered page with a horizontal rule and edit mode on
- WHEN the writer clicks 10 px above or below the line of the rule
- THEN the click lands on the rule and opens its block editor

### Scenario S11 (boundary): Spacing unchanged

- GIVEN the same page
- WHEN the rule is laid out
- THEN its 12 px of padding on each side is taken from its margin, so the distance between the surrounding blocks is the same as with a bare 1 px rule

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-001: every preview offers its editing affordances
- SwRS-MDOKFSTUDIO-BLOCK-041: one edit at a time
- SwRS-MDOKFSTUDIO-TRUST-059: the page accepts only host messages addressed to its render
- SwRS-MDOKFSTUDIO-BLOCK-259: the accepted shape of previewEditOpen
- SwRS-MDOKFSTUDIO-FMEDIT-001: the field editor of a properties table cell
- SwRS-MDOKFSTUDIO-CORE-012: the mapping of included blocks
- SwRS-MDOKFSTUDIO-DIAG-001: the Mermaid figure markup and its Diagram source disclosure
- SwRS-MDOKFSTUDIO-DIAG-023: the PlantUML figure markup
- SwRS-MDOKFSTUDIO-TABLE-001: the editor of a pipe table cell

### Verification notes

- Method: test/page/runtimeBlockEditor.test.ts (`edit mode loads raw Markdown and saves changes when the block loses focus`: paragraph click and previewEditSource fills the text box; `fenced Markdown editors sit outside the rendered pre and preserve source when saving`: fenced code row). The reading mode paragraph row is not asserted here.
- Method: test/page/blockReq.requirements.test.ts (`a click on a link inside a paragraph opens the paragraph editor; a Cmd click follows the link`, `Enter or Space on a link inside a paragraph opens the paragraph editor; Cmd+Enter does not`: link rows of the link scenario).
- Method: test/page/linkEditModeClick.test.ts (link scenario: click, Enter and Space on a link inside a paragraph and on a link-only paragraph open the paragraph editor and post no previewLink; Cmd and Ctrl click, Cmd and Ctrl+Enter and a middle click follow; a click on the title, body and footer of a `:link:` card opens lines 14, 19 and 21; a click on a link while another editor is open saves it and follows nothing; reading mode follows; the properties table link keeps its field editor; tooltip scenario: the second line in edit mode on a non-Apple and an Apple platform, its removal in reading mode, after a target discovery and a content render, none on a properties table link).
- Method: test/integration/realInput/linkEditMode.ts (scenarioLinkClickEditsInEditMode, real window: a real click on the link of a link-only paragraph and on the footer of a `:link:` card opens a block editor and leaves the preview and the editors on the edited file; " F" typed after the footer click goes to that editor and the card target is neither opened nor dirty; a Cmd/Ctrl+click on the same link navigates to its target).
- Method: visual scenarios block-editing/v27 to v34 in test/visual/linkEditModeScenarios.ts (cream and dark, 900 px: a click on the link-only paragraph and on the footer of a linked card opens the editor; the pointer over the link-only paragraph and over the body of a linked card outlines that block only). The native tooltip is not captured.
- Method: test/page/blockReq.requirements.test.ts (`Enter or Space on a focused block opens its editor with the caret at the end`: Enter scenario; `a click on a comment chip or an open thread opens no editor, a block inside a link opens its own`: chip and open thread rows and the linked block row of the link scenario; `a click on a cell of the properties table never opens a block editor`: properties table rows; `a click on Diagram source in edit mode opens the editor of the figure and not the disclosure`: Diagram source row and reading mode row). The insert point part of the Enter and Space row is asserted by `T28: document-level click and keydown on an insertion point never open a block editor` in test/page/runtimeBlockMoves.test.ts.
- Method: test/integration/realInput/renderPatching.ts (scenarioImageEditing, screenshot block-editing/r04, clicks plain, linked and raw img blocks: paragraph or image scenario; scenarioSaveKeepsBlockInPlace: fenced code row). The Cmd and Ctrl click of a linked image is covered by the link rows of test/page/linkEditModeClick.test.ts.
- Method: test/session/alertBlockEditOpen.test.ts (the alert and admonition rows and the nominal scenario, on Markdown rendered and mapped like the preview, with the range `editingElementFor` gives, answered by the real `PreviewManager`: a click on a paragraph or an item of the body of an alert, of an alert indented in a list item or of a MyST admonition in a backtick or a colon fence gives its own lines; a click on the title or the element itself gives the whole alert or directive; nested admonitions; the context-tag panel) and visual scenarios in test/visual/alertEditingScenarios.ts: gfm/v14-alert-body-opens-pointed-paragraph-dark-900 and block-editing/v57-admonition-body-opens-pointed-paragraph-dark-900 (real click on a body paragraph), gfm/v15-alert-title-opens-whole-alert-dark-900 and block-editing/v58-admonition-title-opens-whole-directive-dark-900 (real click on the title).
- Method: test/session/boxBlockSourceLines.test.ts, on Markdown rendered and mapped like the preview, answered by the real `PreviewManager` (the directive row: click and Enter on every directive of an admonition and of an alert, `{list-table}`, `{csv-table}`, a LaTeX environment, nested admonitions and a directive in a list item, a callout; the opening-line row: one-line bodies of `{warning}`, `{note}` and `{seealso}`, whose erased editor removes both fence lines, a `{table}` caption and a card title; the version admonition row), and, for an admonition left open at the end of the file, click and Enter on the inner directive or code block that ends it and on a shorter or an indented admonition there (the directive row).
- Method: visual scenarios in test/visual/scenarioDefinitions2.ts, block-editing/v04 (paragraph click), block-editing/v05 (admonition title click and fenced block) and block-editing/v12 (edit-list-narrow: list item row, the editor holds the clicked item and its continuation line; and, in Chromium, a click on the second item of a four-item ordered list leaves the markers 1., 3. and 4. on the page, read from the accessibility tree by `check_ordered_item_keeps_numbers` in test/visual/capture_list_numbers.py, then 1. to 4. after Escape: the numbering of the item row). Lists that mix files are untested.
- Method: test/session/listItemEditOpen.test.ts on Markdown rendered and mapped like the preview (`a click on the first line, a paragraph or the code block of a list item opens that item only`, `a wrapped item of a tight list opens on all its lines`, `an item opens on all its lines whatever its content: an inline code span, an HTML block, a comment, an empty first line`, `a click in a nested list opens the nested item; the rest of the outer item opens the outer item`, `the list itself, outside its items, opens the whole list`: the list rows). test/page/blockReq.requirements.test.ts (`a list item is outlined and opened on its own lines, the list itself outlines and opens the whole list`, `a click on the list itself, outside its items, opens the whole list`: previewEditOpen in the fake DOM of the page runtime). test/page/runtimeContentPatch.test.ts (`a click on the first item of a list while another editor holds changes opens that item, not the list, once the save is rendered`: reopen row).
- Method: test/core/render/includeMapping.test.ts and test/integration/previewEditing.test.ts (an included block maps to the directive lines and carries data-sphinx-preview-included; a changed include target renders only after the edit: include row).
- Method: the previewEditSource scenarios (nominal answer, error and malformed rows) are not asserted by a dedicated test; the page receives the answer in the unit tests of test/page/runtimeBlockEditor.test.ts and in the integration flow of test/integration/previewEditing.test.ts.
- Method: test/core/preview/previewStyles.test.ts (the hr rule has 12px padding, content-box and a margin reduced by the padding); visual scenarios palette-slash/v23-edit-bar-tooltip-rule-cream-900 and v24-edit-bar-tooltip-rule-dark-900 (element at 10 px above and below the line is the rule, box 25 px tall)
- Criteria: One previewEditOpen per click, carrying the mapped line range of the clicked block; the keydown listener opens the editor only for a mapped block outside the listed controls; the line range of a list item (sourceRangeForItem in src/page/features/mappedBlocks.ts) is the span of the item of the nearest list and of the mapped elements inside it that belong to the same source file and document; the pending reopen after a save matches the line and the tag of the clicked block, the line alone as a fallback; an edited item of an ordered list is collapsed and invisible but keeps display list-item, so it still counts in the list's numbering (display none would drop it, and Chromium ignores a list-item counter-increment on the editor); the line range of the list itself (sourceRangeForList) is the span of its mapped elements; an admonition is a mapped element carrying data-okf-github-alert, or an aside or details element of class admonition other than a context-tag panel (class myst-context-admonition, SwRS-MDOKFSTUDIO-MYST-013), of the same source file and document; editingElementFor opens the nearest admonition around the target on its own range only when the target is that element or lies in its title (.admonition-title, a direct child), and any other block of its body on its own lines, the list lookup staying inside that admonition; inside an admonition, a callout or a dropdown the renderer (mapBoxSourceLines in src/core/render/mystBoxLines.ts) maps a block only on lines that hold no fence line of a directive around it, and gives what a directive builds without a position the lines of that directive; the frame is never inside the pre and the rendered text of the fence is the raw source; the capture listener of bindEditModeCaptureClicks acts only for an IMG inside an anchor outside the properties table and the editors; linkActivationEdits (src/page/features/linkEditing.ts) is true only in edit mode, without Cmd or Ctrl, for a click, Enter or Space (never an auxclick) whose target is inside a link and inside a mapped block, outside the properties table, an open editor, a comment body, a chip, a label anchor and an okf-link value; while it is true the link navigation posts nothing and the page input opens the editor; the click handler returns before openMappedEditor for the excluded targets and openMappedEditor returns at once when the event target is inside [data-okf-properties]; the editor range equals the directive lines and the included file is never opened; the click target of Diagram source resolves to the figure through the mapped-block selector and event.preventDefault is called in edit mode.
- Criteria: The rule box is at least 24 px tall and document.elementFromPoint 10 px above and below its line returns the rule.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-003](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-003.md): A writer edits the raw Markdown of a block in a framed editor
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-001](../trust-security/SwRS-MDOKFSTUDIO-TRUST-001.md): A document is editable whatever the trust; only its reads are restricted
  - [SwRS-MDOKFSTUDIO-BLOCK-041](SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-TRUST-059](../trust-security/SwRS-MDOKFSTUDIO-TRUST-059.md): The page accepts only registered host messages addressed to its render
- Supersedes:
  - [SwRS-MDOKFSTUDIO-BLOCK-002](SwRS-MDOKFSTUDIO-BLOCK-002.md): A horizontal rule has a tall invisible hit area
<!-- okf:links:end -->
