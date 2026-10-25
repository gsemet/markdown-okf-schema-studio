---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-072
uuid: 957e35f0-52c8-4402-93b5-ab254955fb62
title: The Emoji picker filters and inserts one pictograph
description: When the writer presses Emoji, the extension SHALL open a picker
  with a field named Filter emoji and about 150 emoji in six named categories,
  none of them a flag, each button with its English name as title and accessible
  name, show only the emoji whose English name contains every typed word,
  case-insensitively, and insert a chosen emoji at the caret, replacing a
  selection, only when it is one run of at most 16 UTF-16 code units made of
  pictographs, joiners and variation selectors.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-007
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-031
- SwRS-MDOKFSTUDIO-PALETTE-036
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/editPalettePopovers.ts
- src/page/modules/inlineEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/modules/editPalette.test.ts
- test/page/runtimeEditPalette.test.ts
---

## The Emoji picker filters and inserts one pictograph

### Normative behavior

When the writer presses Emoji, the extension SHALL open a picker with a field named Filter emoji and about 150 emoji in six named categories, none of them a flag, each button with its English name as title and accessible name, show only the emoji whose English name contains every typed word, case-insensitively, and insert a chosen emoji at the caret, replacing a selection, only when it is one run of at most 16 UTF-16 code units made of pictographs, joiners and variation selectors.

### Scenario (nominal): Picker contents and focus

- GIVEN an open block editor
- WHEN the writer presses Emoji
- THEN the picker shows the filter field and six headings with between 140 and 170 emoji buttons, each with a title, including the check mark, the warning sign and the cross mark, and no flag
- THEN the filter field has the focus and the text box does not

The categories are Smileys, People and hands, Nature, Food and drink, Objects and Symbols and status; every emoji has a unique character and a name (lower-case letters, digits, blanks and hyphens).

### Scenario (nominal): The filter matches the words of the English names

- GIVEN the picker open
- WHEN warning is typed in the filter
- THEN one emoji remains and only its category heading is shown

| Typed | Outcome |
| --- | --- |
| warning | one emoji remains and only its category heading is shown |
| a word that no name contains | no emoji and no heading are shown |
| an empty filter | everything is shown |
| several words | only the emoji whose lower-cased name contains each typed word, split on blanks, or that is the typed character |

### Scenario (nominal): A click inserts the emoji and closes the picker

- GIVEN a selection and the picker open
- WHEN the writer clicks an emoji
- THEN the emoji replaces the selection, the picker closes and the text box has the focus

- GIVEN the picker open
- WHEN the writer Shift-clicks an emoji
- THEN the emoji is inserted and the picker stays open

The insertion uses the live selection of the text box at the moment of the click: an emoji chosen after the text changed is inserted at the live caret, never a stale one.

### Scenario (nominal): Enter and arrow keys in the picker

- GIVEN the filter typed with a match
- WHEN the writer presses Enter
- THEN the first visible emoji is inserted, and with Shift held the picker stays open

- GIVEN the filter has the focus
- WHEN the writer presses ArrowDown, then ArrowUp on the first row
- THEN the focus goes to the first visible emoji and back to the filter

| Key | Outcome |
| --- | --- |
| ArrowRight, ArrowLeft | the focus moves by one over the visible emoji |
| ArrowDown, ArrowUp | the focus moves by eight over the visible emoji (eight to a row) |
| Escape | the picker closes and the focus returns to the text box |
| Cmd or Ctrl with Enter in the filter | the picker closes and the edit is finished |

### Scenario (nominal): The emoji action inserts a pictograph

- GIVEN the argument of a check mark emoji
- WHEN the action runs
- THEN the character replaces the selection and the caret is after it

| Input | Argument | Outcome |
| --- | --- | --- |
| `say \| now` | check mark | `say ✅\| now` |
| `say [foo] now` | warning sign with variation selector | `say ⚠️\| now` (the selection is replaced) |

The emoji action is available in the block and cell scopes.

### Scenario (refusal): Other text

- GIVEN the argument abc, or an empty argument
- WHEN the action runs
- THEN no edit is produced

| Argument | Outcome |
| --- | --- |
| no argument | no edit |
| empty | no edit |
| `a` | no edit |
| `<b>` | no edit |
| a newline | no edit |
| a check mark followed by `x` | no edit |
| twenty `x` | no edit |

The pattern is Extended_Pictographic plus U+200D and U+FE0F, with a maximum length of 16.

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-031: the picker is a palette popover that opens inside the frame, one at a time, and Escape closes it.
- SwRS-MDOKFSTUDIO-PALETTE-036: leaving the frame from the filter saves once.

### Verification notes

- Method: test/page/modules/editPalette.test.ts (T24: the emoji picker has about 150 emoji in 6 categories, each with a title; the filter matches English names and hides empty categories; clicking an emoji inserts it at the caret, replaces a selection and closes; Shift+click keeps the picker open for the next emoji; Enter in the filter inserts the first match, Escape returns to the text box; arrow keys move through the visible emoji and back to the filter)
- Method: test/page/runtimeEditPalette.test.ts (T24: an emoji chosen after the text changed is inserted at the live caret, never a stale one)
- Method: test/page/modules/editActions.test.ts (emoji inserts at the caret and replaces the selection; emoji refuses anything that is not a single pictograph run; every emoji of the picker is accepted, named and unique, in six categories without flags)
- Method: test/page/modules/editActions.test.ts (marker holder of editActions.test.ts for this requirement)
- Method: visual scenarios palette-slash/v01-palette-popups-light-900 (picker contents; the filter warning leaves one emoji), palette-slash/v17-palette-wraps-narrow-dark-360 (picker contents)
- Criteria: The insertion uses the live selection; each typed word must be contained in the lower-cased name; every emoji has a unique character and a name; the pattern is Extended_Pictographic plus U+200D and U+FE0F with a maximum of 16 code units.
