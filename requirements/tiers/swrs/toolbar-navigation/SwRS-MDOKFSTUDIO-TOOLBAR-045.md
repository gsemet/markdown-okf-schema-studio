---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-045
uuid: f7d82857-5211-4393-8bda-16e5dcde9d35
title: "The column marks the section being read and jumps on click"
description: "When the reading line passes a heading, the extension SHALL mark the
  entry of the last heading at or above the reading line (one pixel tolerance) with
  aria-current location and a tint with a bar, keep that entry visible by scrolling
  the column, and scroll the heading of a clicked entry to the reading line below
  the sticky band without navigating."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-006
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentLayoutStyles.ts
- src/page/modules/tocColumn.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/page/modules/tocColumn.test.ts
- test/visual/capture_layout_checks.py
default_owner_email: gaetan@xeberon.net
---

## The column marks the section being read and jumps on click

### Normative behavior

When the reading line passes a heading, the extension SHALL mark the entry of the last heading at or above the reading line (one pixel tolerance) with aria-current location and a tint with a bar, keep that entry visible by scrolling the column, and scroll the heading of a clicked entry to the reading line below the sticky band without navigating.

### Scenario (nominal): Reading
- GIVEN an open column and a reading line inside the second section
- WHEN the page scrolls
- THEN exactly one entry, the second, has aria-current location (and data-sphinx-preview-toc-current), and the mark is removed from the previous entry

### Scenario (boundary): Fractional top
- GIVEN a heading revealed at the reading line with a fractional top
- WHEN the column tracks the reading line
- THEN that heading is the current entry

### Scenario (boundary): Folded parent
| Input | Outcome |
| --- | --- |
| A folded parent whose child is the current section | The parent entry carries the mark (a hidden entry is represented by its nearest shown ancestor) |
| The same parent unfolded | The child carries the mark |

### Scenario (nominal): The column scrolls itself
| Input | Outcome |
| --- | --- |
| A current entry below the visible part of the column | The column scrolls down so the entry bottom is inside it and the page scroll does not change |
| A current entry above the visible part | The column scrolls up |

### Scenario (nominal): The current entry is readable
- GIVEN scenarios in a light 900 px and a dark 1600 px pane
- WHEN the current entry is measured
- THEN it has square corners (border radius 0), a 3 px bar on its start edge, and its text against the tinted background has a contrast of at least 4.5 to 1; exactly one entry carries the mark while the page is scrolled

### Scenario (nominal): Click
- GIVEN an open column and a heading far below
- WHEN the reader clicks its entry
- THEN the page scrolls so the heading is at the reading line below the sticky band, the default action of the click is cancelled and no navigation message (previewLink) is posted

### Scenario (boundary): Click right after a content update
| Input | Outcome |
| --- | --- |
| An entry built before a content update, clicked right after the update | The page scrolls to the live heading element found again by its key, not the replaced one |
| The heading no longer exists | The heading captured at build time is used |

### Verification notes
- Method: test/page/modules/tocColumn.test.ts (Reading and Fractional top: the current entry follows the reading line and is marked aria-current, and a heading revealed at the reading line becomes current despite a fractional top; Folded parent: a collapsed parent carries the highlight of a hidden current section; The column scrolls itself: the TOC scrolls itself, not the page, to keep the current entry visible; Click: clicking an entry scrolls to its heading and does not navigate; Click right after a content update: a click right after a content patch scrolls to the live heading). The removed-heading fallback is untested.
- Method: test/core/preview/previewStyles.test.ts (The current entry is readable: T16b, only the current TOC entry loses its rounded corners, asserting border-radius 0 and the 3 px bar).
- Method: test/visual/capture_layout_checks.py (check_toc_column: exactly one current entry and its contrast on toolbar-navigation/v22 to v27; the current entry is inside the column; the page scrolls after the click).
- Criteria: one entry carries aria-current location and data-sphinx-preview-toc-current; nav.scrollTop changes by the overflow of the entry and the window scroll is untouched; contrast >= 4.5 and border-radius 0; scrollToHeading is called with the heading and no previewLink is posted; the live heading by key, else the heading captured at build time.
