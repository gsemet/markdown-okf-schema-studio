---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-027
uuid: 40cd31a3-690f-4a4c-a6f1-2c12f1f7e5e8
title: Auto uses the author's pixel width for an image breakout
description: When an image carries a pixel width written by its author, the
  extension SHALL compute its breakout in Auto width mode from that width
  instead of the intrinsic size, ignoring a gain of 1 px or less.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-007
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Auto uses the author's pixel width for an image breakout

### Normative behavior

When an image carries a pixel width written by its author, the extension SHALL compute its breakout in Auto width mode from that width instead of the intrinsic size, ignoring a gain of 1 px or less.

### Scenario: Declared pixel width

- GIVEN an image with data-okf-width 800 whose intrinsic width is 3000 px, in a 700 px column
- WHEN the elements are measured in Auto
- THEN the breakout is based on 800 px, so 100 px

### Scenario: Gain of one pixel

- GIVEN an element 701 px wide in a 700 px column
- WHEN the elements are measured in Auto
- THEN the element is not marked wide

### Known issues

- Known issue: Neither the declared-pixel-width path nor the 1 px tolerance has a test; the Mermaid wrapper path is not directly tested either.

### Verification notes

- Method: Inspection of widthMode.ts (declared width replaces the intrinsic size; extra values of 1 or less return); no automated test.
- Criteria: Breakout 100 px for the declared case, no mark for a gain of 1 px or less.
