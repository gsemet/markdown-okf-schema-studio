---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-100
uuid: 803b29e3-f910-4903-a7a8-df05b2f245d4
title: A thread follows its quote in the plain text, narrowed by its context
description: When the quote of a review thread is no longer in its old lines but
  occurs in the document at one place, the extension SHALL move the thread to
  the lines of that place.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-008
- StRS-MDOKFSTUDIO-REVIEW-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/comments/anchoring.ts
tested_in_files:
- test/core/comments/anchoring.test.ts
default_owner_email: gaetan@xeberon.net
---

## A thread follows its quote in the plain text, narrowed by its context

### Normative behavior

When the quote of a review thread is no longer in its old lines but occurs in the document at one place, the extension SHALL move the thread to the lines of that place.

### Scenario (nominal): A thread follows its quote to the line where it moved

- GIVEN a thread on line 3 and lines inserted above, so that the quote is now on line 9
- WHEN the thread is checked
- THEN the thread moves to line 9

### Scenario (nominal): Unchanged threads are kept

- GIVEN a list of threads of which one moved, one is orphaned and one is in place
- WHEN the threads are checked
- THEN only the moved thread gets new lines and no thread is lost

### Scenario (nominal): Several copies are narrowed by the prefix and suffix of the thread

- GIVEN two copies of "fix the login flow" and a thread with prefix "Do not " and suffix " today."
- WHEN the thread is checked
- THEN the thread moves to the copy with that surrounding
- AND a second thread with prefix "Please " and suffix " soon." moves to the other copy

### Scenario (boundary): Without usable context only the nearest copy within 50 lines counts

When several copies remain and the surroundings do not decide, the thread moves to the nearest copy only if it lies within 50 lines (WINDOW_LINES) of the old lines and is strictly nearer than the next copy.

| Input | Outcome |
| --- | --- |
| a thread on line 205 and copies on lines 11 and 212 | the thread moves to line 212 |
| copies only outside the window | the thread is orphaned |
| two copies at the same distance | the thread is orphaned |

### Scenario (boundary): Distance allowed for a short and for a long quote

| Input | Outcome |
| --- | --- |
| a thread on line 3 quoting Fox (fewer than 12 characters, MIN_FAR_QUOTE) and a copy 20 lines further | the thread moves there |
| the same short quote only 200 lines further | the thread is orphaned |
| a thread on line 4 and a long quote (at least 12 characters) occurring exactly once, now on line 301 | the thread moves to line 301, however far it is |
| a long quote occurring twice, far from the old lines | the thread is orphaned |

### Scenario (nominal): The quote is searched in the plain text of the document

The searched text has block markers, link targets, emphasis marks, table pipes and rules, HTML tags and comments and footnote markers removed, entities decoded and whitespace collapsed. A MyST role is read as the text it renders: the content of a role such as {kbd}`Ctrl`, and nothing for a role that renders a label the source does not hold, such as {cite} and {ref} without text.

| Input | Outcome |
| --- | --- |
| a list item "see **the quick** brown [fox](https://example.com) now" and the quote "the quick brown fox now" | the thread is found on that line |
| a line "Tom &amp; Jerry went home. `<!-- TODO fix -->`" and the quote "Tom & Jerry went home." | the thread stays on that line |
| the source "Press {kbd}`Ctrl` to continue." and the quote "Press Ctrl to continue." | the thread stays anchored |
| the source "As shown in {cite}`smith2020` the result holds." and the quote "As shown in Smith, 2020 the result holds." | the thread stays anchored at its original line |

### Scenario (refusal): Code fences and front matter are never searched

- GIVEN a quote that occurs only in a fenced code block and in the front matter
- WHEN the thread is checked
- THEN the thread is orphaned
- AND when the quote also occurs in a paragraph, the thread is found in the paragraph

### Scenario (boundary): A quote spanning several lines, also in a CRLF document

| Input | Outcome |
| --- | --- |
| the quote "brown fox jumps over the lazy" over lines 3 to 5 | the thread moves to lines 3 to 5 |
| the same document with CRLF line ends | the result is the same |

### Verification notes

- Method: test/core/comments/anchoring.test.ts, `T45: lines inserted above move the thread to the new line` (moved line), `T45: reanchorThreads updates moved threads, keeps orphans untouched and loses nothing` (unchanged threads), `T45: duplicate quotes are decided by prefix and suffix` (context), `T45: duplicate quotes without usable context use proximity only inside the window` (nearest copy; also the several-copies case of the long quote), `T45: a short quote is only found inside the +-50 line window` and `T45: a long unique quote that moved far away is found` (short and long quote), `T45: markdown markup does not hide the quote` and `T45r2: text that renders differently from its source stays anchored at the original line` (plain text and roles), `T45: text inside code fences and front matter is never a match` (fences; an unclosed front matter is treated as ordinary text and is untested), `T45: a quote that spans lines is found, and CRLF documents work` (multi-line, CRLF).
- Criteria: The moved thread has the new lines and the others keep their identity; each thread lands on the line of the copy that matches its context; WINDOW_LINES = 50, MIN_FAR_QUOTE = 12 and a strict distance gap decide the move; the rendered quote matches the plain text of the source line; matches inside fences and a closed front matter are not candidates; the moved lines are 3 to 5 and a thread already on them is anchored.
