---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-050
uuid: f81ead29-a3bf-4060-9fe8-9ec9acf6ec03
title: The host accepts only well-formed include requests
description: When the host receives a previewPlantUmlInclude message, it SHALL
  accept it only with a file name that is not blank and at most 4096 characters,
  a from that is null or a non-empty string of at most 4096 characters, and a
  non-empty bounded edit id.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The host accepts only well-formed include requests

### Normative behavior

When the host receives a previewPlantUmlInclude message, it SHALL accept it only with a file name that is not blank and at most 4096 characters, a from that is null or a non-empty string of at most 4096 characters, and a non-empty bounded edit id.

### Scenario: Well formed

- GIVEN a message with a 4096-character name, from null and an edit id
- WHEN the host validates it
- THEN it is accepted

### Scenario: Malformed

- GIVEN a blank name, a 4097-character name, an empty from or a missing edit id
- WHEN the host validates it
- THEN it is refused

### Verification notes

- Method: Unit test of the page-to-host validator.
- Criteria: Boundaries 4096 and 4097 behave as stated.
