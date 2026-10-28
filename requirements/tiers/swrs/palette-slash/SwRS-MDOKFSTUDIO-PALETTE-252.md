---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-252
uuid: 5c2f5b67-14a5-4791-b112-1db66e8ae6a3
title: The slash menu is an announced listbox of text-only rows
description: While the slash menu is open, the extension SHALL expose it as a
  listbox named Commands with option rows, announce the number of commands in a
  polite live region, set every entry as text, and keep the lit command readable
  when the system forces colours.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-015
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/editPaletteStyles.ts
- src/page/modules/slashMenu.ts
tested_in_files:
- test/core/paste/paletteReq.requirements.test.ts
- test/page/modules/slashMenu.test.ts
default_owner_email: gaetan@xeberon.net
---

## The slash menu is an announced listbox of text-only rows

### Normative behavior

While the slash menu is open, the extension SHALL expose it as a listbox named Commands with option rows, announce the number of commands in a polite live region, set every entry as text, and keep the lit command readable when the system forces colours.

### Scenario (nominal): Open menu
- GIVEN an open menu
- WHEN the accessibility state is read
- THEN the list has the role listbox and the name Commands, the rows have the role option and the text box points at the lit row with aria-activedescendant, aria-expanded and aria-controls

### Scenario (boundary): Closed menu
- GIVEN the menu closes
- WHEN the text box is read
- THEN the three attributes are gone

### Scenario (boundary): Live region count
| Matches | Live region text |
| --- | --- |
| 3 | 3 commands available |
| 1 | 1 command available |
| none | No command |

### Scenario (refusal): Entry text is never markup
| Given | When | Outcome |
| --- | --- | --- |
| a command label that contains a tag | the menu renders | the tag is shown as text |
| a command with an icon | the menu renders | the icon is the static SVG of the palette button, the only markup |
| a command with a shortcut and a category | the menu renders | both are set as text |

### Scenario (boundary): Forced colours
| Mode | Colours |
| --- | --- |
| system in forced-colours mode | the menu is drawn with Canvas and CanvasText; the lit command has background Highlight, text HighlightText and its category and shortcut HighlightText |
| usual mode | the theme colours are used |

### Verification notes

- Method: test/page/modules/slashMenu.test.ts (scenarios "Open menu", "Closed menu", "Live region count", "Entry text is never markup": ARIA listbox, options, activedescendant on the text box, a polite live count, entry text set as text)
- Method: test/core/paste/paletteReq.requirements.test.ts (scenario "Forced colours": the slash menu uses Canvas and the lit command Highlight; the usual-mode row is untested)
- Method: visual scenarios palette-slash/v11-slash-strict-light-900, palette-slash/v12-slash-gfm-light-900, palette-slash/v13-slash-myst-light-900, palette-slash/v14-slash-myst-filtered-dark-900 ("Open menu": the menu exposes its ARIA state)
- Criteria: Each row has an id and aria-selected; the groups have the role group and are labelled by their heading. The live region has role status and aria-live polite. No user text reaches innerHTML. The lit option has a 2 px Highlight outline in forced-colours mode.
