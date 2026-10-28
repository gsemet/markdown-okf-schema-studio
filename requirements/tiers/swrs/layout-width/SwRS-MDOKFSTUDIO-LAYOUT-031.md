---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-031
uuid: 368a465e-4989-41f1-ba76-4be3594ea95a
title: Auto measures wide elements again when the layout changes
description: When the layout may have changed, the extension SHALL measure the
  wide elements again in Auto width mode, after a content patch, a resize, an
  image load, a toolbar collapse, a table-of-contents toggle or a change of the
  edited element.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-023; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-LAYOUT-023
default_owner_email: gaetan@xeberon.net
---

## Auto measures wide elements again when the layout changes

### Normative behavior

When the layout may have changed, the extension SHALL measure the wide elements again in Auto width mode, after a content patch, a resize, an image load, a toolbar collapse, a table-of-contents toggle or a change of the edited element.

### Scenario: Resize

- GIVEN Auto mode with a wide table
- WHEN the window is resized
- THEN the table is measured again and is marked wide with its breakout

### Scenario: Gain of one pixel or less

- GIVEN Auto mode and an element as wide as the column, or 1 px wider
- WHEN the elements are measured after a resize
- THEN the element is not marked wide

### Known issues

- Known issue: The re-measure after a content patch, an image load and a table-of-contents toggle has no unit test (the content patch test builds the runtime but asserts nothing about width).
- Known issue: An element entering edit loses its mark through a mutation observer; the unit test covers the start-up and resize path.

### Verification notes

- Method: Unit test T10 the saved width mode applies at startup and an edited element keeps the column; inspection of the stabilizeLayout, content patch and toolbar callbacks.
- Criteria: Every listed event calls the width update.
