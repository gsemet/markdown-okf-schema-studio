---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-042
uuid: 0c4e9ea5-6836-40c0-b327-3c9f536cdd84
title: The host refuses a rename in an untrusted or read-only preview
description: When a rename arrives for an untrusted or read-only preview, the
  extension SHALL change nothing and answer the read-only reason
  (SwRS-MDOKFSTUDIO-TRUST-005).
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-TRUST-005; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-TRUST-005
default_owner_email: gaetan@xeberon.net
---

## The host refuses a rename in an untrusted or read-only preview

### Normative behavior

When a rename arrives for an untrusted or read-only preview, the extension SHALL change nothing and answer the read-only reason (SwRS-MDOKFSTUDIO-TRUST-005).

### Scenario: Nominal

- GIVEN an untrusted workspace
- WHEN a rename request arrives
- THEN the answer is not ok with that reason and the document is unchanged

### Scenario: Boundary or refusal

- GIVEN a read-only preview
- WHEN a rename request arrives
- THEN the same refusal applies

### Verification notes

- Method: Unit test "a rename in an untrusted or read-only preview changes nothing and answers with the read-only reason" in test/session/renderReq.labelRename.requirements.test.ts
- Criteria: Refusal carries the reason.
