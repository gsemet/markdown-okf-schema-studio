---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-087
uuid: c3428282-f8b5-4c98-90a3-69296a4d018b
title: Each admonition kind renders under its own directive name
description: When a document holds an admonition directive, the extension SHALL
  render it with the title, styles and palette actions of its own directive
  name.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-001
---

## Each admonition kind renders under its own directive name

### Normative behavior

When a document holds an admonition directive, the extension SHALL render it with the title, styles and palette actions of its own directive name.

### Scenario: Nominal

- GIVEN note, tip and warning directives
- WHEN the preview renders
- THEN each shows its own title and accent and has its own palette action

### Scenario: Boundary or refusal

- GIVEN an admonition name that is not registered
- WHEN the preview renders
- THEN it falls back to the generic Admonition rendering

### Verification notes

- Method: Unit test "each directive name has one plug-in, found by its exact name" in test/core/directives/registry.test.ts
- Criteria: Admonition family behaves per name.
