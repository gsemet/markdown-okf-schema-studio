---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-025
uuid: 588bd515-8e56-4c1a-a65e-3efc0dda9533
title: Escape cancels the cell edit, except during a composition
description: When the writer presses Escape in a cell editor outside an IME
  composition and no autosave has reached the document, the extension SHALL
  close the editor, drop the typed text and send no final save, and, during an
  input-method composition, leave the editor open and post nothing.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-001
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-053
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/tableCellEditor.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/page/runtimeTableCellEditor.test.ts
default_owner_email: gaetan@xeberon.net
---

## Escape cancels the cell edit, except during a composition

### Normative behavior

When the writer presses Escape in a cell editor outside an IME composition and no autosave has reached the document, the extension SHALL close the editor, drop the typed text and send no final save, and, during an input-method composition, leave the editor open and post nothing.

### Scenario (nominal): Escape after typing
- GIVEN a cell edited and not yet autosaved
- WHEN the writer presses Escape
- THEN the editor closes, the rendered cell is as before and no final previewEditSave is ever posted

### Scenario (boundary): Blur after Escape
- GIVEN the editor closed by Escape
- WHEN the focus then moves elsewhere
- THEN nothing is sent

### Scenario (nominal): Escape with the focus outside the cell editor
- GIVEN a cell editor open and the focus on another element of the page
- WHEN Escape is pressed while the key target and the active element are outside the cell editor
- THEN the edit is cancelled as if Escape had been pressed in the text box

### Scenario (boundary): Key inside the editor
- GIVEN Escape pressed in the cell text box
- WHEN the document-level handler sees the key
- THEN it does nothing, the text box handler having cancelled once

### Scenario (refusal): Escape during a composition
- GIVEN an IME composition in progress in the cell text box
- WHEN Escape is pressed (event marked as composing)
- THEN the editor stays open and nothing is posted

### Scenario (boundary): Escape after the composition
- GIVEN the composition ended
- WHEN Escape is pressed
- THEN the edit is cancelled

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-053: the block editor equivalent of the cancel; the cell has its own listener.

### Verification notes
- Method: test/page/runtimeTableCellEditor.test.ts ("Escape in a changed table cell cancels and never saves a final table" for Escape after typing and the blur after it; "Escape cancels a table cell even when focus is outside the cell editor" for the focus outside and the key inside, with the document-level handler in bindKeys of src/page/features/tableCellEditor.ts; "Escape during IME composition neither cancels nor saves a table cell" for the composition scenarios).
- Method: test/integration/realInput/textEditing.ts, markers in test/integration/realInput/markers.ts (real-window scenario scenarioEscapeCancels, id table-editing/r04-escape-cancels-cell: Escape after typing).
- Method: visual scenarios table-editing/v02 to v05 (Escape cancelling).
- Criteria: No message with final true after Escape and an unchanged source in the real-window scenario. Exactly one cancel per key press in the two focus scenarios. No message and an open editor in the composition scenario.
