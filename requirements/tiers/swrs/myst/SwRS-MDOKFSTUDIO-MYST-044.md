---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-044
uuid: 5587a395-c27c-48a0-b8e4-914423ab6b6a
title: The host refuses a rename for an out-of-date preview
description: When a rename is for a document revision the host has moved past,
  the extension SHALL change nothing and answer The preview is out of date. Try
  again once it has refreshed.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-TRUST-065; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-TRUST-065
---

## The host refuses a rename for an out-of-date preview

### Normative behavior

When a rename is for a document revision the host has moved past, the extension SHALL change nothing and answer The preview is out of date. Try again once it has refreshed.

### Scenario: Nominal

- GIVEN a document edited after rendering
- WHEN a rename request arrives with the old revision data
- THEN the refusal text is returned and nothing changes

### Scenario: Boundary or refusal

- GIVEN a message for a stale render revision
- WHEN it reaches the render gate
- THEN it is dropped without an answer

### Verification notes

- Method: Integration suite run() in test/integration/labelRename.test.ts
- Criteria: The page ends with the timeout text in the second case.
