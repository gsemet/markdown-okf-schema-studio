---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-001
uuid: fcdc4b22-d5c6-4889-9d41-2f67b6817b41
title: Field editor opens in edit mode only
description: When a writer clicks, or presses Enter or Space on, a name or value
  cell of the properties table in edit mode, the extension SHALL open a field
  editor inside that cell.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Field editor opens in edit mode only

### Normative behavior

When a writer clicks, or presses Enter or Space on, a name or value cell of the properties table in edit mode, the extension SHALL open a field editor inside that cell.

### Scenario: Nominal

- GIVEN edit mode on and a properties table whose title field is a text field
- WHEN the writer clicks the value cell, or focuses it and presses Enter or Space
- THEN an editor labelled "Frontmatter title" opens inside that cell

### Scenario: Boundary or refusal

- GIVEN edit mode off (reading mode)
- WHEN the writer clicks a name or value cell of the table
- THEN no editor opens and the table is unchanged; in a read-only preview the cells carry no edit attribute at all

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: The editor exists in edit mode only; the cells have tabindex 0 in edit mode and none outside it.
