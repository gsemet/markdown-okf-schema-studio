---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-066
uuid: 90f03647-60df-476a-96f1-e497d6ba6084
title: Field and key editors have no palette or slash menu
description: When a writer types in a field or key editor, the extension SHALL
  NOT show the edition palette or the slash menu.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-001
---

## Field and key editors have no palette or slash menu

### Normative behavior

When a writer types in a field or key editor, the extension SHALL NOT show the edition palette or the slash menu.

### Scenario: Nominal

- GIVEN a text field editor open
- WHEN the writer types /
- THEN no slash menu opens

### Scenario: Boundary or refusal

- GIVEN a text selection in the editor
- WHEN it is made
- THEN no edition palette appears

### Verification notes

- Method: Unit test typing in a field or key editor opens neither the slash menu nor the edition palette in test/page/fmtableReqFrontmatter.requirements.test.ts.
- Criteria: Only the block editors bind the palette and slash menu.
