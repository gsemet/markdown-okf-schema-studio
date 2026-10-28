---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-143
uuid: a29abef2-f627-4295-88cd-6b15266ca7be
title: A click or Enter on a chip toggles its comment box
description: When a reader clicks a comment chip, or presses Enter or Space on a
  focused one, the page SHALL toggle the box that shows the comment text under
  the line, with the title and shape of its comment kind, and keep which boxes
  are open for the panel.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-012
- StRS-MDOKFSTUDIO-REVIEW-003
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/commentStyles.ts
- src/page/modules/chipToggle.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/page/modules/chipToggle.test.ts
- test/page/modules/reviewReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## A click or Enter on a chip toggles its comment box

### Normative behavior

When a reader clicks a comment chip, or presses Enter or Space on a focused one, the page SHALL toggle the box that shows the comment text under the line, with the title and shape of its comment kind, and keep which boxes are open for the panel.

### Scenario (nominal): Click opens and closes the box
- GIVEN a gray chip
- WHEN the reader clicks it twice
- THEN the box opens with the comment text and then closes, and the chip aria-expanded and the box hidden attribute follow the clicks

### Scenario (nominal): Enter and Space toggle the box
- GIVEN a focused chip that has a box
- WHEN the reader presses Enter and then Space
- THEN the box opens and closes

### Scenario (refusal): Targets and keys that change nothing
| Input | Outcome |
| --- | --- |
| A click on text that is not a chip | No box changes |
| Another key than Enter or Space on a focused chip | Nothing changes |
| A click on a TODO chip that comes from the word TODO in prose (a chip without a box) | No box opens, aria-expanded stays false and the layout is not re-measured |

### Scenario (nominal): Title and accent follow the comment kind
| Open box | Title | Accent bar on the inline start |
| --- | --- | --- |
| A comment | Comment | gray |
| A TODO chip written from a TODO comment | TODO | green |
| A thread | Thread | - |

The boxes are drawn with an admonition-like shape; v04 asserts the contrast of 4.5:1 on the cream page.

### Scenario (nominal): Open boxes are kept for the panel
- GIVEN two open comments, or two inline comments in one paragraph with one open
- WHEN the content is replaced in the same panel (a content patch) or the page is reloaded
- THEN the same boxes are open, and only the open one of the paragraph stays open; the webview state holds the keys of the open boxes in the form {line}:{number}, the source line and the number of the comment on that line

### Scenario (boundary): Keys of comments that no longer exist
| Input | Outcome |
| --- | --- |
| A saved key 5:0 and a document without a comment at line 5 | The key is removed from the saved state when the state is applied |
| A saved key whose comment exists | The key stays |

### Scenario (nominal): Opening or closing a box keeps the reading position
- GIVEN a comment above the reading line
- WHEN the reader opens its box, and then closes it
- THEN the text being read does not move either time

### Scenario (boundary): Square corners
| Shown element | Corners |
| --- | --- |
| An open comment box | square (border radius 0) |
| A comment compose box | square (border radius 0) |
| A thread popover | square (border radius 0) |

### Verification notes
- Method: test/page/modules/chipToggle.test.ts (click opens and closes, Enter and Space, other keys and targets, TODO word chip left alone, open boxes kept with the webview state, two comments of one paragraph, the layout callback after every toggle).
- Method: test/page/modules/reviewReq.requirements.test.ts (keys of removed comments dropped).
- Method: test/core/preview/previewStyles.test.ts (`T15: an open comment is an admonition-like box and showComments off hides the gray chips only` for the three titles and the border radius; `the comment boxes (compose, thread popover, open comment) have square corners`).
- Method: visual scenarios review-annotations/v02-comment-todo-chips-light-900 to v04-comment-todo-chips-cream-900 (chips and boxes; v04 asserts the contrast of 4.5:1 on the cream page).
- Criteria: The chip aria-expanded and the box hidden attribute follow the clicks and keys; the saved keys have the form {line}:{number} and the boxes open again from them, only keys of existing comments stay; the layout-change callback runs after every toggle, the position itself is deduced from the callback (keepReadingLine), not run; the stylesheet carries the three titles and a border radius of 0 for the boxes. The TODO box title and the accent colours are style rules of the stylesheet, not asserted by a chip test.
