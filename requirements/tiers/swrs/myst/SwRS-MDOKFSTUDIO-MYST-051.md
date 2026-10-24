---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-051
uuid: b0ac71a2-523f-4f9b-a0b7-62a3a186bd59
title: The previewLabelRename message is validated and answered
description: When the page posts previewLabelRename, the extension SHALL accept
  it only with a source line, two valid label names and the current render, and
  answer previewLabelRenameResult with the same edit id.
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

## The previewLabelRename message is validated and answered

### Normative behavior

When the page posts previewLabelRename, the extension SHALL accept it only with a source line, two valid label names and the current render, and answer previewLabelRenameResult with the same edit id.

### Scenario: Nominal

- GIVEN a message with line, old name, new name and edit id for the current render
- WHEN the host receives it
- THEN previewLabelRenameResult carries the same edit id with ok, remainingRefs or reason

### Scenario: Boundary or refusal

- GIVEN a message with an invalid name, no line or a stale render
- WHEN the host receives it
- THEN it is rejected or dropped by the validator and gate

### Verification notes

- Method: test
- Criteria: Result fields are ok, remainingRefs, reason.
