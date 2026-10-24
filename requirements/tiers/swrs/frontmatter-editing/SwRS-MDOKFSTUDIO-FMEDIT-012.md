---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-012
uuid: 7b3c2d6c-5452-4759-bbdf-918e07bb680a
title: List items reorder by keyboard and drag
description: When a writer presses ArrowUp or ArrowDown on the handle of a list
  item, or drags the handle over another item, the extension SHALL move the item
  and show the insertion position.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## List items reorder by keyboard and drag

### Normative behavior

When a writer presses ArrowUp or ArrowDown on the handle of a list item, or drags the handle over another item, the extension SHALL move the item and show the insertion position.

### Scenario: Nominal

- GIVEN a list editor with items a, b and c
- WHEN the writer presses ArrowDown on the handle of a
- THEN the order becomes b, a, c and the labels are renumbered

### Scenario: Boundary or refusal

- GIVEN a drag of the handle of a over c
- WHEN the item is dropped
- THEN an insertion line shows during the drag, the order changes, and no save is triggered by the focus change of the drag

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: Tests frontmatter list editor supports add, reorder, remove, and direct array saves; list dragging shows the insertion boundary.
