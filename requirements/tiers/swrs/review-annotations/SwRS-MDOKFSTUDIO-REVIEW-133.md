---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-133
uuid: df73b5cb-c31e-4ed5-a72e-845d8be17677
title: HTML comments show as gray chips carried as data
description: When a document holds an HTML comment that is not a tool comment,
  the renderer SHALL write a gray chip labelled comment at the place of the
  comment, with the comment text kept as a text node in a hidden body and never
  written as HTML.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-012
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/commentMarkers.ts
tested_in_files:
- test/core/render/commentMarkers.test.ts
default_owner_email: gaetan@xeberon.net
---

## HTML comments show as gray chips carried as data

### Normative behavior

When a document holds an HTML comment that is not a tool comment, the renderer SHALL write a gray chip labelled comment at the place of the comment, with the comment text kept as a text node in a hidden body and never written as HTML.

### Scenario (nominal): One-line block comment

- GIVEN a comment on line 3 between two paragraphs
- WHEN the document is rendered
- THEN a block wrapper with data-line 3 and data-end-line 3 holds a chip reading comment, with role button, tabindex 0 and the comment text as title, and a hidden body with the same text

### Scenario (nominal): Multi-line block comment

- GIVEN a comment from line 1 to line 4
- WHEN the document is rendered
- THEN the wrapper spans lines 1 to 4 and the chip title keeps both text lines

### Scenario (nominal): Inline comment

| Input | Outcome |
| --- | --- |
| The text "a `<!-- inline note -->` b" | The paragraph holds a span wrapper with a chip titled inline note and a hidden span body with that text |
| A heading "## Plan `<!-- TODO fix later -->`" | The heading holds the chip and its attributes are those of the heading without the comment |
| A comment in a table cell | A gray chip is written inside the cell (untested) |

### Scenario (refusal): Comment text is never rendered as HTML

| Input | Outcome |
| --- | --- |
| A comment holding an img tag with an onerror attribute | The hidden body holds the tag as text and no element is created from it |
| A comment directly followed by a paragraph with markup | The markup is rendered as usual and not inside the comment |

### Scenario (nominal): Several comments and comments next to lists

| Input | Outcome |
| --- | --- |
| The line "`<!-- a -->` `<!-- b -->`" | Two chips are written, one for each comment |
| Comments before a list, between two items and after the list | Each comment is a chip labelled comment, and the TODO comment is a green TODO chip, never a chip labelled with the comment opener |
| A raw HTML table next to comments | The table is unchanged |

### Scenario (refusal): Tool comments get no chip

| Input | Outcome |
| --- | --- |
| Comments markdownlint-disable MD013, prettier-ignore, toc, cspell:disable and vale off | No chip and no comment wrapper is written |
| A markdownlint comment and a note on one line | Only the note gets a chip (untested) |
| A comment starting with another word | A chip is written |

### Scenario (boundary): Context tags with a comment inside

| Input | Outcome |
| --- | --- |
| A context block holding inner TODO text | The admonition is produced and holds one chip |
| A context block holding a comment | The admonition holds the comment wrapper |

### Scenario (boundary): Chips after the sanitizer

| Input | Outcome |
| --- | --- |
| A rendered comment chip is sanitized | The chip keeps role button, tabindex 0 and its title |
| A chip with an onclick attribute is sanitized | The attribute is removed (deduced from the test name, not asserted separately) |

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-018: the sticky band entries of a heading holding a comment.
- SwRS-MDOKFSTUDIO-TOOLBAR-040: the table of contents entries of a heading holding a comment.

### Verification notes

- Method: test/core/render/commentMarkers.test.ts: `a block comment renders as a positioned gray chip with a hidden body`, `a multi-line block comment spans its source lines`, `data-line follows the frontmatter offset` (block comments); `an inline comment renders as a chip inside its paragraph`, `a comment in a heading does not change the heading's id or attributes` (inline comment; the table cell row is untested); `comment text never reaches the DOM as HTML`, `a comment followed by markup is never rendered as HTML` (text never rendered as HTML); `comments written on one line, one after the other, are separate chips`, `comments before and after a list each render as a real comment chip, never as a <!-- label`, `a list item can hold a comment chip between its items`, `a raw HTML table next to comments is unchanged` (several comments and lists; the tool comment mixed case is untested); `tool comments stay hidden` (tool comments); `context tags still produce their admonition, with and without a comment inside` (context tags); `chip markup survives the sanitizer without event attributes` (sanitizer).
- Method: visual scenarios review-annotations/v02-comment-todo-chips-light-900, v03-comment-todo-chips-dark-900 and v04-comment-todo-chips-cream-900 (block comment chips); review-annotations/v07-comment-list-chips-visible-light-900 to v10-comment-list-chips-hidden-dark-900 (comments next to lists).
- Criteria: The rendered HTML holds the wrapper, the chip and the hidden body with the stated attributes; the wrapper of an inline comment is a span without data-line and the heading attributes are equal with and without the comment; the DOM holds no element created from the comment text and the chip keeps role, tabindex and title only; the number of chips equals the number of non-tool comments; each list comment becomes one chip and the table markup is identical with and without comments; no okf-comment element exists for the tool comments; the admonition element exists and contains the chip or the wrapper; the sanitized chip has no attribute starting with on.
