---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-089
uuid: 106a957a-98bf-43a0-9ddc-1b4f0fecf381
title: Inline code is a readable tinted pill in text, links, tables and forced
  themes
description: When the preview shows inline code, the extension SHALL typeset it
  as a tinted pill derived from the text colour, compact in table cells and
  readable with a contrast of at least 4.5:1 in links and in the forced themes.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
- StRS-MDOKFSTUDIO-CORE-001
scenarios:
- id: S1
  title: Inline code pill
- id: S2
  title: Inline code in links and tables
- id: S3
  title: Link colour of inline code in the forced white and cream themes
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.markers.ts
tested_in_files:
- test/core/preview/inlineCode.test.ts
default_owner_email: gaetan@xeberon.net
---

## Inline code is a readable tinted pill in text, links, tables and forced themes

### Normative behavior

When the preview shows inline code, the extension SHALL typeset it as a tinted pill derived from the text colour, compact in table cells and readable with a contrast of at least 4.5:1 in links and in the forced themes.

### Scenario S1 (nominal): Inline code pill
- GIVEN inline code in a paragraph
- WHEN it is shown
- THEN it has a tint and a hairline derived from the text colour, a 4 px radius and a size of 0.875em, scaled inside headings
- AND inline code that wraps over two lines is padded on each line and the line height is unchanged

### Scenario S2 (boundary): Inline code in links and tables
| Input | Outcome |
| --- | --- |
| inline code inside a link | the link colour |
| inline code inside a link in the forced white or cream theme | the link colour on a translucent tint with a contrast of at least 4.5:1 |
| a short identifier in inline code in a sideways-scrolling table | stays on one line, not split |
| inline code in a table cell | compact padding |

### Scenario S3 (boundary): Link colour of inline code in the forced white and cream themes
| Input | Outcome |
| --- | --- |
| properties fixture forced to Cream (visual scenario theme-zoom/v05), inline code after the properties table | text is rgb(161, 78, 50) |
| code and tables fixture forced to Cream (visual scenario theme-zoom/v04), inline code | text is rgb(161, 78, 50) on a translucent tint of the same clay colour |
| properties fixture forced to White (visual scenario theme-zoom/v07), inline code after the properties table | text is rgb(0, 106, 177), the link blue of White |

### Verification notes

- Method: test/core/preview/inlineCode.test.ts, tests "inline code is a subtle tinted pill derived from the text colour" (pill), "inline code text keeps 4.5:1 on the tinted background in every forced mode" (links), "inline code stays compact in table cells" (tables)
- Method: test/core/preview/previewStyles.test.ts, test "overflowing content tables keep short cells whole and show scroll shadows" (inline code in tables)
- Method: visual scenarios theme-zoom/v04, v05 and v07 in test/visual/capture_page_checks.py (check_frontmatter_rendering, check_forced_cream_theme) (link colour in the forced themes)
- Criteria: The computed style of inline code matches the values above, in text, in links, in table cells and in the forced themes.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-001](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-001.md): A reader reads highlighted, numbered and diff code
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
<!-- okf:links:end -->
