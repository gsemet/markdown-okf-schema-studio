---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-032
uuid: 2bf84477-0818-4c2a-9127-077574d976d3
title: The host refuses to remove a required field
description: When the host receives a remove that would leave a required field
  missing, the extension SHALL refuse it with 'Cannot remove required
  frontmatter field "{name}".'
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-007
- StRS-MDOKFSTUDIO-FMEDIT-009
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The host refuses to remove a required field

### Normative behavior

When the host receives a remove that would leave a required field missing, the extension SHALL refuse it with 'Cannot remove required frontmatter field "{name}".'

### Scenario: Nominal

- GIVEN a document with a schema in which count is required
- WHEN a remove of count arrives
- THEN the answer is 'Cannot remove required frontmatter field "count".' and the document is unchanged

### Scenario: Boundary or refusal

- GIVEN a required field that was already missing before the remove
- WHEN another, optional field is removed
- THEN the remove is accepted: only a newly missing required field blocks it

### Verification notes

- Method: Unit test on the candidate check (test/core/edits/frontmatterEdit.test.ts).
- Criteria: A remove that makes another field newly missing through a conditional required rule is refused the same way.
