---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-034
uuid: ea999fd3-1240-4bf8-885f-4413ca7dda40
title: Colour spans keep safe colours only
description: When a span style declares color or background-color as hex or
  comma-separated rgb()/rgba(), the extension SHALL keep the colours, and SHALL
  remove named colours, var(), url(), !important, comments and other properties.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Colour spans keep safe colours only

### Normative behavior

When a span style declares color or background-color as hex or comma-separated rgb()/rgba(), the extension SHALL keep the colours, and SHALL remove named colours, var(), url(), !important, comments and other properties.

### Scenario: Hex and rgba kept

- GIVEN a span with style 'color:#f00; background-color: rgba(0,0,0,50%)', also nested and in a pipe-table cell
- WHEN the preview is rendered
- THEN both colours are exposed as data attributes

### Scenario: Unsafe values removed

- GIVEN a style 'color: red; background: var(--x) !important' and 'rgb(0 0 0)'
- WHEN the preview is rendered
- THEN the values are removed and the text kept

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: Only valid hex/rgb/rgba values are retained.
