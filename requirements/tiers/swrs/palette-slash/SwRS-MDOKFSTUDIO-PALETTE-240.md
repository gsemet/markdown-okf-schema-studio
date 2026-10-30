---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-240
uuid: d0f7fecc-f89f-4d0b-96e9-db76fcd14cd6
title: The slash query ranks matches and leaves loose matches to the text
description: When the writer types a query after the slash, the extension SHALL
  narrow the list at each edit to the commands whose label or alias matches it,
  ignoring case, ranked exact first, then prefix, word start, contained text and
  a tight subsequence of three or more letters that starts at a word start (the
  command of the MyST group first in MyST mode), light the first entry, and
  leave Enter and Tab to the text when the best match is only a loose one and
  the highlight was not moved.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-015
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/slashMenu.ts
tested_in_files:
- test/page/modules/slashMenu.test.ts
default_owner_email: gaetan@xeberon.net
---

## The slash query ranks matches and leaves loose matches to the text

### Normative behavior

When the writer types a query after the slash, the extension SHALL narrow the list at each edit to the commands whose label or alias matches it, ignoring case, ranked exact first, then prefix, word start, contained text and a tight subsequence of three or more letters that starts at a word start (the command of the MyST group first in MyST mode), light the first entry, and leave Enter and Tab to the text when the best match is only a loose one and the highlight was not moved.

### Scenario (nominal): Ranking
- GIVEN the entries Zebra Alpha, Alpine and Other with the alias alp
- WHEN alp is typed
- THEN the order is Other, Alpine, Zebra Alpha

| Match of the query on the label or an alias | Rank |
| --- | --- |
| exact (an exact label scores 1010, an exact alias 1000, because a label gets 10 more than an alias) | first |
| prefix | after exact |
| start of a later word | after prefix |
| contained text | after word start |
| tight subsequence of three or more letters that starts at a word start | last |
| ties | keep the order of the palette |

### Scenario (boundary): Scattered letters and short queries
- GIVEN the entry Horizontal rule
- WHEN hz is typed
- THEN nothing matches

| Query | Outcome |
| --- | --- |
| one or two letters that are not a prefix, a word start or contained text (hz) | nothing matches; a query of one or two letters never matches by subsequence |
| three or more letters packed tightly from a word start (cbl for Code block) | matches by subsequence |

### Scenario (nominal): In MyST mode the MyST command wins a near tie
- GIVEN the MyST mode
- WHEN note is typed, then table is typed
- THEN the MyST admonition Note is listed before the GitHub alert, and the Table command stays first

| Query in MyST mode | Outcome |
| --- | --- |
| three or more letters, score of 1000 or more (exact) | a command of the MyST group gets 5 points before an equivalent command of another group |
| three or more letters, score from 400 to 999 | a command of the MyST group gets 8 points |
| exact label or clearly better prefix of another command (table, tab) | keeps its place |
| one or two letters (/h, and /h1 for Heading) | no bonus; Heading is found first |

### Scenario (nominal): Typing narrows the list and resets the highlight
- GIVEN an open menu with the third entry lit
- WHEN the writer types a letter, then presses Backspace back to the query t
- THEN the list narrows and the first entry is lit, and with the shorter query the full list shows again and the first entry is lit

| Edit | Outcome |
| --- | --- |
| a letter typed after the slash | the list narrows to the matches and the first entry is lit |
| Backspace inside the query | the list is re-read from the text between the slash and the caret, widens and the first entry is lit |

### Scenario (boundary): A loose best match leaves Enter and Tab to the text
- GIVEN the text box with / and the query ori
- WHEN the writer presses Enter, or moves the highlight with an arrow and then presses Enter
- THEN the menu closes and Enter inserts a line break as usual, or the lit command runs

| State | Outcome |
| --- | --- |
| best match with a score below 600 (letters inside a word or scattered letters), highlight not moved | the menu closes; Enter and Tab are left to the text |
| the same, highlight moved with an arrow | the lit command runs |
| best match with a score of 600 or more | Enter and Tab apply the lit command |
| Shift+Enter | always stays text |

### Related requirements
- SwRS-MDOKFSTUDIO-PALETTE-238: which commands the menu lists and how an empty query groups them.
- SwRS-MDOKFSTUDIO-PALETTE-232: when the menu opens.

### Verification notes
- Method: test/page/modules/slashMenu.test.ts, unit tests "P11: ranking puts a prefix before a word start before a subsequence" (ranking, scattered letters), "P11: the empty query groups by category, a query lists best match first with the category" (ranked list), "P11 r2: in MyST the MyST entry ranks before its GFM equivalent; GFM and exact labels are unchanged" (MyST preference, admonition and exact label), "P11 r3: the MyST preference needs 3+ letters: /h and /h1 still find Heading first" (short queries), "P11: the arrows move through the list and wrap; typing filters and resets the highlight" (typing narrows), "P11 r2: the best match being only fuzzy leaves Enter and Tab to the text unless the user moved" (loose best match).
- Method: the wiring of the preferred group in the editors (src/page/features/blockSourceEditor.ts and tableCellEditor.ts) is not asserted by a page test: the slash harness of the unit tests does not pass it.
- Criteria: Ties keep the order of the palette; a query of one or two letters never matches by subsequence. The bonus is 5 points for a score of 1000 or more (an exact label scores 1010 because a label gets 10 more than an alias) and 8 points for a score from 400 to 999, applied only to a query of three or more letters. The input event re-reads the text between the slash and the caret. A score below 600 means letters inside a word or scattered letters; Shift+Enter always stays text.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-015](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-015.md): A writer runs any palette command from an accessible slash menu
<!-- okf:links:end -->
