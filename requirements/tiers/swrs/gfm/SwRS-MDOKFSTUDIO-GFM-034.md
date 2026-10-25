---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-034
uuid: ea999fd3-1240-4bf8-885f-4413ca7dda40
title: Colour spans keep safe colours only
description: When a span style declares color or background-color as hex or
  comma-separated rgb()/rgba(), the extension SHALL keep the colours as data
  attributes and apply them on the page only after revalidating each value,
  removing named colours, var(), url(), !important, comments and other
  properties, and recording the sanitizer diagnostic 'Removed unsafe style
  attribute.' for a removed declaration.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/security/html-sanitizer.ts
- src/core/security/spanColors.ts
- src/page/modules/spanColors.ts
tested_in_files:
- test/core/render/mystPaletteRendering.test.ts
- test/page/modules/spanColors.test.ts
- test/security/html-policy.test.ts
---

## Colour spans keep safe colours only

### Normative behavior

When a span style declares color or background-color as hex or comma-separated rgb()/rgba(), the extension SHALL keep the colours as data attributes and apply them on the page only after revalidating each value, removing named colours, var(), url(), !important, comments and other properties, and recording the sanitizer diagnostic 'Removed unsafe style attribute.' for a removed declaration.

### Scenario (nominal): Hex and rgba kept

- GIVEN a span with style 'color:#f00; background-color: rgba(0,0,0,50%)', also nested and in a pipe-table cell
- WHEN the preview is rendered
- THEN both colours are exposed as data attributes

### Scenario (refusal): Unsafe values removed

| Input | Outcome |
| --- | --- |
| `color: red; background: var(--x) !important` | the values are removed and the text kept |
| `rgb(0 0 0)` (space-separated) | the value is removed and the text kept |

### Scenario (boundary): Diagnostic for removed declarations

| Input | Outcome |
| --- | --- |
| span style 'color:#f00; position:fixed' | the diagnostic 'Removed unsafe style attribute.' is recorded |
| span style 'color:#f00' | no diagnostic is recorded |

### Scenario (nominal): The page applies valid colours

- GIVEN a span with data-okf-color '#f00' under the preview content
- WHEN colours are applied
- THEN the element style color is set through the CSSOM

### Scenario (refusal): Hand-edited invalid attribute

- GIVEN a span with data-okf-color 'url(x)'
- WHEN colours are applied
- THEN no style is set

### Verification notes

- Method: test/core/render/mystPaletteRendering.test.ts (hex and rgba kept, unsafe values removed: unit tests on the render pipeline output).
- Method: test/security/html-policy.test.ts (kept and removed values, diagnostic: unit test "span style keeps only hex and rgb colour and background-color as data attributes").
- Method: test/page/modules/spanColors.test.ts (valid attribute applied, hand-edited invalid attribute: page unit tests).
- Criteria: Only valid hex/rgb/rgba values are retained and only grammar-valid values reach styles; the diagnostic is present only when something is removed.
