---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-066
uuid: 0bbbff50-3364-453a-ac2e-b6169ab4057b
title: Ignore invalid page messages
description: When the preview page sends a message, the extension SHALL validate
  it against the page-to-host protocol, ignoring an invalid one without
  user-visible change.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-TRUST-052; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-TRUST-052
---

## Ignore invalid page messages

### Normative behavior

When the preview page sends a message, the extension SHALL validate it against the page-to-host protocol, ignoring an invalid one without user-visible change.

### Scenario: Nominal

- GIVEN a well-formed page message
- WHEN it is received
- THEN the host acts on it

### Scenario: Boundary or refusal

- GIVEN a message with a wrong field
- WHEN it is received
- THEN it is ignored and nothing changes on screen

### Verification notes

- Method: Unit test "the shipped registry rejects an unregistered type" in test/core/protocol/pageToHost.test.ts
- Criteria: Only validated messages reach handlers.

Gap: message validation is a trust and security behaviour; no trust-security StRS exists yet, so this SwRS derives from the faithful rendering StRS for now and should be re-linked when that StRS is created.
