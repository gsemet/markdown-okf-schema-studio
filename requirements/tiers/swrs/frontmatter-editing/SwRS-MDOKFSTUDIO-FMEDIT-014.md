---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-014
uuid: dc9115f1-f497-4e55-8a01-2f5eab55a11d
title: Link lists suggest the known Markdown file stems
description: "When a writer edits a list of filename-stem links, the extension SHALL
  offer the known Markdown file stems as suggestions on every item input, new items
  included."
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-010; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-010
---

## Link lists suggest the known Markdown file stems

### Normative behavior

When a writer edits a list of filename-stem links, the extension SHALL offer the known Markdown file stems as suggestions on every item input, new items included.

### Scenario: Nominal

- GIVEN a list field of filename-stem links whose row carries link suggestions
- WHEN the writer opens its editor and adds an item
- THEN each input, the new one included, references the datalist of the stems

### Scenario: Boundary or refusal

- GIVEN an item whose value matches no stem
- WHEN the writer types it
- THEN the status warns 'No Markdown file named "x.md" was found. It will be saved as typed.' and saving still posts the value

### Known issues

- Known issue: suggestions exist only after the deferred link inspection: an editor opened before it gets none, and scalar link fields get no suggestions.

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterFields.test.ts).
- Criteria: Tests T22 datalist, no list for a missing or invalid attribute, warning, save still posted.
