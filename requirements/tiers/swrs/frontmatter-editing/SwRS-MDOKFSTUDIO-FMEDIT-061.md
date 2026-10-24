---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-061
uuid: 102fd29c-b166-44e4-908e-7d3f990b2ba3
title: A content patch closes the field editor
description: When a content patch of the page arrives while a field editor is
  open, the extension SHALL close the editor and drop the waiting properties
  update.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-011
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A content patch closes the field editor

### Normative behavior

When a content patch of the page arrives while a field editor is open, the extension SHALL close the editor and drop the waiting properties update.

Known issue: a content patch closes an open field editor and loses its typed text.

### Scenario: Nominal

- GIVEN a field editor with typed text and a waiting properties update
- WHEN a previewContentPatch arrives
- THEN the editor closes without a save and the waiting update is dropped

### Scenario: Boundary or refusal

- GIVEN no editor open
- WHEN a content patch arrives
- THEN the patch is applied normally

### Verification notes

- Method: Inspection of applyContentPatch (src/page/features/contentPatch.ts).
- Criteria: closeFrontmatterEditor is called with the reason content patch.
