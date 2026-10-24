---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-020
uuid: e738ec75-a2f3-4e2a-9cdb-888e56c1a5e2
title: The Width button cycles Margin, Auto and Full width
description: When the reader presses the Width button, the extension SHALL
  switch the width mode in the order Margin, Auto, Full width and back to Margin
  and update its icon, label and tooltip.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The Width button cycles Margin, Auto and Full width

### Normative behavior

When the reader presses the Width button, the extension SHALL switch the width mode in the order Margin, Auto, Full width and back to Margin and update its icon, label and tooltip.

### Scenario: Three clicks

- GIVEN the page in Margin width mode with the Width button reading Width: Margin
- WHEN the button is clicked three times
- THEN the root attribute data-sphinx-preview-width reads auto, full, margin in turn and the button label reads Width: Auto, Width: Full width and Width: Margin

### Scenario: Label of every mode

- GIVEN the button after one and two clicks
- WHEN its attributes are read
- THEN aria-label, title and data-tooltip all read Width: Auto, then Width: Full width, and the icon of the mode is the only one shown

### Known issues

- Known issue: The README and the code place the Width button on the third toolbar row, but the file header of widthMode.ts and an older bullet of the Unreleased CHANGELOG entry say the second row (stale).

### Verification notes

- Method: Unit tests T10 the width button cycles margin, auto, full width and posts widthMode and the width icon CSS; visual checks of the three modes in light, dark and cream at 900 and 1600 px.
- Criteria: Mode order and label texts are exactly as listed.
