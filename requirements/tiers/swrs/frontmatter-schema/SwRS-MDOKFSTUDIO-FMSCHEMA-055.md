---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-055
uuid: 1903d501-415c-4541-8c7f-eaa33a2a0875
title: A filename stem resolves when exactly one file matches
description: When a link annotation has the resolution `filename-stem`, the
  extension SHALL look the stem up among the Markdown files under the workspace
  folders and the bundle root and accept it when exactly one file matches.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-015
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A filename stem resolves when exactly one file matches

### Normative behavior

When a link annotation has the resolution `filename-stem`, the extension SHALL look the stem up among the Markdown files under the workspace folders and the bundle root and accept it when exactly one file matches.

### Scenario: Unique stem

- GIVEN a stem t and one file t.md below the workspace
- WHEN the document is analysed
- THEN the link is valid

### Scenario: Fragment on a stem

- GIVEN the value t#h
- WHEN the document is analysed
- THEN the link is valid and keeps the fragment h

### Verification notes

- Method: Unit test of the link resolver and of the stem index.
- Criteria: The stem is the file name without .md; a match whose real path leaves its root is refused.
