---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-021
uuid: 316e3fc1-d2a8-43ab-9eaf-a67304f9bd1f
title: Clicking a checkbox toggles one source character
description: When a writer clicks a checkbox in reading or edit mode, the
  extension SHALL edit only the character between its brackets, without opening
  a block editor.
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

## Clicking a checkbox toggles one source character

### Normative behavior

When a writer clicks a checkbox in reading or edit mode, the extension SHALL edit only the character between its brackets, without opening a block editor.

### Scenario: Toggle in reading mode

- GIVEN a trusted preview with '- [ ] a'
- WHEN the checkbox is clicked
- THEN the source becomes '- [x] a' and no block editor opens

### Scenario: Toggle in a table cell in edit mode

- GIVEN edit mode and '[ ]' in a table cell
- WHEN the checkbox is clicked
- THEN only that character changes and no block editor opens

### Scenario: Uppercase marker rewritten

- GIVEN a checked '[X]' marker
- WHEN the checkbox is clicked to uncheck and clicked again to check
- THEN the marker is written back as lowercase '[x]'

### Verification notes

- Method: Page unit test and integration test.
- Criteria: The edit replaces exactly one character.
