---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-049
uuid: 5564091c-7c41-43ae-992b-9204e170a1e1
title: The rename field times out after 6 seconds
description: When the host does not answer a rename within 6 s, the extension
  SHALL enable the field again with The editor did not answer. Try again.
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
default_owner_email: gaetan@xeberon.net
---

## The rename field times out after 6 seconds

### Normative behavior

When the host does not answer a rename within 6 s, the extension SHALL enable the field again with The editor did not answer. Try again.

### Scenario: Nominal

- GIVEN no host answer
- WHEN 6 s pass
- THEN the field is editable with that message

### Scenario: Boundary or refusal

- GIVEN an answer arriving before 6 s
- WHEN it is matched
- THEN no timeout message is shown

### Verification notes

- Method: Unit test "without an answer after 6 s the field is editable again with a message; an answer clears the timer" in test/page/modules/renderReq.labelRename.requirements.test.ts
- Criteria: The timer is cleared by the answer.
