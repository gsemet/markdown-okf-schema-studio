---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-034
uuid: 1fe02d1c-773a-4ec9-9067-767cfdd7228b
title: Long words, URLs, identifiers and CJK text wrap in the column
description: When a word, a URL, an inline code identifier or a Japanese,
  Chinese or Korean paragraph is longer than the available width, the extension
  SHALL wrap it inside the column or pane at 900 px and 460 px, without
  horizontal overflow of the page.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.ts
- src/core/preview/styles/contentLayoutStyles.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/core/render/renderReq.renderingCore.requirements.test.ts
---

## Long words, URLs, identifiers and CJK text wrap in the column

### Normative behavior

When a word, a URL, an inline code identifier or a Japanese, Chinese or Korean paragraph is longer than the available width, the extension SHALL wrap it inside the column or pane at 900 px and 460 px, without horizontal overflow of the page.

### Scenario (nominal): Words, URLs and identifiers
| Input | Outcome |
| --- | --- |
| a 120-character word with no break opportunity at 900 px | wraps inside the column |
| the same word at 460 px | wraps inside the column |
| a paragraph holding a 200-character URL link | wraps inside the column |
| the pane narrowed to 460 px with that URL | the page has no horizontal overflow |
| a long identifier in inline code that exceeds the available width at 460 px | wraps inside the viewport |

### Scenario (nominal): CJK text
| Input | Outcome |
| --- | --- |
| a Japanese paragraph at 900 px | wraps inside the pane |
| a Korean paragraph at 460 px | wraps inside the pane and no horizontal scrolling appears |

### Scenario (boundary): Identifier as wide as the viewport
- GIVEN an inline code identifier exactly as wide as the viewport
- WHEN it is shown
- THEN it neither overflows nor wraps needlessly

### Verification notes
- Method: test/core/preview/previewStyles.test.ts, test "K1: long words and bare URLs wrap inside text blocks, links and table cells" (words, URLs, identifiers, identifier as wide as the viewport)
- Method: test/core/render/renderReq.renderingCore.requirements.test.ts, test "the content stylesheet lets paragraphs, including CJK text, wrap inside the pane" (CJK text)
- Criteria: No horizontal overflow from a long word, URL or identifier at 460 px; CJK paragraphs stay within the pane width; links are covered by the wrap rule.
