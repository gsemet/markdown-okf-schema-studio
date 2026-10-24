---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-058
uuid: 7f013efc-03b2-41e2-ac35-15e6194e7026
title: Refresh is blocked while a field editor is open
description: While a field editor is open, the extension SHALL disable the
  toolbar Refresh button and refuse a refresh with "Save or cancel this edit
  before refreshing." in the editor.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-011
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Refresh is blocked while a field editor is open

### Normative behavior

While a field editor is open, the extension SHALL disable the toolbar Refresh button and refuse a refresh with "Save or cancel this edit before refreshing." in the editor.

### Scenario: Nominal

- GIVEN a field editor open
- WHEN a refresh is requested
- THEN nothing is posted and the editor status reads "Save or cancel this edit before refreshing."

### Scenario: Boundary or refusal

- GIVEN the editor closed
- WHEN a refresh is requested
- THEN the Refresh button is enabled again and a previewRefresh is posted

### Verification notes

- Method: Inspection of refreshPreview (src/page/features/pageInput.ts); the refusal text has no test.
- Criteria: The button is disabled on open and re-enabled on close.
