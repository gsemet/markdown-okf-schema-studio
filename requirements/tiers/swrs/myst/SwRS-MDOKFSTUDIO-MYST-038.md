---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-038
uuid: 0bf9bdd0-2e90-4a37-b7d8-1efb9ea673ea
title: Clicking an anchor icon in edit mode opens the rename field
description: When a reader clicks an anchor icon in edit mode, the extension
  SHALL open a Rename label popover with a prefilled, selected, focused Label
  name field before block click handling.
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

## Clicking an anchor icon in edit mode opens the rename field

### Normative behavior

When a reader clicks an anchor icon in edit mode, the extension SHALL open a Rename label popover with a prefilled, selected, focused Label name field before block click handling.

### Scenario: Nominal

- GIVEN edit mode on
- WHEN the anchor icon is clicked
- THEN a dialog Rename label opens under it with the field prefilled and selected, and no block editor opens

### Scenario: Boundary or refusal

- GIVEN edit mode off
- WHEN the anchor icon is clicked
- THEN nothing opens and the icon stays a link target

### Verification notes

- Method: test
- Criteria: The icon shows a pointer cursor in edit mode only.
