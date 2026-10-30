---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-069
uuid: d23a4812-7683-4474-b941-090686422065
title: The Colour code button edits a colour code at the caret
description: 'When the caret or selection lies inside a #rgb, #rrggbb or rgb() colour
  code that is not part of a word or a character reference, the extension SHALL show
  the Colour code button with a swatch of that colour, hide it otherwise, and let
  its picker, started on the colour of the code with no tabs and no Remove button,
  replace the code under the caret in place and close when the caret leaves the code.'
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-007
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-031
- SwRS-MDOKFSTUDIO-PALETTE-036
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/colourEditActions.ts
- src/page/modules/editPalette.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/modules/editPalette.test.ts
- test/page/runtimePaletteActions.test.ts
default_owner_email: gaetan@xeberon.net
---

## The Colour code button edits a colour code at the caret

### Normative behavior

When the caret or selection lies inside a #rgb, #rrggbb or rgb() colour code that is not part of a word or a character reference, the extension SHALL show the Colour code button with a swatch of that colour, hide it otherwise, and let its picker, started on the colour of the code with no tabs and no Remove button, replace the code under the caret in place and close when the caret leaves the code.

### Scenario (nominal): Caret in a code

- GIVEN the text color #1e88e5 with the caret inside the code
- WHEN the caret moves into the code
- THEN the Colour code button appears and its swatch shows the colour

### Scenario (boundary): Where the button shows and hides

- GIVEN the text &#123; with the caret inside
- WHEN the caret moves
- THEN the button stays hidden

In this table `|` marks the caret.

| Input | Button |
| --- | --- |
| `a #c00\| b` (right edge) | shown |
| `a \|#c00 b` (left edge) | shown |
| `a #c\|c0000 b` | shown |
| `a rgb(1, 2,\| 3) b` | shown |
| `a \|rgba(1,2,3,0.5)` | shown |
| `a\| #c00 b` (one space before) | hidden |
| `a #c00 \|b` (one space after) | hidden |
| `a #c0\| b` (two digits) | hidden |
| `a #c00x\| b` (followed by a letter) | hidden |
| `a x#c00\| b` (preceded by a letter) | hidden |
| `a #ccccc\| b` (five digits) | hidden |
| `a rgb(300,0,0)\| b` (out of range) | hidden |
| `a rgb(1,2\| b` (unclosed) | hidden |
| `plain\| text` | hidden |
| `&#123;` with the caret inside (character reference) | hidden |

The code must be accepted by the colour grammar of the sanitizer (hex with 3, 4, 6 or 8 digits, rgb, rgba), a hex code must not be preceded by a word character, an ampersand or a hash and not followed by a word character; the button follows keyup, mouseup and select events.

### Scenario (nominal): The picker starts on the code and replaces it in place

- GIVEN the caret in #c00
- WHEN the picker is opened and a swatch is chosen
- THEN the code is replaced by the swatch colour with the caret after it

| Input | Argument | Outcome |
| --- | --- | --- |
| `a #c0\|0 b` | `#00f` | `a #00f\| b` |
| `a rgb(1, 2, 3)\| b` | `#ff8800` | `a #ff8800\| b` |

The popover has no element with data-color-tab and none with data-color-remove, and the field starts with the code; the field takes the focus without saving.

### Scenario (refusal): Invalid colour code

- GIVEN the same picker
- WHEN an invalid colour code is typed and Enter is pressed
- THEN nothing is replaced and the field is marked aria-invalid

| Input | Argument | Outcome |
| --- | --- | --- |
| `a #c0\|0 b` | `red` | no edit |
| `a #c0\|0 b` | `rgb(1,2,3);"` | no edit |
| `a plain\| b` (no code at the caret) | `#00f` | no edit |
| `a #c0\|0 b` | no argument | no edit |

### Scenario (nominal): Caret leaves the code

- GIVEN the picker open on a colour code
- WHEN the caret moves out of the code
- THEN the button is hidden and the picker is closed

### Scenario (boundary): Caret stays in the code

- GIVEN the picker open
- WHEN the caret moves inside the code
- THEN the picker stays open

updateAvailability hides the button and calls closePopover when the open button is the hidden one.

### Related requirements

- SwRS-MDOKFSTUDIO-GFM-034: the colour grammar of the sanitizer that accepts the code.
- SwRS-MDOKFSTUDIO-PALETTE-031: the picker is a palette popover that opens inside the frame, one at a time.
- SwRS-MDOKFSTUDIO-PALETTE-036: leaving the frame from a palette control saves once.

### Verification notes

- Method: test/page/modules/editActions.test.ts (T34: colorCode is available only with the caret in a colour code; colorCode replaces the code under the caret in place, validated)
- Method: test/page/modules/editPalette.test.ts (T34: the code swatch button shows only with the caret in a colour code and opens on that value)
- Method: test/page/runtimePaletteActions.test.ts (T34: the code swatch appears and disappears as the caret moves into and out of a colour code; the hex field takes the focus without saving, and the code swatch replaces a code in place)
- Method: test/page/modules/editActions.test.ts (marker holder of editActions.test.ts for this requirement)
- Method: visual scenarios palette-slash/v01-palette-popups-light-900 (the swatch is shown only while the caret is in a colour code)
- Criteria: The code must be accepted by the colour grammar of the sanitizer and delimited as described; the popover has no tab and no Remove button and the field starts with the code; updateAvailability hides the button and closes the popover when the open button is the hidden one.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-007](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-007.md): A writer inserts links, images, figures, tables, colours and emoji through pickers
- Depends on:
  - [SwRS-MDOKFSTUDIO-PALETTE-031](SwRS-MDOKFSTUDIO-PALETTE-031.md): Palette popovers open in the frame, one at a time, and Escape or typing closes them
  - [SwRS-MDOKFSTUDIO-PALETTE-036](SwRS-MDOKFSTUDIO-PALETTE-036.md): Leaving the frame from a palette control saves once and a press keeps the text box focus
<!-- okf:links:end -->
