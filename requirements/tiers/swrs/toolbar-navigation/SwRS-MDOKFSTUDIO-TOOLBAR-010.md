---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-010
uuid: e79bb467-7fe5-4ea0-8e9b-4f8ab092850a
title: The find bar paints the matches of the rendered text and walks them
description: While the find bar holds a query, the extension SHALL paint every
  match in the rendered text of the page, show the match count, move the current
  match with Enter, Shift+Enter and F3 and unfold the folded sections that hold
  it.
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/find/findMatches.ts
- src/page/features/contentPatch.ts
- src/page/modules/findBar.ts
tested_in_files:
- test/core/find/findMatches.test.ts
- test/core/preview/previewStyles.test.ts
- test/integration/findInPreview.test.ts
- test/page/modules/findBar.test.ts
- test/page/modules/findIndex.test.ts
- test/visual/capture_find_checks.py
default_owner_email: gaetan@xeberon.net
---

## The find bar paints the matches of the rendered text and walks them

### Normative behavior

While the find bar holds a query, the extension SHALL paint every match in the rendered text of the page, show the match count, move the current match with Enter, Shift+Enter and F3 and unfold the folded sections that hold it.

### Scenario (nominal): Matches are painted and walked
- GIVEN a page whose rendered text holds a word four times, in a heading, a paragraph (once inside bold markup), an admonition and a table cell
- WHEN the reader types the word in the find bar
- THEN the four matches are painted, the count reads "1 of 4", Enter shows "2 of 4", Shift+Enter and F3 move back and forward and wrap around at the ends

### Scenario (nominal): A match in a folded section opens it
- GIVEN a folded section that holds the only match
- WHEN the match becomes the current one
- THEN the folded sections that hold it are unfolded and the page scrolls the match to the middle when it is outside the pane

### Scenario (boundary): What is searched
| Input | Outcome |
| --- | --- |
| Text of a hidden element, a button, a field, a formula's MathML copy, a comment chip | Not searched |
| Text inside a folded section (hidden until found) | Searched |
| A match across inline markup ("Pre" and bold "view") | One match |
| A line break or runs of spaces in a paragraph | One space for the query; code keeps its own |
| A match across two blocks (two paragraphs, two table cells) | Not a match |
| More than 10000 matches | The first 10000 are kept and the count reads "10000+" |
| The content is updated (an edit, a refresh) | The search runs again on the new content and keeps the current index |

### Verification notes

- Method: test/page/modules/findIndex.test.ts (text blocks, white space, mapping a match back to its text nodes, no match across blocks, the limit).
- Method: test/page/modules/findBar.test.ts (count, Enter, Shift+Enter, F3, wrap-around, hidden and folded text, reveal of the folded section, scroll only outside the pane, search again after a content update).
- Method: test/core/preview/previewStyles.test.ts (the match paint reads the theme tokens and has a forced-colours rule).
- Method: test/integration/findInPreview.test.ts, real VS Code window (matches in a table, an admonition and a link; a folded section unfolds; cream and dark shots).
- Criteria: the count and the painted ranges equal the number of matches in the visible and folded rendered text.
