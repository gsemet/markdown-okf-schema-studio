---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-024
uuid: f1610295-fdd2-4a96-82c2-db8472ab9c8d
title: Maths is typeset offline by KaTeX and bad formulas stay readable
description: When a document holds `$...$`, `$$...$$`, the `{math}` role or
  directive, or an align-style environment inside `$$` or `{math}`, the
  extension SHALL typeset it as maths with KaTeX from the extension bundle
  without network or inline styles, keep a formula that cannot be parsed
  readable, refuse active content, preserve dollar prices as text without
  breaking surrounding emphasis, and scroll a long display equation inside its
  own box.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-006
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mathRenderer.ts
- src/core/render/mystInlineTransforms.ts
tested_in_files:
- test/core/render/contentCaches.test.ts
- test/core/render/mathRenderer.test.ts
- test/core/render/mystPaletteRendering.test.ts
- test/visual/scenarioDefinitions1.ts
- test/visual/scenarioDefinitions2.ts
---

## Maths is typeset offline by KaTeX and bad formulas stay readable

### Normative behavior

When a document holds `$...$`, `$$...$$`, the `{math}` role or directive, or an align-style environment inside `$$` or `{math}`, the extension SHALL typeset it as maths with KaTeX from the extension bundle without network or inline styles, keep a formula that cannot be parsed readable, refuse active content, and scroll a long display equation inside its own box.

### Scenario (nominal): Inline maths is typeset in the text line

- GIVEN `$x^2$` and `$a + b$` in a sentence
- WHEN the preview renders
- THEN both inline math spans sit in the text line

### Scenario (boundary): Display maths is typeset in its own block

- GIVEN `$$ ... $$` and a `\begin{align}` block
- WHEN the preview renders
- THEN display math is typeset in its own block

### Scenario (nominal): Maths typesets offline without inline styles

- GIVEN a document with display math
- WHEN the preview renders offline
- THEN the equation is typeset with the KaTeX stylesheet and fonts of the extension bundle, with no script, no network request and no inline style attribute, the styles being classes in one nonce-protected style block

### Scenario (refusal): A style declaration that could leave its rule

- GIVEN typeset maths whose style value holds a declaration with a brace, an angle bracket, an at sign or a backslash
- WHEN the nonce style block is built
- THEN that declaration is dropped and the other declarations stay

### Scenario (refusal): The KaTeX bundle is missing

- GIVEN the KaTeX bundle is missing
- WHEN the preview renders
- THEN equations stay as raw TeX text

### Scenario (refusal): Unparsable formulas stay readable

- GIVEN a document with one invalid and one valid formula, or with only an invalid formula
- WHEN the preview renders
- THEN the outcomes of the table hold

| Document | Outcome |
| --- | --- |
| one invalid and one valid formula | the invalid one keeps its raw TeX with a wavy underline and the tooltip This equation could not be rendered by KaTeX, and the valid one is typeset |
| only an invalid formula | the same raw TeX with underline and tooltip, and no warning is listed in the status region or Problems view |

### Scenario (refusal): Maths cannot run active content

- GIVEN a formula that uses `\href`, `\htmlStyle`, another trusted command, or a runaway macro
- WHEN the preview renders
- THEN the outcomes of the table hold

| Formula | Outcome |
| --- | --- |
| `\href{...}{x}` | error text is shown and no link exists |
| `\htmlStyle` | no style is applied |
| runaway macro | expansion stays within 1000 (maxExpand) and size within 100 (maxSize); trust is off |

### Scenario (boundary): Sphinx-style math delimiters are typeset

- GIVEN a math span `\(x^2\)` and a math block `\[...\]`, then plain text with `$...$` outside math nodes, code, and a second typesetting pass
- WHEN the preview renders
- THEN both delimiters are typeset, the text with `$...$` outside math nodes and the code are unchanged, and the second pass changes nothing

### Scenario (boundary): Long display equations scroll inside their box

- GIVEN a very long display equation wider than the pane, and the long chapter scrolled to its display equation
- WHEN the preview renders and the scroll lands
- THEN the equation box has overflow-x auto, the page has no horizontal overflow and the equation block stays in the frame

### Scenario (boundary): Dollar amounts in a sentence stay text

- GIVEN sentences with `$19 base subscription ... ($200)`, `$5 and $6` and `$100–$380`, and a real `$x$` span
- WHEN the preview renders
- THEN each price sentence stays text with its dollar signs and holds no typeset span, and only the real span is typeset as maths, following the Sphinx rule that an opening `$` is not followed by whitespace and a closing `$` neither follows whitespace nor precedes a digit

### Scenario (boundary): Bold dollar prices preserve emphasis

- GIVEN `**$671** cache reads + **$402** 5-min cache writes + **$85** 1-h cache writes + **$216** output`
- WHEN the preview renders
- THEN the four prices are text inside four strong spans, the dollar signs are retained, and no literal `**` markers appear

### Scenario (boundary): A formula that did not change is not typeset again

- GIVEN a valid formula and one KaTeX rejects, both typeset in an earlier render
- WHEN the preview renders the document again
- THEN both give the same markup without a new KaTeX run, the rejected one keeps its wavy underline and tooltip, and the memory kept for this is bounded (2000 formulas, about 2 million characters)

### Verification notes

- Method: test/core/render/mystPaletteRendering.test.ts (inline and display maths: "inline, display and aligned math from the palette typeset with KaTeX")
- Method: test/core/render/mathRenderer.test.ts (offline and missing bundle: "typesets inline and display math with local assets and CSP-compatible styles"; unparsable formulas: "invalid LaTeX stays readable without breaking valid equations"; active content: "math cannot inject trusted HTML commands or external links"; Sphinx delimiters: "supports Sphinx math delimiters and leaves ordinary text and code alone")
- Method: test/core/render/mathRenderer.test.ts (dollar amounts: "dollar amounts stay text while a real dollar span is maths"; emphasis: "bold dollar prices do not consume the surrounding emphasis markers")
- Method: test/visual/scenarioDefinitions2.ts (dollar amounts: visual scenarios myst/v35 and myst/v36, fixture 55-dollar-prices, with three real math spans and four bold prices)
- Method: test/visual/scenarioDefinitions1.ts (long display equations: visual scenario chapter-dark-half)
- Method: test/core/render/contentCaches.test.ts (a formula and a rejected formula run KaTeX once across two renders)
- Criteria: Typesetting runs on the host-rendered page and makes no external request; failure is local to the formula; trust is off and the bounds maxExpand 1000 and maxSize 100 are set; typesetting is idempotent; overflow is local.
