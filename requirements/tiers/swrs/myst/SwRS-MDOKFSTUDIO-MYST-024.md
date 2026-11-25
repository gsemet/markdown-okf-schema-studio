---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-024
uuid: f1610295-fdd2-4a96-82c2-db8472ab9c8d
title: Maths is typeset offline by KaTeX and bad formulas stay readable
description: When a document holds `$...$`, `$$...$$`, the `{math}` role or
  directive, or an align-style environment inside `$$` or `{math}`, the
  extension SHALL typeset it as maths with KaTeX from the extension bundle
  without network or inline styles, keep a formula that cannot be parsed
  readable, refuse active content, and scroll a long display equation inside its
  own box.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-006
depends_on: []
scenarios:
- id: S1
  title: Inline maths is typeset in the text line
- id: S2
  title: Display maths is typeset in its own block
- id: S3
  title: Maths typesets offline without inline styles
- id: S4
  title: A style declaration that could leave its rule
- id: S5
  title: The KaTeX bundle is missing
- id: S6
  title: Unparsable formulas stay readable
- id: S7
  title: Maths cannot run active content
- id: S8
  title: Sphinx-style math delimiters are typeset
- id: S9
  title: Long display equations scroll inside their box
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- scripts/page-bundle.mjs
- src/core/render/mathRenderer.ts
tested_in_files:
- test/build/bundleSplit.test.ts
- test/core/render/contentCaches.test.ts
- test/core/render/mathRenderer.test.ts
- test/core/render/mystPaletteRendering.test.ts
- test/visual/mathScenarios.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-MYST-025
- SwRS-MDOKFSTUDIO-MYST-026
- SwRS-MDOKFSTUDIO-MYST-027
- SwRS-MDOKFSTUDIO-MYST-028
- SwRS-MDOKFSTUDIO-MYST-029
---

## Maths is typeset offline by KaTeX and bad formulas stay readable

### Normative behavior

When a document holds `$...$`, `$$...$$`, the `{math}` role or directive, or an align-style environment inside `$$` or `{math}`, the extension SHALL typeset it as maths with KaTeX from the extension bundle without network or inline styles, keep a formula that cannot be parsed readable, refuse active content, and scroll a long display equation inside its own box.

### Scenario S1 (nominal): Inline maths is typeset in the text line

- GIVEN `$x^2$` and `$a + b$` in a sentence
- WHEN the preview renders
- THEN both inline math spans sit in the text line

### Scenario S2 (boundary): Display maths is typeset in its own block

- GIVEN `$$ ... $$` and a `\begin{align}` block
- WHEN the preview renders
- THEN display math is typeset in its own block

### Scenario S3 (nominal): Maths typesets offline without inline styles

- GIVEN a document with display math
- WHEN the preview renders offline
- THEN the equation is typeset with the KaTeX stylesheet and fonts of the extension bundle, with no script, no network request and no inline style attribute, the styles being classes in one nonce-protected style block

### Scenario S4 (refusal): A style declaration that could leave its rule

- GIVEN typeset maths whose style value holds a declaration with a brace, an angle bracket, an at sign or a backslash
- WHEN the nonce style block is built
- THEN that declaration is dropped and the other declarations stay

### Scenario S5 (refusal): The KaTeX bundle is missing

- GIVEN the KaTeX bundle is missing
- WHEN the preview renders
- THEN equations stay as raw TeX text

### Scenario S6 (refusal): Unparsable formulas stay readable

- GIVEN a document with one invalid and one valid formula, or with only an invalid formula
- WHEN the preview renders
- THEN the outcomes of the table hold

| Document | Outcome |
| --- | --- |
| one invalid and one valid formula | the invalid one keeps its raw TeX with a wavy underline and the tooltip This equation could not be rendered by KaTeX, and the valid one is typeset |
| only an invalid formula | the same raw TeX with underline and tooltip, and no warning is listed in the status region or Problems view |

### Scenario S7 (refusal): Maths cannot run active content

- GIVEN a formula that uses `\href`, `\htmlStyle`, another trusted command, or a runaway macro
- WHEN the preview renders
- THEN the outcomes of the table hold

| Formula | Outcome |
| --- | --- |
| `\href{...}{x}` | error text is shown and no link exists |
| `\htmlStyle` | no style is applied |
| runaway macro | expansion stays within 1000 (maxExpand) and size within 100 (maxSize); trust is off |

### Scenario S8 (boundary): Sphinx-style math delimiters are typeset

- GIVEN a math span `\(x^2\)` and a math block `\[...\]`, then plain text with `$...$` outside math nodes, code, and a second typesetting pass
- WHEN the preview renders
- THEN both delimiters are typeset, the text with `$...$` outside math nodes and the code are unchanged, and the second pass changes nothing

### Scenario S9 (boundary): Long display equations scroll inside their box

- GIVEN a very long display equation wider than the pane, and the long chapter scrolled to its display equation
- WHEN the preview renders and the scroll lands
- THEN the equation box has overflow-x auto, the page has no horizontal overflow and the equation block stays in the frame

### Related requirements

- SwRS-MDOKFSTUDIO-MYST-102: dollar prices stay text and keep their emphasis

### Verification notes

- Method: test/core/render/mystPaletteRendering.test.ts (inline and display maths: "inline, display and aligned math from the palette typeset with KaTeX")
- Method: test/core/render/mathRenderer.test.ts (offline: "typesets inline and display math with local assets and CSP-compatible styles"; missing bundle: "when the KaTeX bundle is missing, equations stay as their raw TeX text"; unparsable formulas: "invalid LaTeX stays readable without breaking valid equations"; active content: "math cannot inject trusted HTML commands or external links"; Sphinx delimiters: "supports Sphinx math delimiters and leaves ordinary text and code alone")
- Method: test/visual/scenarioDefinitions1.ts (long display equations: visual scenario chapter-dark-half)
- Method: test/visual/mathScenarios.ts (offline typesetting of an inline and a display formula, and an unparsable formula kept as its source: visual scenario myst/v47-maths-offline-light-900)
- Criteria: Typesetting runs on the host-rendered page and makes no external request; failure is local to the formula; trust is off and the bounds maxExpand 1000 and maxSize 100 are set; typesetting is idempotent; overflow is local.
- Internal (cache): a valid formula and one KaTeX rejects, typeset in an earlier render, give the same markup without a new KaTeX run, the rejected one keeps its wavy underline and tooltip, and the memory kept for this is bounded (2000 formulas, about 2 million characters): test/core/render/contentCaches.test.ts.
- Internal (bundle): KaTeX is a separate file, `lazy/katex.js`, read on the first equation; a document without an equation does not load it and `extension.js` holds no KaTeX code: test/build/bundleSplit.test.ts (the split bundle typesets an equation).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-006](../../strs/myst/StRS-MDOKFSTUDIO-MYST-006.md): Maths is typeset offline and bad formulas stay readable
- Supersedes:
  - [SwRS-MDOKFSTUDIO-MYST-025](SwRS-MDOKFSTUDIO-MYST-025.md): Maths typesets offline without inline styles
  - [SwRS-MDOKFSTUDIO-MYST-026](SwRS-MDOKFSTUDIO-MYST-026.md): Unparsable formulas stay readable
  - [SwRS-MDOKFSTUDIO-MYST-027](SwRS-MDOKFSTUDIO-MYST-027.md): Maths cannot run active content
  - [SwRS-MDOKFSTUDIO-MYST-028](SwRS-MDOKFSTUDIO-MYST-028.md): Sphinx-style math delimiters are typeset
  - [SwRS-MDOKFSTUDIO-MYST-029](SwRS-MDOKFSTUDIO-MYST-029.md): Long display equations scroll inside their box
<!-- okf:links:end -->
