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
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Read-only previews disable checkboxes

### Normative behavior

When the preview cannot edit the document, the extension SHALL disable checkboxes with the tooltip 'Editing requires a trusted workspace.' and refuse a toggle message with the same text.

Known issue: the read-only text "Editing requires a trusted workspace." is also shown for a standalone file outside any workspace folder, where trusting a workspace does not help (read-only is decided by "no workspace folder or untrusted").

### Scenario: Untrusted workspace

- GIVEN an untrusted workspace preview
- WHEN it is rendered
- THEN checkboxes are disabled with the tooltip

### Scenario: Toggle from a read-only preview

- GIVEN a toggle message from a read-only preview
- WHEN the host receives it
- THEN it is refused with the same text and no edit is made

### Verification notes

- Method: Page unit test; host refusal untested.
- Criteria: Disabled state and refusal text match.
