---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-017
uuid: e0fc7db4-405d-40d9-b36e-18b77c088728
title: Definition lists render
description: 'When a document holds a term followed by `: Definition` lines, the extension
  SHALL render a definition list.'
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Definition lists render

### Normative behavior

When a document holds a term followed by `: Definition` lines, the extension SHALL render a definition list.

### Scenario: Nominal

- GIVEN a term line and a `: Definition` line
- WHEN the preview renders
- THEN a definition list with the term and definition is shown

### Scenario: Boundary or refusal

- GIVEN a definition list written by the palette Definition list button
- WHEN the preview renders
- THEN the same list form renders

### Verification notes

- Method: test
- Criteria: Term and definition become dt and dd.
