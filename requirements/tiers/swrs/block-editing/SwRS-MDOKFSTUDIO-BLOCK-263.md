---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-263
uuid: b0e87564-37c1-4cdd-9a4b-db250a0c6065
title: A block editor left without a change, or whose final save writes nothing,
  always closes
description: When a writer leaves a block editor by Done, Cmd/Ctrl+Enter, a
  click on another block or an arrow past the edge of the text box, the page
  SHALL compare and post the text of the text box with the line endings of the
  source block, so that text that differs from the source only by the LF the
  text box returns is the source again and posts no save, and the host SHALL
  answer every final save that ends with nothing to render by a
  previewEditSource message with done set, to which the page answers by closing
  the editor.
project: MDOKFSTUDIO
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-006
scenarios:
- id: S1
  title: A text equal to the source but for its line endings is the source
- id: S2
  title: The host answers every final save
- id: S3
  title: Mixed line endings
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/edits/lineEndings.ts
- src/page/features/blockEditor.ts
- src/page/features/blockSourceEditor.ts
- src/session/features/blockEdits.ts
tested_in_files:
- test/core/edits/matchLineEndings.test.ts
- test/host/editLineEndings.test.ts
- test/integration/realInput/lineEndingLeave.ts
- test/page/runtimeBlockEditorLineEndings.test.ts
- test/session/blockReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## A block editor left without a change, or whose final save writes nothing, always closes

### Normative behavior

When a writer leaves a block editor by Done, Cmd/Ctrl+Enter, a click on another block or an arrow past the edge of the text box, the page SHALL compare and post the text of the text box with the line endings of the source block, so that text that differs from the source only by the LF the text box returns is the source again and posts no save, and the host SHALL answer every final save that ends with nothing to render by a previewEditSource message with done set, to which the page answers by closing the editor.

### Scenario S1 (nominal): A text equal to the source but for its line endings is the source

| Input | Outcome |
| --- | --- |
| A block of a CR LF file (a hard-wrapped paragraph, a list item with nested items, the last item of a list), left by Done, Cmd/Ctrl+Enter, a click on another block or an arrow past the edge with no change | No previewEditSave is posted, the editor closes, "Saving Markdown…" is never shown |
| A letter typed then deleted in the same editor | No autosave and no final save: the text is the source again |
| The move chord (Cmd/Ctrl+Alt+Up or Down) on the same unchanged editor | The editor closes and the move is requested at once, with no save |
| A real change in the same editor | The text posted by the autosave and by the final save has the line endings of the source block |
| The same blocks in an LF file | Unchanged: LF |

### Scenario S2 (nominal): The host answers every final save

| Input | Outcome |
| --- | --- |
| A final save whose text, once given the line endings of the block, equals the text last written (nothing to write) | The document is not written and the host posts previewEditSource with done true for that edit id |
| A final save the host writes and renders | The previewContentPatch is the answer; no done message |
| The page receives previewEditSource with done true for its open editor, which waits for a save | The editor closes and a pending move to another block goes on, as after a patch |
| The same message for another edit id, or for an editor that is not saving | Ignored |
| A cancel | No answer: the page closed the editor when it posted it |

### Scenario S3 (boundary): Mixed line endings

| Input | Outcome |
| --- | --- |
| A block with mixed line endings, left unchanged | Same as above: nothing is posted, nothing is written |
| The same block with one line changed | The lines left alone keep their line endings, the changed line takes the ending of the line it replaces |

### Verification notes

- Method: page runtime tests in test/page/runtimeBlockEditorLineEndings.test.ts (the harness text area returns LF for every break, as a browser does); host tests in test/host/editLineEndings.test.ts (a final save with the LF text on a CR LF document, a nested list item, a list's last item, a paragraph, an LF document, a mixed document, a real change); unit tests of `matchLineEndings` in test/core/edits/matchLineEndings.test.ts (every block of the four line-ending fixtures).
- Method: real window scenario test/integration/realInput/lineEndingLeave.ts: a CR LF and an LF file, three blocks, five ways of leaving, buffer and bytes on disk unchanged; a real change in a CR LF file keeps CR LF.
- Boundary: `done` is sent whenever a final save ends with no render to follow (nothing written, the revision already rendered, or the source not available), also after an autosave wrote text; an edit followed by a render is answered by the patch. Tests: test/host/editLineEndings.test.ts (an autosave then a final save with the source gone; a final save with nothing to write and the source gone).
- Criteria: no editor stays on "Saving Markdown…" after a final save; every byte outside an edit is unchanged.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-006](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-006.md): Typed text is saved, survives updates and is never lost on leaving
<!-- okf:links:end -->
