---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-052
uuid: 551dbc5b-acf5-4a8a-a0bf-49e31e3e7233
title: The host answers an include request with the same edit id
description: "When the host handles an include request, it SHALL answer with previewPlantUmlIncludeResult
  carrying the request's edit id: ok with the file's real path as id and its text,
  or not ok with a reason."
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

## The host answers an include request with the same edit id

### Normative behavior

When the host handles an include request, it SHALL answer with previewPlantUmlIncludeResult carrying the request's edit id: ok with the file's real path as id and its text, or not ok with a reason.

### Scenario: File read

- GIVEN an include request for an existing file
- WHEN the host handles it
- THEN the answer repeats the edit id and carries ok true, the real path as id and the text

### Scenario: Refusal

- GIVEN an include request for a file outside the allowed folders
- WHEN the host handles it
- THEN the answer repeats the edit id and carries ok false and a reason

### Known issues

- Known issue: PlantUmlController.handleInclude has no test.

### Verification notes

- Method: No host-level test; only the resolver and the message shape are tested.
- Criteria: Every request gets exactly one answer with its edit id.
