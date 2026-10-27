---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-079
uuid: d9d6a93a-8479-43b0-825d-00a9d1277070
title: Arrow keys at the edges open the previous or next block
description: When a writer presses an arrow key with the caret at an edge of the
  text box of an open block editor, the page SHALL leave the editor, saving a
  changed text, and open the editor of the previous or next body block with the
  caret at its end or at its start, and otherwise leave the key to the text box.
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-008
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockEditor.ts
- src/page/features/textControls.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/page/blockReq.requirements.test.ts
- test/page/fmtableReqFrontmatter.requirements.test.ts
- test/page/runtimeBlockEditor.test.ts
---

## Arrow keys at the edges open the previous or next block

### Normative behavior

When a writer presses an arrow key with the caret at an edge of the text box of an open block editor, the page SHALL leave the editor, saving a changed text, and open the editor of the previous or next body block with the caret at its end or at its start, and otherwise leave the key to the text box.

### Scenario (nominal): ArrowUp from the first visual line
- GIVEN an editor on the second of three paragraphs with the caret on its first visual line
- WHEN the writer presses ArrowUp
- THEN when the text changed the final save is posted first, and the editor of the first paragraph opens with the caret at its end once the page is patched (at once when nothing changed)

### Scenario (nominal): ArrowDown from the last visual line
- GIVEN an editor on the first of three paragraphs with the caret on its last visual line
- WHEN the writer presses ArrowDown
- THEN when the text changed the final save is posted first, and the editor of the second paragraph opens with the caret at its start once the page is patched (at once when nothing changed)

### Scenario (boundary): Caret position decides
| Input | Outcome |
| --- | --- |
| A long paragraph that wraps over four visual lines, the caret on the third, ArrowUp | The caret moves up one visual line and the editor stays |
| The caret on a line that is not the last visual line, ArrowDown | The caret moves down natively |
| The caret at offset 0, ArrowLeft | The editor of the previous block opens with the caret at its end |
| The caret at the end of the text, ArrowRight | The editor of the next block opens with the caret at its start |

### Scenario (refusal): Modifiers or a selection
| Input | Outcome |
| --- | --- |
| The caret on the first visual line, Shift+ArrowUp | The selection extends and the editor stays open |
| An arrow key with Shift, Ctrl, Cmd or Alt held | The page does not leave the text box |
| A selected word, ArrowLeft | The text box collapses the selection natively |

### Scenario (boundary): First block, last block and the properties table
| Input | Outcome |
| --- | --- |
| The editor of the first body block with the caret on its first visual line, ArrowUp | The editor stays open |
| The editor of the last body block with the caret on its last line, ArrowDown | The editor stays open |
| The editor of the first body block under a properties table (a document with frontmatter), ArrowUp on its first line | The properties table is stepped over, no editor opens on it and the editor stays open |
| The editor of a block between two body blocks, ArrowUp | The previous body block opens |

### Scenario (nominal): The block to open next is remembered in the webview state
- GIVEN an arrow navigation whose save is in flight
- WHEN the page state is read
- THEN pendingBlockNavigation holds the block id, source line and caret position (and the table cell if any) until that editor is opened

### Scenario (boundary): Page replaced before the save is rendered
- GIVEN the page replaced before the save is rendered
- WHEN the new page starts and receives its content
- THEN the editor of the remembered block opens and the entry is cleared

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-058: the final save that the navigation posts is a host source edit
- SwRS-MDOKFSTUDIO-BLOCK-069: the other keys of the text box

### Verification notes
- Method: test/page/runtimeBlockEditor.test.ts (ArrowUp, ArrowDown, wrapped line, ArrowLeft and ArrowRight, middle line, first body block under a properties table, remembered navigation); unit tests `arrow boundaries transfer block editing in every direction`, `ArrowUp/ArrowDown inside a wrapped logical line move the caret instead of leaving the block`, `ArrowUp/ArrowDown leave the block only on the first/last visual line` and `ArrowUp from the first body block under a properties table keeps the editor open` replace the layout measure by the test-only seam window.okfCaretLineProbe
- Method: test/integration/realInput/markers.ts (real-input scenario scenarioArrowNavigation, screenshot block-editing/r03); visual scenario block-editing/v03
- Method: test/page/blockReq.requirements.test.ts (modifiers or a selection stay in the text box; navigation stops at the first and at the last block)
- Method: test/page/fmtableReqFrontmatter.requirements.test.ts (ArrowUp at the start of the first body block does not step onto the properties table)
- Criteria: boundaryNavigation answers step -1 with caret position end only on the first visual line and step 1 with caret position start only on the last visual line, and returns undefined when a modifier is held or the selection is not collapsed; adjacentMappedBlock returns undefined at the ends and ignores elements marked data-okf-properties; state.pendingBlockNavigation and the saved webview state hold the same entry until resumePendingBlockNavigation clears it. The remembering is exercised by the arrow unit tests; the survival of a real reload is untested.
