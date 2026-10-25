---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-082
uuid: a43b4d26-e877-4349-a0b0-18517c629a37
title: A patch with stale or malformed fields is ignored
description: When a content patch names the wrong current identifiers or carries
  malformed fields, the page SHALL ignore it.
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

## A patch with stale or malformed fields is ignored

### Normative behavior

When a content patch names the wrong current identifiers or carries malformed fields, the page SHALL ignore it.

### Scenario: Stale patch

- GIVEN a patch addressed to request 1 while the page is on request 2
- WHEN the page receives it
- THEN nothing changes (unit test test/page/runtimeContentPatch.test.ts "T34: a patch with stale or malformed fields is ignored")

### Scenario: Malformed patch

- GIVEN a patch whose next block is missing
- WHEN the page receives it
- THEN nothing changes

### Verification notes

- Method: Unit test test/page/runtimeContentPatch.test.ts as named. The host-to-page envelope belongs to trust-security.
- Criteria: The content and identifiers of the page are unchanged.

### Archived

Covered by SwRS-MDOKFSTUDIO-TRUST-060 and SwRS-MDOKFSTUDIO-TRUST-061 (a patch must be addressed to the page and stay within its bounds).
