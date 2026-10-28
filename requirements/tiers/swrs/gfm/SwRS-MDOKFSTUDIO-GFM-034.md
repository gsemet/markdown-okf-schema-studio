---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-034
uuid: ea999fd3-1240-4bf8-885f-4413ca7dda40
title: Colour spans keep safe colours only
description: When a span style declares color or background-color as a named
  colour or keyword, hex, rgb()/rgba() or hsl()/hsla() (comma or space form),
  the extension SHALL keep the colours as data attributes and apply them on the
  page only after revalidating each value with the same grammar, removing var(),
  url(), expression(), !important, comments, escapes, injected declarations and
  other properties, and recording the diagnostic removed-unsafe-style ('Removed
  unsafe style attribute.') for a removed declaration.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: proposed
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
- test/core/render/mystFeatures.test.ts
- test/core/render/mystPaletteRendering.test.ts
- test/core/security/spanColors.test.ts
- test/page/modules/spanColors.test.ts
- test/security/html-policy.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## Colour spans keep safe colours only

### Normative behavior

When a span style declares color or background-color as a named colour (a closed list of the CSS colour names and transparent), one of the keywords currentcolor, inherit, initial and unset, hex (#rgb, #rgba, #rrggbb, #rrggbbaa), rgb()/rgba() or hsl()/hsla() in the comma form or in the space form with an optional '/ alpha' (never mixed), with numbers in range, the extension SHALL keep the colours as data attributes and apply them on the page only after revalidating each value with the same grammar, removing var(), url(), expression(), !important, comments, escapes, semicolon or brace injection, other keywords and other properties, and recording the diagnostic removed-unsafe-style ('Removed unsafe style attribute.') for a removed declaration. The colour grammar is the one used for raw HTML table styles (SwRS-MDOKFSTUDIO-GFM-031), and a span inside a raw HTML table follows the same rule.

### Scenario (nominal): Hex and rgba kept

- GIVEN a span with style 'color:#f00; background-color: rgba(0,0,0,50%)' or 'color: red; background-color: hsl(0,0%,0%)', also nested, in a pipe-table cell and in a raw HTML table cell
- WHEN the preview is rendered
- THEN both colours are exposed as data attributes

### Scenario (refusal): Unsafe values removed

| Input | Outcome |
| --- | --- |
| `color: red; background: var(--x) !important` | red is kept; the rest is removed and the text kept |
| `color: revert`, `color: red !important`, `color: red} body{x:y`, `color: r\65 d` | the value is removed and the text kept |
| `rgb(0, 0 0)` (comma and space mixed), `rgb(0 0 0 0.5)` (no slash), `rgb(256 0 0)` | the value is removed and the text kept |
| `rgb(0 0 0 / 50%)`, `hsl(120 100% 50%)`, `currentcolor` | the value is kept |

### Scenario (boundary): Diagnostic for removed declarations

| Input | Outcome |
| --- | --- |
| span style 'color:#f00; position:fixed' | the diagnostic removed-unsafe-style ('Removed unsafe style attribute.') is recorded |
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
- Method: test/core/security/spanColors.test.ts (grammar and injection shapes), test/core/render/mystFeatures.test.ts (a colour span in a raw HTML table).
- Criteria: Only valid named, hex, rgb/rgba and hsl/hsla values are retained and only grammar-valid values reach styles; the diagnostic is present only when something is removed.
