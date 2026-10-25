---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-026
uuid: 5dbe46ce-ec20-46fe-a669-6674ca59b285
title: Read-only previews disable checkboxes
description: When the preview cannot edit the document, the extension SHALL
  disable checkboxes with the tooltip 'Editing requires a trusted workspace.'
  and refuse a toggle message with the same text.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-TRUST-005; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-TRUST-005
---

## Read-only previews disable checkboxes

### Normative behavior

When the preview cannot edit the document, the extension SHALL disable checkboxes with the tooltip of the shared read-only reason (SwRS-MDOKFSTUDIO-TRUST-005) and refuse a toggle message with the same text.

### Scenario: Untrusted workspace

- GIVEN an untrusted workspace preview
- WHEN it is rendered
- THEN checkboxes are disabled with the tooltip

### Scenario: Toggle from a read-only preview

- GIVEN a toggle message from a read-only preview
- WHEN the host receives it
- THEN it is refused with the same text and no edit is made

### Verification notes

- Method: Unit test "checkboxes are disabled when the preview cannot edit the document" in test/page/runtimePageControls.test.ts. Untested: the host refusal.
- Criteria: Disabled state and refusal text match.
