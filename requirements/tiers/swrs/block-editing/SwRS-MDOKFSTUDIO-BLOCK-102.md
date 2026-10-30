---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-102
uuid: 5e67d7f3-6f2b-4dd5-8c9e-198247ce0ff7
title: An empty body offers one Start writing button
description: While edit mode is on and the body of a rendered document has no
  block, the page SHALL show one Start writing button, after the properties
  table when there is one, in place of the insert points, and open the
  first-block editor from it on a click or on Enter.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-011
- StRS-MDOKFSTUDIO-BLOCK-003
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockEditor.ts
- src/page/features/insertPoints.ts
tested_in_files:
- test/page/runtimeBlockEditor.test.ts
- test/page/runtimeBlockMoves.test.ts
default_owner_email: gaetan@xeberon.net
---

## An empty body offers one Start writing button

### Normative behavior

While edit mode is on and the body of a rendered document has no block, the page SHALL show one Start writing button, after the properties table when there is one, in place of the insert points, and open the first-block editor from it on a click or on Enter.

### Scenario (nominal): Empty body shows one Start writing button

| Input | Outcome |
| --- | --- |
| An empty document in edit mode | One visible Start writing button exists for line 0 and no insert point |
| A document with only frontmatter | The Start writing button follows the properties table |

- GIVEN a rendered document whose body has no block, in edit mode
- WHEN the page builds its bars
- THEN the button text is Start writing and its bar has the class sphinx-preview-insert-point--start

### Scenario (refusal): No Start writing button on a failed or pending render

- GIVEN an error page with no body blocks in edit mode, or a pending render
- WHEN the page builds its bars
- THEN no Start writing button exists; a successful (or recovered) render of an empty document has the button

### Scenario (nominal): A click opens the editor of the first block

- GIVEN an empty document in edit mode
- WHEN the writer clicks Start writing
- THEN previewEditOpen carries insertAfterLine 0 and line 1, and the button is replaced by the focused editor

### Scenario (nominal): Enter opens the same editor

- GIVEN an empty document in edit mode with no open editor
- WHEN the writer presses Enter
- THEN the same Start writing editor opens focused and replaces the button, with no other click

### Scenario (refusal): Enter does nothing where it would not start a document

| Input | Outcome |
| --- | --- |
| Shift+Enter, Ctrl+Enter, Alt+Enter or Cmd+Enter on an empty document in edit mode | No editor opens |
| Enter on a document with a body | No editor opens |
| Enter in reading mode | No editor opens |
| Enter inside a text box, select, button or link | No editor opens |

### Scenario (nominal): The button is hidden while its editor is open

- GIVEN an empty document
- WHEN the Start writing editor opens
- THEN the button is hidden behind the frame (the bar carries data-sphinx-preview-editing)
- WHEN the writer presses Ctrl or Cmd+Enter
- THEN the block is saved
- WHEN the writer presses Escape instead
- THEN the editor closes and the button is visible again

### Scenario (boundary): The first-block editor is marked

| Input | Outcome |
| --- | --- |
| The editor of the first block of a document without frontmatter, edit mode on | The frame carries sphinx-preview-block-editor--first, whose margin is specified by SwRS-MDOKFSTUDIO-LAYOUT-007 and SwRS-MDOKFSTUDIO-LAYOUT-011 |
| The Start writing editor of a document without a properties table | The frame carries sphinx-preview-block-editor--first |
| A later block | No first-block mark |
| An insertion editor below another block | No first-block mark |
| The first body block below a properties table | No first-block mark |
| Start writing below a properties table | No first-block mark |

### Related requirements

- SwRS-MDOKFSTUDIO-LAYOUT-007: the gap above the first element, including the Start writing button.
- SwRS-MDOKFSTUDIO-LAYOUT-011: the Start writing button is pushed only under the floating toolbar.
- SwRS-MDOKFSTUDIO-BLOCK-087: the insert points of a document that has body blocks.
- SwRS-MDOKFSTUDIO-BLOCK-041: one edit at a time, which keeps Enter from opening a second editor.

### Verification notes

- Method: test/page/runtimeBlockMoves.test.ts: `T28: an empty body shows a single Start writing point after line 0` and `T28: a frontmatter-only document gets one Start writing point` (scenario 1), `T28: a failed render offers no Start writing point` (scenario 2), `T28: Start writing opens at line 1 with insertAfterLine 0` (scenario 3).
- Method: test/page/runtimeBlockEditor.test.ts: `top spacing: the editor opened from Start writing carries the first-block class` (scenarios 3 and 7), `empty document: Enter in edit mode opens the new-block editor like Start writing` (scenario 4), `empty document: Enter with a modifier, in a field, outside edit mode or on a filled document does nothing` (scenario 5), `empty document: Cmd/Ctrl+Enter saves the new block and Escape cancels back to Start writing` (scenario 6), and the six `top spacing: ...` cases (scenario 7).
- Method: visual scenario block-editing/v11 (scenario 4; the lock asks for at least 20 px below the top, the real gap is SwRS-MDOKFSTUDIO-LAYOUT-007, and SwRS-MDOKFSTUDIO-LAYOUT-011 pushes the button only under the toolbar).
- Criteria: The button needs a render status of success or recovery. The open message names line 1 and insertAfterLine 0. The keydown listener opens an editor only for an unmodified Enter outside controls. The first-block class is present exactly in the cases of scenario 7.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-011](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-011.md): A writer adds blocks and starts an empty document from the preview
  - [StRS-MDOKFSTUDIO-BLOCK-003](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-003.md): A writer edits the raw Markdown of a block in a framed editor
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
<!-- okf:links:end -->
