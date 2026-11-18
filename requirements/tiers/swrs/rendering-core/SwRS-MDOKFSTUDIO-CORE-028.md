---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-028
uuid: 4c0f69e4-6354-4612-a9a5-f586c216bb35
title: 'Body text, headings, lists and block quotes are typeset readably'
description: 'When the preview shows paragraphs, list items, table cells, quotes,
  captions, headings or lists, the extension SHALL use the preview font, the zoomed
  font size and the VS Code Markdown preview line height for the body text, and typeset
  headings, list spacing, block quotes and the end of the document by the rules of
  the scenarios.'
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
- StRS-MDOKFSTUDIO-CORE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.ts
- src/core/preview/styles/contentLayoutStyles.ts
tested_in_files:
- test/core/preview/creamTheme.test.ts
- test/core/preview/previewStyles.test.ts
- test/core/render/renderReq.renderingCore.requirements.test.ts
- test/visual/capture_page_checks.py
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CODE-038
- SwRS-MDOKFSTUDIO-CORE-029
- SwRS-MDOKFSTUDIO-CORE-030
- SwRS-MDOKFSTUDIO-CORE-031
- SwRS-MDOKFSTUDIO-CORE-032
- SwRS-MDOKFSTUDIO-CORE-033
- SwRS-MDOKFSTUDIO-CORE-037
---

## Body text, headings, lists and block quotes are typeset readably

### Normative behavior

When the preview shows paragraphs, list items, table cells, quotes, captions, headings or lists, the extension SHALL use the preview font, the zoomed font size and the VS Code Markdown preview line height for the body text, and typeset headings, list spacing, block quotes and the end of the document by the rules of the scenarios.

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

### Scenario (nominal): Block quote tint
- GIVEN a block quote in the Cream theme, in another forced theme or in the host theme
- WHEN it is shown
- THEN it keeps its left rule and takes the block quote background token of that theme as its background
- AND in the Cream theme that background is a step darker than the page

### Scenario (boundary): Code blocks do not take the link colour in the forced themes
| Input | Outcome |
| --- | --- |
| cream theme forced, YAML block | its tokens use the Dark+ colours like every language; the link colour no longer applies to code blocks (SwRS-MDOKFSTUDIO-CODE-040) |
| white theme forced, YAML block | its tokens use the Dark+ colours like every language |
| white theme forced, Python block | the Python text does not use the link colour |

### Scenario (boundary): Reach the end of the document
- GIVEN a long document scrolled to its end, or a short document
- WHEN the last block is shown
- THEN a bottom padding keeps it at least 30 px above the frame bottom

### Verification notes
- Method: test/core/preview/previewStyles.test.ts, tests "typography is driven by VS Code markdown preview variables" (body text), "the top heading keeps the stock preview rule underneath it" (headings), "overflowing content tables keep short cells whole and show scroll shadows" and the absence of a YAML rule on the code element (the Dark+ token colours apply)
- Method: test/core/preview/previewStyles.test.ts, test "a block quote is tinted with the theme block quote background" (block quote tint)
- Method: test/core/render/renderReq.renderingCore.requirements.test.ts, test "the content stylesheet tightens list paragraphs and indents every list level by 2em" (list spacing)
- Method: test/core/preview/creamTheme.test.ts, test "cream mirrors the white-mode code colouring" (no YAML override)
- Method: visual scenarios theme-zoom/v04, v05 and v07 in test/visual/capture_page_checks.py (check_frontmatter_rendering, check_forced_cream_theme) (no link colour on code blocks in the forced themes)
- Method: visual scenario handbook-dark-bottom in test/visual/scenarioDefinitions1.ts (reach the end of the document)
- Criteria: Computed styles of body text, headings, list margins and indent match the values above; the last block bottom is at least 30 px from the frame bottom. Fenced blocks in the forced modes are specified in SwRS-MDOKFSTUDIO-CODE-007.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-001](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-001.md): A reader reads highlighted, numbered and diff code
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
- Supersedes:
  - [SwRS-MDOKFSTUDIO-CODE-038](../code-blocks/SwRS-MDOKFSTUDIO-CODE-038.md): Colour YAML code text with the link colour in the forced white and cream themes
  - [SwRS-MDOKFSTUDIO-CORE-029](SwRS-MDOKFSTUDIO-CORE-029.md): Style headings
  - [SwRS-MDOKFSTUDIO-CORE-030](SwRS-MDOKFSTUDIO-CORE-030.md): Tighten list spacing
  - [SwRS-MDOKFSTUDIO-CORE-031](SwRS-MDOKFSTUDIO-CORE-031.md): Style inline code as a pill
  - [SwRS-MDOKFSTUDIO-CORE-032](SwRS-MDOKFSTUDIO-CORE-032.md): Keep inline code readable inside links
  - [SwRS-MDOKFSTUDIO-CORE-033](SwRS-MDOKFSTUDIO-CORE-033.md): Keep inline code compact in tables
  - [SwRS-MDOKFSTUDIO-CORE-037](SwRS-MDOKFSTUDIO-CORE-037.md): Reach the end of the document
<!-- okf:links:end -->
