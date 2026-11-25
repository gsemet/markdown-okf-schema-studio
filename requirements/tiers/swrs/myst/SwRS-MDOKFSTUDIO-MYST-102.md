---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-102
uuid: c5f4aa50-b76d-4514-a738-a0d363c16d3c
title: Dollar prices stay text and keep their emphasis
description: When a sentence holds dollar amounts such as `$5 and $6` or bold
  prices such as `**$671**`, the extension SHALL keep them as text with their
  dollar signs and their emphasis, and typeset as maths only a span whose
  opening `$` is not followed by whitespace and whose closing `$` neither
  follows whitespace nor precedes a digit.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-006
scenarios:
- id: S1
  title: Dollar amounts in a sentence stay text
- id: S2
  title: Bold dollar prices preserve emphasis
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystInlineTransforms.ts
tested_in_files:
- test/core/render/mathRenderer.test.ts
- test/visual/mathScenarios.ts
- test/visual/scenarioDefinitions3.ts
default_owner_email: gaetan@xeberon.net
---

## Dollar prices stay text and keep their emphasis

### Normative behavior

When a sentence holds dollar amounts such as `$5 and $6` or bold prices such as `**$671**`, the extension SHALL keep them as text with their dollar signs and their emphasis, and typeset as maths only a span whose opening `$` is not followed by whitespace and whose closing `$` neither follows whitespace nor precedes a digit.

### Scenario S1 (nominal): Dollar amounts in a sentence stay text

- GIVEN sentences with `$19 base subscription ... ($200)`, `$5 and $6` and `$100–$380`, and a real `$x$` span
- WHEN the preview renders
- THEN each price sentence stays text with its dollar signs and holds no typeset span, and only the real span is typeset as maths, following the Sphinx rule that an opening `$` is not followed by whitespace and a closing `$` neither follows whitespace nor precedes a digit

### Scenario S2 (boundary): Bold dollar prices preserve emphasis

- GIVEN `**$671** cache reads + **$402** 5-min cache writes + **$85** 1-h cache writes + **$216** output`
- WHEN the preview renders
- THEN the four prices are text inside four strong spans, the dollar signs are retained, and no literal `**` markers appear

### Related requirements

- SwRS-MDOKFSTUDIO-MYST-024: typesets the real maths spans

### Verification notes

- Method: test/core/render/mathRenderer.test.ts (dollar amounts: "dollar amounts stay text while a real dollar span is maths"; emphasis: "bold dollar prices do not consume the surrounding emphasis markers")
- Method: test/visual/scenarioDefinitions2.ts (visual scenarios myst/v35 and myst/v36, fixture 55-dollar-prices, with three real math spans and four bold prices)
- Method: test/visual/mathScenarios.ts (visual scenario myst/v47-maths-offline-light-900, fixture 89-maths-offline: the sentence with two dollar prices stays plain text and no KaTeX element holds it)
- Criteria: no typeset span holds a price; the dollar signs and the strong spans of the prices are kept; no literal `**` remains.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-006](../../strs/myst/StRS-MDOKFSTUDIO-MYST-006.md): Maths is typeset offline and bad formulas stay readable
<!-- okf:links:end -->
