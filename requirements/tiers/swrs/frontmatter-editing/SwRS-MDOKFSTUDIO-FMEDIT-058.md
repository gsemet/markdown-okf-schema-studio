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
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-BLOCK-041; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-BLOCK-041
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

- Method: Unit test Refresh is refused with a message while a field editor is open and works once it is closed in test/page/fmtableReqFrontmatter.requirements.test.ts.
- Criteria: The button is disabled on open and re-enabled on close.
