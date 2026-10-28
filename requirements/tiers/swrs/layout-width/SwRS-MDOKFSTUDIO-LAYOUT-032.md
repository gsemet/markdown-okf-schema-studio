---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-032
uuid: 6b7bd829-6114-45da-9702-814c9d39fdc2
title: A wide table scrolls inside its own box with shaded edges
description: When a table is wider than the pane outside Auto breakout, the
  extension SHALL let it scroll sideways inside its own box, limited to the
  column width, without widening the page, mark it as overflowing when it is
  more than 1 px wider than its box so that the theme shades its edges, and keep
  a cell holding a single word of at most 24 characters on one line. The
  extension SHALL also give every cell of a content table (not the frontmatter
  properties table) a minimum width of 5em, so that columns never wrap words
  letter by letter and a table that no longer fits uses this wide-table
  behaviour.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.ts
- src/page/features/scrollCore.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/page/runtimeScroll.test.ts
- test/visual/scenarioAssertions.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CORE-035
- SwRS-MDOKFSTUDIO-LAYOUT-033
- SwRS-MDOKFSTUDIO-LAYOUT-034
---

## A wide table scrolls inside its own box with shaded edges

### Normative behavior

When a table is wider than the pane outside Auto breakout, the extension SHALL let it scroll sideways inside its own box, limited to the column width, without widening the page, mark it as overflowing when it is more than 1 px wider than its box so that the theme shades its edges, and keep a cell holding a single word of at most 24 characters on one line. The extension SHALL also give every cell of a content table (not the frontmatter properties table) a minimum width of 5em, so that columns never wrap words letter by letter and a table that no longer fits uses this wide-table behaviour.

### Scenario (nominal): Service-level table at 460 px
- GIVEN a service-level table in a 460 px pane in dark theme, Margin mode
- WHEN the table is scrolled to its end
- THEN the far-right column is reachable and the page has no sideways scroll

### Scenario (nominal): Sixteen-column table at 900 px
- GIVEN a table with sixteen columns in a 900 px pane in dark theme
- WHEN the table is scrolled to its end
- THEN the far-right column is reachable and the page has no sideways scroll

### Scenario (nominal): Table with many columns
- GIVEN a seven-column table whose header words "document" and "parse" would otherwise be squeezed to one or two letters per line, in Margin mode
- WHEN it is shown
- THEN every cell has a computed minimum width of at least 5em, the words stay whole, and the table scrolls sideways when the columns no longer fit

### Scenario (refusal): Table that fits
- GIVEN a table that fits
- WHEN it is shown
- THEN no scroll bar appears

### Scenario (boundary): Overflow mark
| Input | Outcome |
| --- | --- |
| Table with a scroll width of 900 and a client width of 400 (not a properties table) | The table carries data-sphinx-table-overflow=true |
| Scroll width 401 against client width 400 | Not an overflow |
| Scroll width 402 against client width 400 | Sets the mark |
| Scroll width 400 against client width 400, after a mark | Removes the mark |
| A properties table with an overflow | Never marked |
| A second pass over the same table | Writes no attribute |

### Scenario (boundary): Short identifiers
| Input | Outcome |
| --- | --- |
| Overflowing table with the cells nw-02 and North | Both are marked data-sphinx-short-cell and set to nowrap |
| Cell North Pole (two words) | Not marked |
| Cell holding a 25-character word | Not marked |
| A table that fits | The nowrap rule applies only to a table marked as overflowing |
| A properties table | No cell is marked |

### Known issues
- Known issue: No unit test covers the scroll box rule itself beyond the overflow cue CSS. In Auto the table breaks out instead of scrolling.
- Known issue: A cell mark, once set, is never removed when the cell text changes (the code returns early for a marked cell).
- Known issue: The short-cell mark is written on every short cell of every table that is not a properties table, whether or not the table overflows; only the nowrap effect depends on data-sphinx-table-overflow.

### Verification notes
- Method: test/visual/scenarioDefinitions1.ts (service-level table, sixteen-column table): visual scenarios v01 and v02 (no horizontal scroll and the far-right column scroll step); the table CSS is shared with unit-tested rules.
- Method: test/core/preview/previewStyles.test.ts (table that fits, overflow mark, short identifiers): unit test "overflowing content tables keep short cells whole and show scroll shadows"; the CSS tests for the shadows and the nowrap rule.
- Method: test/page/runtimeScroll.test.ts (overflow mark, short identifiers): unit tests markWideTables marks short cells and the overflow of a wide table, never the properties table; markWideTables sets the overflow attribute only past a one pixel tolerance and is idempotent.
- Criteria: The page overflow is at most 1 px, the last column becomes visible, and the page scroll width equals its client width with a wide table; the attribute is true only when scroll width exceeds client width by more than 1 px; a cell matches only when its trimmed text is one to 24 non-space characters.
