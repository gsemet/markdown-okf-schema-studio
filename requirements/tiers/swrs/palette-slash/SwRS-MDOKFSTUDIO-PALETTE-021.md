---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-021
uuid: 80fd8fcb-fb12-4869-9f5e-ff1207259e5f
title: The palette is a toolbar above the editor that sticks over a tall editor
description: When a block editor opens, the extension SHALL place the edition
  palette as a toolbar named Edition palette on top of the editor frame, outside
  the frame, inside one host element that holds both, from the arrival of the
  source of the block until the editor closes, and keep it in reach, sticking or
  wrapping, while a tall editor scrolls or the pane is narrow, without covering
  the first lines of an editor that fits in the viewport when it opens or the
  panels in it.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
- StRS-MDOKFSTUDIO-PALETTE-005
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentLayoutStyles.ts
- src/core/preview/styles/editPaletteStyles.ts
- src/page/features/blockSourceEditor.ts
- src/page/features/editorChrome.ts
- src/page/features/scrollCore.ts
- src/page/modules/caretRect.ts
- src/session/features/blockEdits.ts
- src/session/features/scrollSync.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/integration/editToolbarCover.test.ts
- test/integration/tallBlockScroll.test.ts
- test/page/escapeClose.test.ts
- test/page/figureEditButtonClearance.test.ts
- test/page/modules/caretReveal.test.ts
- test/page/runtimeEditPalette.test.ts
- test/session/toolbarReq.requirements.test.ts
- test/visual/capture_edit_checks.py
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
---

## The palette is a toolbar above the editor that sticks over a tall editor

### Normative behavior

When a block editor opens, the extension SHALL place the edition palette as a toolbar named Edition palette on top of the editor frame, outside the frame, inside one host element that holds both, from the arrival of the source of the block until the editor closes, and keep it in reach, sticking or wrapping, while a tall editor scrolls or the pane is narrow, without covering the first lines of an editor that fits in the viewport when it opens or the panels in it (the text box, the figure form, the link panel). The bar of an editor taller than the viewport sticks at the top of the pane and may cover its first lines; the text scrolls under it.

### Scenario (nominal): Palette above the frame

- GIVEN an open paragraph editor whose source has arrived
- WHEN the editor is inspected
- THEN the palette (role toolbar, aria-label Edition palette) and the frame are the two children of one host element marked data-sphinx-preview-block-editor-host, the palette first, and the frame does not contain the palette

### Scenario (boundary): When a palette exists

- GIVEN an editor of the kind of the table
- WHEN the page is inspected at the moment of the table
- THEN the palette is as in the table

| Editor and moment | Outcome |
| --- | --- |
| edit mode on and a block clicked, the host has not answered yet | no palette exists |
| the source arrived | the palette is shown above the frame |
| the editor closes (the writer presses Escape) | the host, the frame and the palette are removed together |
| an insertion editor opened from an insert point or from Start writing | an edition palette above it, like above a paragraph editor |
| a table cell editor or a frontmatter field editor | no block palette is added (the cell editor gets the cell formatting group inside its table bar, see SwRS-MDOKFSTUDIO-TABLE-085; the field editors, see SwRS-MDOKFSTUDIO-FMEDIT-001) |

### Scenario (nominal): A small palette sticks over a tall editor

- GIVEN an editor taller than one and a half viewports
- WHEN its top has scrolled out of view, and again when it is scrolled to its end
- THEN the palette is as in the table

| Scroll position | Palette |
| --- | --- |
| the top of the frame is out of view | at the top of the viewport, 4 px below the larger of the reading offset and the toolbar bottom, below the sticky band and the floating toolbar, uncovered, inside its host; the box has not moved, and Bold keeps the editor open and the focus in the box |
| the top of the frame is out of view, the frame is taller than the viewport and none of the palette's buttons shares columns with the floating toolbar (it overlaps only the bar's empty end) | 4 px below the visible bottom of the sticky band (4 px from the top of the viewport when the band is hidden, also for the first block of the document): the host carries data-sphinx-palette-top and the custom property --sphinx-preview-palette-top, measured again when the pane, the bar, the band or the tall state change; a button under the floating toolbar keeps the line below the toolbar |
| the wheel scrolls a frame taller than the viewport down, one notch at a time | the page only goes down and the palette stays on its sticking line until the end of the frame |
| the end of the editor | it has left with the end of the frame and is not below it |

### Scenario (boundary): A tall palette or a short pane stays in the flow

- GIVEN an edition palette
- WHEN the window is resized or scrolled
- THEN the palette is as in the table, and the check is repeated on every scroll and resize

| Case | Outcome |
| --- | --- |
| a palette of 60 px in a viewport of 100 px (taller than 40 percent of the viewport) | the host carries data-sphinx-palette-static and the palette is positioned relative, in the flow above the frame, with no scroll padding set |
| the palette shrinks to 30 px | the attribute is removed again |
| a viewport at most 520 px high | the palette stays in the flow instead of sticking |

### Scenario (nominal): The caret is kept in view

- GIVEN a block editor with a stuck palette
- WHEN the caret moves or text is typed
- THEN the page scrolls as in the table

| Caret | Outcome |
| --- | --- |
| the top of the caret line is above the palette bottom | the page scrolls up by the difference so that the top of the caret line is level with the palette bottom |
| the caret line ends less than 8 px above the bottom of the viewport, or below it, the palette stuck or not (the end of a large paste) | the page scrolls down so that the caret line ends 8 px above the bottom of the viewport |
| the caret is below the palette, or more than 8 px above the viewport bottom | the page does not scroll |
| the palette is still above the frame (not stuck) and the caret line is above its bottom | the page does not scroll |
| the text of a paste is applied to the document by the autosave | the editor stays open, the caret stays where the paste ended and the page does not move: the scroll of the text editor to the applied edit does not move the page, from the start of the autosave until 750 ms after it settled (CR 134) |

### Scenario (nominal): Native scrolling keeps clear of the stuck palette

- GIVEN a palette, synchronised on every scroll and resize
- WHEN it is stuck over the box or not
- THEN the root element is as in the table

| Palette | scroll-padding-top of the root element |
| --- | --- |
| a small palette stuck over the box | the larger of the reading offset and the toolbar bottom, plus the palette height, plus 12 px, so that it covers the palette (for a tall frame's line under the sticky band, that line plus the palette height plus 8 px) |
| a palette above the frame, or a tall palette | the property is removed |

### Scenario (boundary): A narrow pane

- GIVEN an editor in a pane narrower than the buttons of the palette
- WHEN the palette is inspected
- THEN it is as in the table

| Pane | Outcome |
| --- | --- |
| 360 px, dark theme | the buttons wrap onto several rows, the palette does not exceed the frame and its popups stay inside the pane |
| 460 px, a very tall editor, scrolled | the palette stays inside the pane and the page has no sideways scroll |

### Scenario (boundary): A block near the top of the pane keeps its first lines uncovered

- GIVEN a 900 or 1100 px pane on the cream theme in which the palette wraps onto two rows, and a block (a paragraph, or a figure whose Edit figure form opens in its frame) whose top is 20, 60 or 140 px under the top of the pane, so that its host is above the line where the palette sticks (4 px below the toolbar bottom)
- WHEN the block editor opens
- THEN the palette is as in the table

| Part of the open editor | Outcome |
| --- | --- |
| the palette's bottom edge | not below the top of the frame, nor below the top of the text box or of the figure form |
| the frame | takes the distance between the sticking line and its host's top, plus 3 px, as its top margin (custom property --sphinx-preview-palette-reserve on the host), so the editor and its panels move down with the bar; 0 when the host is not above that line |
| the page | keeps the text where the user clicked: the scroll anchor follows the frame down |
| a frame whose top is more than one palette height above the line | nothing is reserved, unless the page is not scrolled (scroll offset 0): then the whole distance is reserved, since nothing is scrolled under the bar |
| a frame taller than the viewport whose host is above the line where the palette may sit (a block taller than the pane, opened in its middle) | nothing is reserved; the page scrolls down by the palette's height in flow, so the clicked text stays where it was and the stuck bar covers the lines under it (a close scrolls back); the page never scrolls up to bring the first lines below the bar |
| the room the page may scroll to keep the text in place when a panel opens | ends where the host's top meets the usable top, not the frame's top, so the palette is never left riding over the panel |

The distance is measured when the editor opens and when the layout changes (resize, the palette changing height, the frame becoming taller or shorter than the viewport), never while the user scrolls. A frame taller than the viewport reserves nothing: a reserve taken for a short frame is given back when the frame grows past the viewport, so the bar stays attached to the frame.

### Verification notes

- Method: test/page/runtimeEditPalette.test.ts (palette above the frame, when a palette exists, a tall palette stays in the flow: the palette sits in a host above the block editor frame and not inside it, no palette before the source arrives and none after the editor closes, the palette appears in the insertion editor, the table cell editor and the frontmatter editors get no palette, the host wraps the frame and goes with it also on a content patch, the host takes the first-block clearance class and swallows clicks like the frame, a palette taller than 40% of the viewport is not sticky and a small one is)
- Method: test/page/modules/caretReveal.test.ts (the caret is kept in view: a caret under the stuck palette is scrolled down to just below it, a caret below the viewport is brought back in, a clear caret or a palette that is not stuck needs no scroll, the caret rect is one line high even when the rest of the text spans many lines)
- Method: visual scenarios in test/visual/scenarioDefinitions1.ts, palette-slash/v01-palette-popups-light-900, palette-slash/v15-palette-above-editor-dark-900, palette-slash/v16-palette-above-editor-cream-900 (the palette sits outside the frame, attached to it, not under the toolbar); palette-slash/v02-palette-sticky-tall-editor-light-900, palette-slash/v03-palette-sticky-tall-editor-dark-900, palette-slash/v18-palette-sticky-tall-editor-light-460, palette-slash/v04-palette-not-sticky-narrow-dark-360 (a small palette sticks; the caret stays below the palette after ArrowUp in v02); palette-slash/v17-palette-wraps-narrow-dark-360, palette-slash/v18-palette-sticky-tall-editor-light-460 (a narrow pane)
- Method: visual scenario palette-slash/v04-palette-not-sticky-narrow-dark-360 (check_edit_palette_tall in test/visual/capture_comment_checks.py: a 140-line box opened under the five-row toolbar at 360 px, bar and frame at most 6 px apart once the frame is taller than the viewport).
- Method: visual scenario palette-slash/v27-palette-clears-content-cream-1100 (check_edit_palette_clearance in test/visual/capture_edit_checks.py: at 20, 60 and 140 px under the top of a 1100 px cream pane, and a tall figure already scrolled past the sticking line, the form opened by the palette button and by the Edit figure button, the palette's bottom is not below the top of the frame, the text box or the figure form; fails when the frame does not reserve the distance; a code block taller than the pane opened with its top 150 px above the viewport: the clicked row moves by less than the palette height and stays below it, then six wheel notches never move the page up and keep the palette on its sticking line; fails when the opening scrolls the text down by the former tall-block clearance, and, with the toolbar at its current width clear of the bar's columns, fails when the reveal after the anchor scrolls the page up to the reading offset over a bar that sticks under the band), palette-slash/v28-palette-clears-text-rule-cream-900 (the paragraph under the title of a 900 px cream page opened at the top: its text box starts below the two-row palette, fails without the reserve and when the reserve is capped at one bar height), and the unit test in test/page/runtimeEditPalette.test.ts (the reserve is uncapped at the page top and capped to one bar height when scrolled), and the real-window test test/integration/editToolbarCover.test.ts (same measurements in a VS Code window on a dark theme); the real-window test test/integration/tallBlockScroll.test.ts (a code block taller than the pane opened scrolled into it, in a window width where the floating toolbar overlaps only the bar's empty end: the palette is 4 px under the sticky band and stays there over twelve wheel notches that never move the page up, fails when the bar sticks under the toolbar; an empty document, Start writing and a 90-paragraph paste: the caret at the end of the paste is in view, fails when the page stays at the top, then sixteen wheel notches never move the page up)
- Method: untested: the native scrolling padding, deduced from the code (syncPaletteSticky in src/page/features/editorChrome.ts), the sticky position itself is checked by the visual scenarios of the sticky palette; the pane height rule (at most 520 px) is a media query in editPaletteStyles.ts and is not tested
- Criteria: The host holds exactly the palette and the frame in this order, a click on the host does not reach the page's block click handling, and the host carries the first-block class when the frame does; the scroll compensation of the text is specified in SwRS-MDOKFSTUDIO-BLOCK-228 and the first block of a document in SwRS-MDOKFSTUDIO-LAYOUT-007 and SwRS-MDOKFSTUDIO-LAYOUT-011. The computed position is sticky with the offset reading-offset-or-toolbar-bottom plus 4 px, the palette bottom is not under the sticky band, and the frame position is unchanged by the sticking. The check is bound to the window scroll and resize events (bindPaletteSticky); the attribute is present exactly while the palette height exceeds 0.4 times the window height; a viewport of at most 520 px high turns position sticky into relative by the stylesheet. caretRevealDelta returns the signed distance between the caret top and the bar bottom when the bar bottom is below the frame top and the caret top is above the bar bottom, the caret bottom minus the viewport height minus 8 when the caret bottom exceeds that limit (whether the bar is stuck or not), and 0 otherwise. The scroll-padding-top property is present only when the palette height is at most 40 percent of the viewport and the palette bottom is below the frame top while its position is sticky. The reserve is the sticking line minus the host top plus 3 px when the palette is sticky, the frame is not taller than the viewport, and that distance is more than 0.5 px and either at most the palette height plus 3 px or the page scroll offset is 0, otherwise 0 (reservePaletteClearance in src/page/features/editorChrome.ts). For a frame taller than the viewport whose host top is above the usable top at opening, the scroll shift is the palette's height in flow (keepTextInPlaceBelowPalette); the tall frame's sticking line is set by syncTallPaletteTop in src/page/features/editorChrome.ts. The palette has flex-wrap wrap and max-width 100 percent, its right edge is not beyond the frame, and the document has no horizontal overflow (the page-wide rule is SwRS-MDOKFSTUDIO-LAYOUT-001).
