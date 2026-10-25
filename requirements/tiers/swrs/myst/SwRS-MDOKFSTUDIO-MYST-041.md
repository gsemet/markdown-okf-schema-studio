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
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-038; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-038
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

- Method: Unit test "an invalid or unchanged name is not sent" in test/page/modules/labelRename.test.ts; Unit test "label names follow the MyST pattern and the length limit" in test/core/mapping/labelRename.test.ts; Unit test "previewLabelRename validates the line and both label names" in test/core/protocol/pageToHost.test.ts
- Criteria: Both page and host reject.
