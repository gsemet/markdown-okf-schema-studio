---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-079
uuid: 4a7d1601-5d60-4a0d-bbb3-c577d7ab7c57
title: Problems entries are replaced and removed
description: When a document re-renders, its preview closes or its document
  changes, the extension SHALL replace or remove its Problems entries.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-078; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-078
default_owner_email: gaetan@xeberon.net
---

## Problems entries are replaced and removed

### Normative behavior

When a document re-renders, its preview closes or its document changes, the extension SHALL replace or remove its Problems entries.

### Scenario: Nominal

- GIVEN a new render with fewer warnings
- WHEN it completes
- THEN old entries are replaced

### Scenario: Boundary or refusal

- GIVEN the preview closes
- WHEN it closes
- THEN no entries remain

### Verification notes

- Method: Integration suite run() in test/integration/mystDiagnostics.test.ts
- Criteria: No unit test of the controller.
