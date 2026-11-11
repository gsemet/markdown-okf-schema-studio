---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-010
uuid: e79bb467-7fe5-4ea0-8e9b-4f8ab092850a
title: The find bar paints the matches of the rendered text and walks them
description: While the find bar holds a query, the extension SHALL paint every
  match in the rendered text of the page, show the match count, move the current
  match with Enter, Shift+Enter and F3, unfold the folded sections that hold it
  and bring it into view, vertically and inside any box that scrolls sideways.
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: draft
status: draft
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
- src/page/modules/revealInline.ts
tested_in_files:
- test/core/find/findMatches.test.ts
- test/core/preview/previewStyles.test.ts
- test/integration/findInPreview.test.ts
- test/integration/realInput/findWideTable.ts
- test/page/modules/findBar.test.ts
- test/page/modules/findIndex.test.ts
- test/visual/capture_find_checks.py
- test/visual/capture_find_wide_table.py
- test/visual/findWideTableScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## The find bar paints the matches of the rendered text and walks them

### Normative behavior

While the find bar holds a query, the extension SHALL paint every match in the rendered text of the page, show the match count, move the current match with Enter, Shift+Enter and F3, unfold the folded sections that hold it and bring it into view, vertically and inside any box that scrolls sideways.

### Scenario (nominal): Matches are painted and walked
- GIVEN a page whose rendered text holds a word four times, in a heading, a paragraph (once inside bold markup), an admonition and a table cell
- WHEN the reader types the word in the find bar
- THEN the four matches are painted, the count reads "1 of 4", Enter shows "2 of 4", Shift+Enter and F3 move back and forward and wrap around at the ends

### Scenario (nominal): A match in a folded section opens it
- GIVEN a folded section that holds the only match
- WHEN the match becomes the current one
- THEN the folded sections that hold it are unfolded and the page scrolls the match to the middle when it is outside the pane

### Scenario (nominal): A hit inside a table scrolled sideways
- GIVEN a wide table scrolled to its last column and a word that exists only in its second column
- WHEN the reader types it and presses Enter
- THEN the table's box scrolls so that the hit text lies inside it with a 16 px margin, and the page does not scroll sideways

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
| A hit already in view horizontally | No sideways scroll |
| A hit wider than its scroll box | The box is aligned on the start of the hit |

### Verification notes

- Method: test/page/modules/findIndex.test.ts (text blocks, white space, mapping a match back to its text nodes, no match across blocks, the limit).
- Method: test/page/modules/findBar.test.ts (count, Enter, Shift+Enter, F3, wrap-around, hidden and folded text, reveal of the folded section, scroll only outside the pane, a hit left or right of a sideways-scrolled table box brought inside it with the margin, no scrollLeft write for a hit already inside, search again after a content update).
- Method: toolbar-navigation/v41-find-hit-in-wide-table-light-393 (test/visual/capture_find_wide_table.py, headless: the hit of a table scrolled to its end lies inside the table's box and the pane, window.scrollX stays 0) and test/integration/realInput/findWideTable.ts (scenario find-wide-table, real VS Code window).
- Method: test/core/preview/previewStyles.test.ts (the match paint reads the theme tokens and has a forced-colours rule).
- Method: test/integration/findInPreview.test.ts, real VS Code window (matches in a table, an admonition and a link; a folded section unfolds; cream and dark shots).
- Criteria: the count and the painted ranges equal the number of matches in the visible and folded rendered text.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-003](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-003.md): The reader finds and replaces text in the preview
<!-- okf:links:end -->
