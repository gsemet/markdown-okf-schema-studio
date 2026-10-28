---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-167
uuid: dc69e2f7-e573-42a5-9253-d81a425dd0f6
title: An inline THREAD comment shows as a thread chip with its messages
description: When a document holds a `<!-- THREAD` comment as its own block, the
  renderer SHALL write a green chip with a speech bubble, labelled with the
  author of the first message and, with several messages, followed by their
  number in parentheses, whose box lists each message with its author, date and
  text, and write any other THREAD comment as an ordinary comment chip.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-015
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/comments/inlineThread.ts
- src/core/render/commentMarkers.ts
- src/core/render/mystGridToctree.ts
tested_in_files:
- test/core/comments/inlineThread.test.ts
- test/core/preview/previewStyles.test.ts
- test/core/render/cardsTabs.test.ts
- test/core/render/commentMarkers.test.ts
default_owner_email: gaetan@xeberon.net
---

## An inline THREAD comment shows as a thread chip with its messages

### Normative behavior

When a document holds a `<!-- THREAD` comment as its own block, the renderer SHALL write a green chip with a speech bubble, labelled with the author of the first message and, with several messages, followed by their number in parentheses, whose box lists each message with its author, date and text, and write any other THREAD comment as an ordinary comment chip.

### Scenario (nominal): Chip label
| Thread | Chip |
| --- | --- |
| Two messages, the first by User 1 | The chip reads "User 1 (2)"; its wrapper has the kind thread and the count 2 |
| One message by Ada | The chip reads Ada |

### Scenario (nominal): Open thread lists one entry for each message
- GIVEN a thread of two messages
- WHEN the chip is opened
- THEN a box titled Thread shows two entries with author, date and text, and the text keeps its line breaks; the same thread written with CRLF line ends and trailing spaces gives the same entries

### Scenario (nominal): A message is a header line followed by indented text
- GIVEN a thread with the headers "User 1 (2026-10-16 10:47):" and "User 2 (2026-10-16 10:52):", the first text spanning two lines
- WHEN the body is read
- THEN two messages are returned with author, date and text; each line after a header up to the next header loses one indentation of up to two spaces or a tab, and blank lines inside a message are kept

### Scenario (boundary): Indentation and blank lines
| Input | Outcome |
| --- | --- |
| A message indented with a tab and holding a blank line | The text is "first\n\nsecond" |
| A line that is not indented | The line is kept as text |

### Scenario (refusal): A THREAD comment that is not a thread
| Input | Outcome |
| --- | --- |
| The comments "THREADS", "TODO THREAD", "THREAD" alone | None is a thread; THREADS and THREAD alone are ordinary comment chips, TODO THREAD is a TODO chip |
| "THREAD" with stray text before the first header | Not a thread |
| A header dated 2026-1-2 3:04 (another date format) | Not a thread |
| A THREAD comment inside a paragraph | A gray comment chip |

### Verification notes
- Method: test/core/render/commentMarkers.test.ts (`a THREAD comment is a green thread chip with one entry per message`, `a single-message thread chip shows only the author`, `a THREAD comment with CRLF line ends and trailing spaces renders the same`, `a THREAD without a valid message, or inside a paragraph, stays an ordinary comment`).
- Method: test/core/comments/inlineThread.test.ts (`a thread body is read as messages with author, date and text`, `CRLF line ends and trailing spaces or tabs do not change the messages`, `blank lines inside a message are kept, and a tab indent is accepted`, `what is not a thread is refused`).
- Method: test/core/preview/previewStyles.test.ts (`an inline thread is a green chip with a bubble, a green titled box, and goes with the gray chips`).
- Method: visual scenarios review-annotations/v11-inline-thread-light-900, v12-inline-thread-dark-900 and v13-inline-thread-cream-900 (v13 asserts only).
- Criteria: The wrapper carries data-okf-comment-kind thread and the chip label follows the number of messages; the hidden body holds one entry per message with author, date and text elements; the parsed messages equal the expected author, date and text; parseThreadBody returns undefined and the chip kind is comment for what is not a thread.
