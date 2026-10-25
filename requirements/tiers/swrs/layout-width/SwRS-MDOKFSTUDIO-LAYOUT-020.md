---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-020
uuid: e738ec75-a2f3-4e2a-9cdb-888e56c1a5e2
title: The Width button cycles Margin, Auto and Full and keeps the reading line
description: When the reader presses the Width button, the extension SHALL
  switch the width mode in the order Margin, Auto, Full width and back to
  Margin, update its icon, label and tooltip, and keep the line at the reading
  position of the page.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
depends_on:
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/widthMode.ts
- src/page/runtime.ts
tested_in_files:
- test/page/diagReq.layout.requirements.test.ts
- test/page/runtimePageControls.test.ts
- test/visual/capture_layout_checks.py
---

## The Width button cycles Margin, Auto and Full and keeps the reading line

### Normative behavior

When the reader presses the Width button, the extension SHALL switch the width mode in the order Margin, Auto, Full width and back to Margin, update its icon, label and tooltip, and keep the line at the reading position of the page.

### Scenario (nominal): Three clicks
- GIVEN the page in Margin width mode with the Width button reading Width: Margin
- WHEN the button is clicked three times
- THEN the root attribute data-sphinx-preview-width reads auto, full, margin in turn and the button label reads Width: Auto, Width: Full width and Width: Margin

### Scenario (nominal): Label of every mode
- GIVEN the button after one and two clicks
- WHEN its attributes are read
- THEN aria-label, title and data-tooltip all read Width: Auto, then Width: Full width, and the icon of the mode is the only one shown

### Scenario (nominal): Scrolled document
- GIVEN a long document scrolled to a position and a width mode change
- WHEN the Width button is clicked
- THEN the line at the reading position is taken as the anchor and the page is stabilised, so the same line stays at the reading position after the layout change

### Scenario (boundary): No anchor yet
- GIVEN a page without an anchor
- WHEN the Width button is clicked
- THEN the anchor is taken from the line at the current scroll position, when that line is known

### Known issues
- Known issue: The README and the code place the Width button on the third toolbar row, but the file header of widthMode.ts and an older bullet of the Unreleased CHANGELOG entry say the second row (stale).

### Related requirements
- SwRS-MDOKFSTUDIO-LAYOUT-018: the same change callback measures the first-element clearance again.
- SwRS-MDOKFSTUDIO-LIFE-169: the choice is kept in the webview state and sent to the host as a workspace preference.
- SwRS-MDOKFSTUDIO-LIFE-170: the saved mode is applied when the page starts.

### Verification notes
- Method: test/page/runtimePageControls.test.ts (three clicks, label of every mode): unit tests T10 the width button cycles margin, auto, full width and posts widthMode and the width icon CSS.
- Method: test/visual/capture_layout_checks.py (three clicks, label of every mode): visual checks of the three modes in light, dark and cream at 900 and 1600 px.
- Method: test/page/diagReq.layout.requirements.test.ts (scrolled document, no anchor yet): unit test `a width mode change keeps the line at the reading position, with or without an anchor yet`.
- Criteria: Mode order and label texts are exactly as listed; the change callback calls keepReadingLine.
