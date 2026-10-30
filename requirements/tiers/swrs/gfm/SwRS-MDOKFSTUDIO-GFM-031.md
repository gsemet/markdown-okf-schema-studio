---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-031
uuid: 613ef830-cae4-48be-9f33-636d3747085f
title: Raw HTML tables are rebuilt from an allow-list
description: When a document contains a raw HTML table, the extension SHALL
  rebuild it from an allow-list of tags and attributes, rendering its cells with
  rowspan and colspan from 1 to 999, align, scope, simple class names, title and
  a sanitized style subset, and removing script, style, iframe, svg, form, embed
  and object elements with their content and dropping comments.
project: markdown-okf-schema-studio
scope: gfm
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
- StRS-MDOKFSTUDIO-MYST-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystTables.ts
- src/core/security/html-sanitizer.ts
tested_in_files:
- test/core/render/mystFeatures.test.ts
- test/security/html-policy.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CORE-056
- SwRS-MDOKFSTUDIO-GFM-032
- SwRS-MDOKFSTUDIO-GFM-038
---

## Raw HTML tables are rebuilt from an allow-list

### Normative behavior

When a document contains a raw HTML table, the extension SHALL rebuild it from an allow-list of tags and attributes, rendering its cells with rowspan and colspan from 1 to 999, align, scope, simple class names, title and a sanitized style subset, and removing script, style, iframe, svg, form, embed and object elements with their content and dropping comments.

### Scenario (nominal): Spans preserved

- GIVEN a raw table with colspan=2 and rowspan=2 cells
- WHEN the preview is rendered
- THEN the cells span as written

### Scenario (boundary): Span limits

- GIVEN cells with colspan=999, colspan=1000 and rowspan=0
- WHEN the preview is rendered
- THEN 999 is kept and the out-of-range values 1000 and 0 are not applied

### Scenario (nominal): Safe colours kept

- GIVEN a cell style 'color: red; background-color: #fff' or 'color: hsl(0,0%,0%)'
- WHEN the preview is rendered
- THEN both declarations are kept (the style keeps only text and background colours, text-fill, background-clip text and linear gradients; every colour follows the colour grammar of SwRS-MDOKFSTUDIO-GFM-034, so var(), url(), !important, comments, escapes and names outside the closed list and the keywords currentcolor, inherit, initial and unset are removed; the space form rgb(0 0 0 / 50%) is kept)

### Scenario (refusal): Unsafe style removed

- GIVEN a cell style 'position: fixed; background: url(x)'
- WHEN the preview is rendered
- THEN declarations are removed and a diagnostic is recorded

### Scenario (refusal): Active content removed

| Input | Outcome |
| --- | --- |
| a raw table cell containing a script element and an iframe element with text inside | both are removed with their content |
| a table cell with a script element | the script is dropped |
| style, svg, form, embed or object elements in a cell | removed with their content |

### Scenario (boundary): Unknown tag and comment

- GIVEN a cell with an unknown tag around text and an HTML comment
- WHEN the preview is rendered
- THEN the tag is unwrapped, its text is kept and the comment is dropped

### Verification notes

- Method: test/core/render/mystFeatures.test.ts (spans, span limits, safe colours, unsafe style, active content, unknown tag and comment: unit tests on the render pipeline output, including the unit test "raw HTML tables preserve complex cell spans without active content").
- Criteria: Spans 1 to 999 kept and others refused; only allow-listed tags, attributes and whitelisted style declarations remain; no active element or comment in the output.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-GFM-002](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-002.md): GitHub Flavored Markdown renders as on GitHub, safely
  - [StRS-MDOKFSTUDIO-MYST-001](../../strs/myst/StRS-MDOKFSTUDIO-MYST-001.md): MyST directives and roles render as readable blocks
- Supersedes:
  - [SwRS-MDOKFSTUDIO-CORE-056](../rendering-core/SwRS-MDOKFSTUDIO-CORE-056.md): Rebuild raw HTML tables from an allow-list
  - [SwRS-MDOKFSTUDIO-GFM-032](SwRS-MDOKFSTUDIO-GFM-032.md): Raw table styles keep a sanitized subset
  - [SwRS-MDOKFSTUDIO-GFM-038](SwRS-MDOKFSTUDIO-GFM-038.md): Raw HTML tables remove active content
<!-- okf:links:end -->
