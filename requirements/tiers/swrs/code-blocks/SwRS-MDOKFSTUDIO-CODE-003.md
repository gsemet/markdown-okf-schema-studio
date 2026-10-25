---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-003
uuid: 800c2575-7ba6-4141-907b-1afca465b5c6
title: Read the fence label case-insensitively up to its first separator
description: When a fence label carries upper-case letters or trailing text
  after a space, a comma or `{`, the extension SHALL select the grammar from the
  label's leading word, ignoring case.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CODE-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-CODE-001
---

## Read the fence label case-insensitively up to its first separator

### Normative behavior

When a fence label carries upper-case letters or trailing text after a space, a comma or `{`, the extension SHALL select the grammar from the label's leading word, ignoring case.

### Scenario: nominal behavior

- GIVEN a block fenced as `Python {linenos}`
- WHEN the preview renders it
- THEN the Python grammar is applied

### Scenario: boundary or refusal behavior

- GIVEN a block fenced as `, python` with an empty leading word
- WHEN the preview renders it
- THEN no grammar is selected and the block stays plain

### Verification notes

- Method: Unit test of the label resolution.
- Criteria: The leading word, lower-cased, selects the grammar; an empty word selects none.
