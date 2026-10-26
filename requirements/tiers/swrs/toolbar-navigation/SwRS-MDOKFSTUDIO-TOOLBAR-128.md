---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-128
uuid: 479178a2-7e24-431a-9c63-032816a5374d
title: "The block at the editor cursor is outlined when the setting is on"
description: "When the setting markdownOkfSchemaStudio.preview.markEditorSelection
  is true (off by default), the extension SHALL outline in the preview the one block
  that contains the cursor line of the text editor, which the host sends after each
  render and when the editor scrolls, without moving the preview unless it follows
  the editor."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-013
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/configuration/settingsRegistry.ts
- src/core/preview/previewStyles.ts
- src/page/features/scrollCore.ts
- src/page/pageSettings.ts
- src/session/features/scrollSync.ts
tested_in_files:
- test/core/configuration/settingsRegistry.test.ts
- test/core/preview/toolbarReq.requirements.test.ts
- test/page/pageSettings.test.ts
- test/page/runtimeScroll.test.ts
- test/session/toolbarReq.requirements.test.ts
- test/visual/scenarioDefinitions1.ts
- test/visual/scenarioDefinitions2.ts
---

## The block at the editor cursor is outlined when the setting is on

### Normative behavior

When the setting markdownOkfSchemaStudio.preview.markEditorSelection is true (off by default), the extension SHALL outline in the preview the one block that contains the cursor line of the text editor (the innermost one when blocks nest, the block with the nearest edge when the line lies between blocks), which the host sends after each render and when the editor scrolls, without moving the preview unless it follows the editor.

### Scenario (boundary): Values of the setting

| Input | Outcome |
| --- | --- |
| no value set, page starts | no block is marked |
| true | the mark is on |
| the number 1, the string true or the string yes | the mark stays off, because only the boolean true turns it on |

### Scenario (nominal): The host sends the cursor line after a render

- GIVEN the setting on, a text editor that shows the document and the cursor on line 12
- WHEN a render is shown
- THEN the page receives a sourceScroll with selectionLine 12 and no scroll line, so it does not scroll, and exactly the block that starts at line 12 is marked with data-sphinx-preview-current and aria-current location, the mark of the previous block being removed

### Scenario (refusal): Setting off or no editor

| Input | Outcome |
| --- | --- |
| the setting off, or no visible editor for the file, a render is shown | the host posts nothing |
| the setting off, a sourceScroll with a selection line reaches the page | no block is marked and a previous mark is removed |

### Scenario (nominal): The host sends the cursor line when the editor scrolls

- GIVEN the mark on and following off
- WHEN the editor scrolls
- THEN the page receives a sourceScroll with the first visible line and the selection line, the selection line being the editor selection line plus 1

### Scenario (refusal): A cursor move alone

- GIVEN the cursor moved without a scroll
- WHEN the editor selection changes
- THEN no message is posted, because no selection listener exists

### Scenario (boundary): Marking and scrolling

| Input | Outcome |
| --- | --- |
| following off, the mark on, a sourceScroll with line 50 and selection line 50 | the second block is marked and the scroll position stays 0 |
| following on, a sourceScroll with a line | the page scrolls to the line and also marks the block |
| a sourceScroll with a line and no selection line (for example after Back) | the block that contains the line is marked |
| a selection line inside a long block that ends before the next block starts | the long block is marked, not the next one, even when the next block starts closer to the line |
| a selection line on a blank line between two blocks | the block with the nearest edge is marked |

### Scenario (nominal): The outline

| Input | Outcome |
| --- | --- |
| a marked block in a light 900 px pane | outline style solid, width 2 px, offset 2px, in the find-match colour |
| the setting turned off and a message arrives | the block has no outline |
| forced-colors mode | the outline is 2 px solid Highlight (the system highlight colour) |
| the normal mode | the outline uses the find-match colour |

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-120: the anchor mode decides whether the preview follows the editor

### Verification notes

- Method: test/core/configuration/settingsRegistry.test.ts and test/page/pageSettings.test.ts (values of the setting: the boot flag defaults to off and a changed markEditorSelection changes the runtime context key of the startup settings, unit test T34, so the page is loaded again; the full-page assignment itself is untested)
- Method: test/session/toolbarReq.requirements.test.ts (cursor line after a render, setting off or no editor, editor scroll, cursor move alone: the host sends the editor's cursor line and no scroll line; the host sends the first visible line and the cursor line when the editor scrolls)
- Method: test/page/runtimeScroll.test.ts (marking and scrolling, following off: marks editor selection without moving the preview when following is disabled; a selection line inside a long block marks that block; a line between two blocks takes the nearest edge; two nested blocks that both contain the line mark the innermost; the other rows of that scenario and the page-side setting-off row are untested)
- Method: visual scenario in test/visual/scenarioDefinitions2.ts, toolbar-navigation/v31-mark-editor-selection-light-900 (exactly one block marked, the one at line 12; outline solid, 2 px)
- Method: visual scenarios in test/visual/scenarioDefinitions2.ts, toolbar-navigation/v37-mark-containing-block-light-900 and v38-mark-containing-block-dark-900 (a selection line inside a long code block marks that block and not the paragraph below it)
- Method: test/core/preview/toolbarReq.requirements.test.ts (forced-colors outline: in forced-colors mode the marked block is outlined in the highlight colour; it checks the stylesheet text, not a rendered forced-colors page)
- Criteria: bootFlag(false): value === true; selectionLine = editor selection line + 1; one element carries aria-current location; scrollY unchanged when scrollPreviewWithEditor is false; outline: 2px solid with offset 2px, and 2px solid Highlight in @media (forced-colors: active).
