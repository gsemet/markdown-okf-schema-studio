---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-253
uuid: ab69ace6-7229-48dc-afe4-b6c6e43223b4
title: Start writing is the keyboard selection of an empty document
description: While edit mode is on and the body of the document is empty, the
  page SHALL make the Start writing button the keyboard selection, open the
  new-block editor on Enter or Arrow Down exactly as a click on it does, and
  show the hint "Enter to create a new block" under it.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-011
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/insertPoints.ts
tested_in_files:
- test/page/runtimeEmptyDocumentStart.test.ts
- test/visual/capture_start_hint.py
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
---

## Start writing is the keyboard selection of an empty document

### Normative behavior

While edit mode is on and the body of the document is empty, the page SHALL make the Start writing button the keyboard selection, open the new-block editor on Enter or Arrow Down exactly as a click on it does, and show the hint "Enter to create a new block" under it.

### Scenario (nominal): The Start writing button is the keyboard selection and Enter opens the editor

- GIVEN a successfully rendered document with an empty body (or only frontmatter) in edit mode, and no editor open
- WHEN the preview is built
- THEN the Start writing button carries `data-sphinx-preview-start-selected="true"` and the selection ring of a selected block, and a hint line "Enter to create a new block" sits under it in the typography of the block editor's hint line (0.75em, description foreground)
- WHEN the writer presses Enter, with no modifier, while the focus is on the page (the document body, the preview content, the edit-mode toggle or the Start writing button itself)
- THEN the new-block editor opens as after a click on the button: `previewEditOpen` carries line 1, endLine 1 and insertAfterLine 0, and the key is consumed

### Scenario (nominal): Arrow Down opens the editor, Arrow Up keeps the selection

- GIVEN the same document and the same focus targets
- WHEN the writer presses Arrow Down
- THEN the new-block editor opens exactly as for Enter
- WHEN the writer presses Arrow Up
- THEN nothing opens and the Start writing button stays the selection

### Scenario (refusal): The keys do nothing elsewhere

| Input | Outcome |
| --- | --- |
| Shift, Alt, Ctrl or Cmd held, or an IME composition | Nothing opens |
| The key goes to a text field, a select, a link, or a toolbar button other than the edit-mode toggle | Nothing opens |
| Reading mode, or a failed render | Nothing opens, and the button and its hint are not shown |
| A document with body blocks | Nothing opens: the "+" bars carry no hint and no selection marker |
| A block editor or a field editor is open | Nothing opens (SwRS-MDOKFSTUDIO-BLOCK-041) |

### Verification notes

- Method: test/page/runtimeEmptyDocumentStart.test.ts (Enter and Arrow Down with each focus target open the editor with insertAfterLine 0; Arrow Up does nothing; the marker and the hint exist on the Start writing point only; the refusals above) and test/page/runtimeBlockEditor.test.ts (Enter on the preview content, modifiers, fields, reading mode, failed render, filled document).
- Method: test/visual/capture_start_hint.py, scenarios layout-width/v86 and v87 (empty-start-writing-hint, light and dark) (the hint line is visible under the button, in light and dark, and keeps the button 20 px below the top).
- Criteria: the keys act only on the page target or on the Start writing button, the message equals the one of a click, and the hint text equals "Enter to create a new block".

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-011](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-011.md): A writer adds blocks and starts an empty document from the preview
<!-- okf:links:end -->
