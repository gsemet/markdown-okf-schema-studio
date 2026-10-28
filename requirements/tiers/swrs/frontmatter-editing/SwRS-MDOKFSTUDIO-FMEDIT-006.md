---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-006
uuid: 87dce2cd-6b75-4ce3-841b-84b369bf9443
title: A multi-line text value is written as a literal block
description: When a writer saves a text field with a value that holds line
  breaks, the extension SHALL write it into the frontmatter as a YAML literal
  block.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-004; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-004
default_owner_email: gaetan@xeberon.net
---

## A multi-line text value is written as a literal block

### Normative behavior

When a writer saves a text field with a value that holds line breaks, the extension SHALL write it into the frontmatter as a YAML literal block.

### Scenario: Nominal

- GIVEN a plain frontmatter field description holding one line, followed by the field b: 2
- WHEN the value "a\nb" (two lines) is saved for description
- THEN the field is written as a literal block (description: |- then the lines a and b indented)

### Scenario: Boundary or refusal

- GIVEN the same document
- WHEN the multi-line value is saved
- THEN the line b: 2 and the fences stay unchanged

### Verification notes

- Method: Unit test on the frontmatter patch (test/core/frontmatter/okfFrontmatter.test.ts).
- Criteria: Test a multi-line value on a plain field is written as a literal block.
