---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-041
uuid: 5619e278-3fe6-4963-a331-c815cf96d9fe
title: Invalid label names are not sent
description: 'When the new label name is empty, longer than 100 characters, starts
  with a non letter or digit, or uses characters other than letters, digits and _
  . : -, the extension SHALL not send it and show Use letters, digits and _ . : -
  only, starting with a letter or digit (100 characters at most).'
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

## Invalid label names are not sent

### Normative behavior

When the new label name is empty, longer than 100 characters, starts with a non letter or digit, or uses characters other than letters, digits and _ . : -, the extension SHALL not send it and show Use letters, digits and _ . : - only, starting with a letter or digit (100 characters at most).

### Scenario: Nominal

- GIVEN the name `-bad`
- WHEN Enter is pressed
- THEN the message is shown and nothing is posted

### Scenario: Boundary or refusal

- GIVEN an empty name or a 101-character name
- WHEN Enter is pressed
- THEN the same message is shown; the host and message validator repeat the check

### Verification notes

- Method: test
- Criteria: Both page and host reject.
