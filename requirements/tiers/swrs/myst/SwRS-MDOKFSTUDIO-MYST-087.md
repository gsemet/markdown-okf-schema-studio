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
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
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

- Method: test
- Criteria: Admonition family behaves per name.
