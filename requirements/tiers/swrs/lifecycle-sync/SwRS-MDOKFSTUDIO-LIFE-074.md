---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-074
uuid: 26d1c7d0-2bd2-47c5-a8da-5b767f0b578b
title: The page refuses a patch whose status lines break the same bounds
description: When the page receives a content patch with a malformed status line
  or with more than 500 lines, a text over 20000 characters or a severity over
  50 characters, the extension SHALL ignore the whole patch.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-005
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The page refuses a patch whose status lines break the same bounds

### Normative behavior

When the page receives a content patch with a malformed status line or with more than 500 lines, a text over 20000 characters or a severity over 50 characters, the extension SHALL ignore the whole patch.

### Scenario: Malformed line

- GIVEN a patch with a status line that has no text
- WHEN the page receives it
- THEN nothing changes and nothing is acknowledged (unit test test/page/runtimeContentPatch.test.ts "CR 050: a patch keeps the code of each status line and refuses a malformed one")

### Scenario: Valid lines

- GIVEN a patch whose lines carry codes
- WHEN the page applies it
- THEN each line keeps its code attribute

### Verification notes

- Method: Unit test test/page/runtimeContentPatch.test.ts "CR 050: a patch keeps the code of each status line and refuses a malformed one". The message envelope belongs to trust-security.
- Criteria: The status region holds the codes of the lines of a valid patch only.

### Archived

Covered by SwRS-MDOKFSTUDIO-TRUST-061 (a content patch must stay within its bounds); the code attribute of each status line is kept by SwRS-MDOKFSTUDIO-LIFE-087.
