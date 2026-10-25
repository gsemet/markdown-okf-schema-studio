---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-093
uuid: 07ec32e1-3aba-4490-bad8-5d0722b6e2fc
title: A directive name registered twice is refused
description: When two directive families declare the same directive name, the
  extension SHALL refuse the second registration with an error naming the
  duplicate.
project: markdown-okf-schema-studio
scope: myst
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Archived. Not an observable behaviour; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A directive name registered twice is refused

### Normative behavior

When two directive families declare the same directive name, the extension SHALL refuse the second registration with an error naming the duplicate.

### Scenario: Nominal

- GIVEN two families declaring `note`
- WHEN registration runs
- THEN the build fails with an error naming note

### Scenario: Boundary or refusal

- GIVEN families with distinct names
- WHEN registration runs
- THEN all register without error

### Verification notes

- Method: Unit test "a directive name registered twice raises an error naming it; distinct names register" in test/core/directives/renderReq.registry.requirements.test.ts
- Criteria: Duplicate registration raises an error.
