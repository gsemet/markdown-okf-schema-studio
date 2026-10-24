---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-063
uuid: 1c0855da-c0b6-4e22-8248-40eb8db55ff9
title: A resolving link shows as a link with its tooltip
description: When a frontmatter link resolves to a file, the extension SHALL
  show the value as a keyboard-focusable link whose tooltip starts with the
  workspace-relative path of the target.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-016
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A resolving link shows as a link with its tooltip

### Normative behavior

When a frontmatter link resolves to a file, the extension SHALL show the value as a keyboard-focusable link whose tooltip starts with the workspace-relative path of the target.

### Scenario: Valid link

- GIVEN a link value t.md that resolves to bundle/docs/t.md
- WHEN the table is rendered
- THEN the Value cell holds a focusable link t.md whose tooltip starts with bundle/docs/t.md

### Scenario: List of links

- GIVEN a list field whose items are annotated links
- WHEN the table is rendered
- THEN each item is its own link

### Verification notes

- Method: Unit test of the table renderer; integration test.
- Criteria: The link carries the navigation request okf-link and the status valid.
