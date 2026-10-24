---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-043
uuid: 0744ee93-51aa-474c-9333-77d4840754aa
title: The host refuses a rename while an edit is open
description: When a rename arrives while a block or frontmatter edit is open,
  the extension SHALL change nothing and answer Save or cancel the open Markdown
  edit before renaming a label.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-010
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The host refuses a rename while an edit is open

### Normative behavior

When a rename arrives while a block or frontmatter edit is open, the extension SHALL change nothing and answer Save or cancel the open Markdown edit before renaming a label.

### Scenario: Nominal

- GIVEN a block editor open
- WHEN a rename request arrives
- THEN the answer carries that reason and nothing changes

### Scenario: Boundary or refusal

- GIVEN a frontmatter edit open
- WHEN a rename request arrives
- THEN the same refusal applies

### Verification notes

- Method: test
- Criteria: The document is unchanged.
