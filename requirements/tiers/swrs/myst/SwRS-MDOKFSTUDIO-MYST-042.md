---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-042
uuid: 0c4e9ea5-6836-40c0-b327-3c9f536cdd84
title: The host refuses a rename in an untrusted or read-only preview
description: When a rename arrives for an untrusted or read-only preview, the
  extension SHALL change nothing and answer Renaming needs a trusted workspace.
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

## The host refuses a rename in an untrusted or read-only preview

### Normative behavior

When a rename arrives for an untrusted or read-only preview, the extension SHALL change nothing and answer Renaming needs a trusted workspace.

### Scenario: Nominal

- GIVEN an untrusted workspace
- WHEN a rename request arrives
- THEN the answer is not ok with that reason and the document is unchanged

### Scenario: Boundary or refusal

- GIVEN a read-only preview
- WHEN a rename request arrives
- THEN the same refusal applies

### Verification notes

- Method: test
- Criteria: Refusal carries the reason.
