---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-028
uuid: 4c0f69e4-6354-4612-a9a5-f586c216bb35
title: Body text, headings, lists and inline code are typeset readably
description: When the preview shows paragraphs, list items, table cells, quotes,
  captions, headings, lists or inline code, the extension SHALL use the preview
  font, the zoomed font size and the VS Code Markdown preview line height for
  the body text, and typeset headings, list spacing, inline code and the end of
  the document by the rules of the scenarios.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
- StRS-MDOKFSTUDIO-CORE-001
- StRS-MDOKFSTUDIO-THEME-002
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.ts
- src/core/preview/styles/contentLayoutStyles.ts
tested_in_files:
- test/core/preview/creamTheme.test.ts
- test/core/preview/inlineCode.test.ts
- test/core/preview/previewStyles.test.ts
- test/core/render/renderReq.renderingCore.requirements.test.ts
- test/visual/capture_page_checks.py
- test/visual/scenarioDefinitions1.ts
---

## Body text, headings, lists and inline code are typeset readably

### Normative behavior

When the preview shows paragraphs, list items, table cells, quotes, captions, headings, lists or inline code, the extension SHALL use the preview font, the zoomed font size and the VS Code Markdown preview line height for the body text, and typeset headings, list spacing, inline code and the end of the document by the rules of the scenarios.

### Scenario (nominal): Body text
- GIVEN a zoom of 120 percent
- WHEN a paragraph is shown
- THEN its font size is the zoomed size and its line height the Markdown preview value
- AND a table cell shown in the same page uses the same font and line height

### Scenario (nominal): Headings
| Input | Outcome |
| --- | --- |
| any heading | weight 600 |
| h1 | 2em, with a bottom rule |
| h2 | 1.5em, with a bottom rule |
| h3 | 1.25em |
| h4 | 1em |
| a top-level heading after a floating figure | starts below the figure |

### Scenario (nominal): List spacing
- GIVEN a loose list
- WHEN it is shown
- THEN paragraph margins inside items are reduced
- AND a nested list indents each level by 2em

### Scenario (nominal): Inline code pill
- GIVEN inline code in a paragraph
- WHEN it is shown
- THEN it has a tint and a hairline derived from the text colour, a 4 px radius and a size of 0.875em, scaled inside headings
- AND inline code that wraps over two lines is padded on each line and the line height is unchanged

### Scenario (nominal): Block quote tint
- GIVEN a block quote in the Cream theme, in another forced theme or in the host theme
- WHEN it is shown
- THEN it keeps its left rule and takes the block quote background token of that theme as its background
- AND in the Cream theme that background is a step darker than the page

### Scenario (boundary): Inline code in links and tables
| Input | Outcome |
| --- | --- |
| inline code inside a link | the link colour |
| inline code inside a link in the forced white or cream theme | the link colour on a translucent tint with a contrast of at least 4.5:1 |
| a short identifier in inline code in a sideways-scrolling table | stays on one line, not split |
| inline code in a table cell | compact padding |

### Scenario (boundary): Link colour in the forced white and cream themes
| Input | Outcome |
| --- | --- |
| properties fixture forced to Cream (visual scenario theme-zoom/v05), inline code after the properties table | text is rgb(161, 78, 50) |
| code and tables fixture forced to Cream (visual scenario theme-zoom/v04), inline code | text is rgb(161, 78, 50) on a translucent tint of the same clay colour |
| properties fixture forced to White (visual scenario theme-zoom/v07), inline code after the properties table | text is rgb(0, 106, 177), the link blue of White |
| cream theme forced, YAML block | its tokens use the Dark+ colours like every language; the link colour no longer applies to code blocks (SwRS-MDOKFSTUDIO-CODE-040) |
| white theme forced, YAML block | its tokens use the Dark+ colours like every language |
| white theme forced, Python block | the Python text does not use the link colour |

### Scenario (boundary): Reach the end of the document
- GIVEN a long document scrolled to its end, or a short document
- WHEN the last block is shown
- THEN a bottom padding keeps it at least 30 px above the frame bottom

### Verification notes
- Method: test/core/preview/previewStyles.test.ts, tests "typography is driven by VS Code markdown preview variables" (body text), "the top heading keeps the stock preview rule underneath it" (headings), "overflowing content tables keep short cells whole and show scroll shadows" (inline code in tables) and the absence of a YAML rule on the code element (the Dark+ token colours apply)
- Method: test/core/preview/previewStyles.test.ts, test "a block quote is tinted with the theme block quote background" (block quote tint)
- Method: test/core/render/renderReq.renderingCore.requirements.test.ts, test "the content stylesheet tightens list paragraphs and indents every list level by 2em" (list spacing)
- Method: test/core/preview/inlineCode.test.ts, tests "inline code is a subtle tinted pill derived from the text colour" (inline code pill), "inline code text keeps 4.5:1 on the tinted background in every forced mode" (links), "inline code stays compact in table cells" (tables)
- Method: test/core/preview/creamTheme.test.ts, test "cream mirrors the white-mode code colouring" (link colour of inline code in the forced themes, no YAML override)
- Method: visual scenarios theme-zoom/v04, v05 and v07 in test/visual/capture_page_checks.py (check_frontmatter_rendering, check_forced_cream_theme) (link colour in the forced themes)
- Method: visual scenario handbook-dark-bottom in test/visual/scenarioDefinitions1.ts (reach the end of the document)
- Criteria: Computed styles of body text, headings, list margins and indent and inline code match the values above; the last block bottom is at least 30 px from the frame bottom. Fenced blocks in the forced modes are specified in SwRS-MDOKFSTUDIO-CODE-007.
