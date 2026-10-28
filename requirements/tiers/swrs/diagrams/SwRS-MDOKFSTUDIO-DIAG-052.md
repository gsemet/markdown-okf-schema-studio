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
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-TRUST-090; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-TRUST-090
default_owner_email: gaetan@xeberon.net
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

### Verification notes

- Method: Unit test `an include request is answered once with the request's edit id: the file, or a refusal` in `test/session/diagReq.plantuml.requirements.test.ts`.
- Criteria: Every request gets exactly one answer with its edit id.
