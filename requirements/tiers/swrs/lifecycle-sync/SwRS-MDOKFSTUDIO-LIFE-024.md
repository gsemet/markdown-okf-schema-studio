---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-024
uuid: 579a6dbb-cfe2-4446-9def-7de92c119a8b
title: The panel title names the document and whether it follows
description: When a preview panel is created, restored, switched to another
  document or finishes a render, the extension SHALL title the side preview
  Studio · {file name}, a fixed preview with the bare file name, and a panel
  with no known document Studio, using the title of the document the panel
  shows.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-003
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/rendering.ts
- src/session/previewManager.ts
tested_in_files:
- test/integration/lifecycle.test.ts
- test/integration/serializer.test.ts
---

## The panel title names the document and whether it follows

### Normative behavior

When a preview panel is created, restored, switched to another document or finishes a render, the extension SHALL title the side preview Studio · {file name}, a fixed preview with the bare file name, and a panel with no known document Studio, using the title of the document the panel shows.

### Scenario (nominal): Side preview

- GIVEN the side preview following the editor on notes.md
- WHEN the panel is created
- THEN its title is Studio · notes.md (integration test test/integration/lifecycle.test.ts)

### Scenario (boundary): Fixed preview and panel without a document

| Input | Outcome |
| --- | --- |
| an Open With tab on notes.md, created | title notes.md, without the Studio prefix |
| an older restored panel on notes.md | title notes.md, without the Studio prefix (integration test test/integration/serializer.test.ts, older panel does not match /^Studio/) |
| a panel with no document | title Studio |

### Scenario (nominal): Switch

- GIVEN a side preview titled Studio · preview.md
- WHEN the reader makes preview-other.md the active editor
- THEN the title becomes Studio · preview-other.md

### Scenario (nominal): Render finished

- GIVEN a preview whose title was set before its first render
- WHEN a render of the shown document finishes
- THEN the title is set again from the rendered file's path, with the same role prefix

### Verification notes

- Method: test/integration/lifecycle.test.ts (Side preview: title Studio · preview.md; Render finished: asserts the title after the first render; the title after a switch (Switch) is untested).
- Method: test/integration/serializer.test.ts (Fixed preview and panel without a document: the older restored panel is not titled Studio; the other rows are by reading previewTitle).
- Criteria: panel.title equals the expected string for each role, and equals previewTitle for the shown path after each switch and render.
