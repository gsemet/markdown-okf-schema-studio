---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-238
uuid: f553ecfb-b7f2-48b7-afda-9800d33981b4
title: The slash menu lists the palette commands of the mode and scope
description: When the slash menu opens, the extension SHALL list the actions of
  the palette for the current mode and scope in the order of the buttons,
  without the buttons that depend on the caret and are hidden, together with the
  variants and the two list entries, grouped under category headings with an
  icon and a shortcut while the query is empty, and a disabled No command row
  when the query matches nothing.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-015
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-001
scenarios:
- id: S1
  title: The mode lists
- id: S2
  title: An empty query groups the commands, a query ranks them
- id: S3
  title: Variants run an action with a ready-made argument
- id: S4
  title: MyST admonitions are listed with their icons
- id: S5
  title: The Key commands in MyST mode
- id: S6
  title: A query that matches nothing
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/palette/paletteActions.ts
- src/page/modules/editPalette.ts
- src/page/modules/slashMenu.ts
tested_in_files:
- test/integration/realInput/textEditing.ts
- test/page/modules/slashMenu.test.ts
- test/visual/slashAdmonitionScenarios.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-PALETTE-268
---

## The slash menu lists the palette commands of the mode and scope

### Normative behavior

When the slash menu opens, the extension SHALL list the actions of the palette for the current mode and scope in the order of the buttons, without the buttons that depend on the caret and are hidden, together with the variants and the two list entries, grouped under category headings with an icon and a shortcut while the query is empty, and a disabled No command row when the query matches nothing.

### Scenario S1 (nominal): The mode lists
- GIVEN the strict, GFM and MyST modes
- WHEN the menu opens in each
- THEN it lists the same actions as the palette buttons of that mode and nothing of a higher mode, plus Bulleted list and Numbered list

| Case | Outcome |
| --- | --- |
| strict, GFM or MyST mode | the actions of the palette buttons of that mode, in the order of the buttons, with Bulleted list and Numbered list |
| caret inside a colour code | the Colour code command is listed as well |
| caret outside a colour code | the Colour code command is not listed |
| caret inside a pipe table | List table is listed, Pipe table is not (see SwRS-MDOKFSTUDIO-TABLE-122) |
| caret inside a list table | Pipe table is listed, List table is not (see SwRS-MDOKFSTUDIO-TABLE-122) |

### Scenario S2 (nominal): An empty query groups the commands, a query ranks them
- GIVEN the MyST mode and the menu just opened
- WHEN the list is inspected, then the query tab is typed
- THEN the empty query shows headings Text, Blocks, Insert, Annotations, GFM and MyST in registry order, each row with an icon, the label and the shortcut where there is one, and the query shows one list, the best match first, each row with its category name

| Query | Outcome |
| --- | --- |
| empty | commands under the headings Text, Blocks, Insert, Annotations, GFM and MyST in registry order, each with its icon and its shortcut when it has one |
| not empty | one list, the best match first, each command with its category name |

### Scenario S3 (nominal): Variants run an action with a ready-made argument
- GIVEN the strict mode, then the MyST mode
- WHEN /h2 is typed and chosen, then /warning is typed
- THEN the line gets the prefix ## as with the Heading popover and the parent entry Heading is not listed, and the Warning alert and the Warning admonition are listed, the MyST one first

| Variants | Outcome |
| --- | --- |
| Heading 1 to Heading 5 and Paragraph | run Heading with the argument that choosing the same option in the Heading popover gives |
| one Alert per type | run Alert with the argument of the same option in the Alert popover |
| one admonition per type | run Admonition with the argument of the same option in the Admonition popover, plus the version admonitions (see the scenario of the admonition entries below) |
| the pickers Alert, Admonition and Code block | stay listed |

### Scenario S4 (nominal): MyST admonitions are listed with their icons

- GIVEN the MyST mode and an empty text box
- WHEN / is typed
- THEN the list holds an entry "<kind> admonition" for note, tip, hint, important, warning, caution, attention, danger, error, seealso, versionadded, versionchanged and deprecated, and "Custom admonition", each with the icon of its preview callout badge

| Kind | Icon (as the preview callout badge) |
| --- | --- |
| note | information circle |
| tip, hint, versionadded | light bulb |
| important | star |
| warning, attention, versionchanged | triangle |
| caution | octagon |
| danger, error, deprecated | circle with a cross |
| seealso | circle with an arrow |
| Custom admonition | the Admonition icon |

- GIVEN the MyST mode and an empty text box
- WHEN /versionadded is typed and Enter is pressed
- THEN the text box holds the block `:::{versionadded} 1.0`, an empty line and `:::`, with 1.0 selected, in one undo step; versionchanged and deprecated write the same block with their name

- GIVEN the GFM mode, or the Admonition type popover of the MyST mode
- WHEN the slash menu or the popover is opened
- THEN the GFM menu lists no admonition entry, and the popover keeps offering only the ten simple types and Custom (the version admonitions are not options of the popover, see SwRS-MDOKFSTUDIO-PALETTE-127)

### Scenario S5 (boundary): The Key commands in MyST mode
- GIVEN the MyST mode, then the GFM mode
- WHEN /kbd is typed
- THEN in MyST mode Key (MyST) is first and Key is also listed; in GFM mode Key is first and Key (MyST) is not listed

| Palette mode | Outcome |
| --- | --- |
| myst | Key and Key (MyST) are both listed; Key (MyST) ranks first for the queries kbd and key |
| gfm | Key is listed, Key (MyST) is not |

### Scenario S6 (refusal): A query that matches nothing
- GIVEN an open menu
- WHEN the query zzzz is typed, then Backspace removes the query and the slash
- THEN a disabled row No command is shown, the live region reads No command and Enter inserts a line break, then the menu closes

| State | Outcome |
| --- | --- |
| query matches no command | a disabled row No command, announced; Enter and Tab are left to the editor |
| Backspace removes the query and the slash | the menu closes |

### Related requirements
- SwRS-MDOKFSTUDIO-PALETTE-001: the palette mode and the buttons of each mode.
- SwRS-MDOKFSTUDIO-PALETTE-240: how a query ranks the commands.
- SwRS-MDOKFSTUDIO-PALETTE-232: when the menu opens.

### Verification notes
- Method: test/page/modules/slashMenu.test.ts, unit tests "P11: the menu lists exactly the actions of the palette for each mode" (mode lists), "P11: the colour-code button is listed only with the caret inside a colour code" (colour code), "P11: the empty query groups by category, a query lists best match first with the category" (grouping and ranked list), "P11: variants write what choosing the option in the palette popover writes" and "P11: heading is offered as Heading 1 to 5 and Paragraph, alerts and admonitions as their types" (variants), "P11 r2: in MyST the MyST entry ranks before its GFM equivalent; GFM and exact labels are unchanged" (the kbd rows), "P11: no command shows a No command row; Enter and Tab are left to the editor" (No command).
- Method: test/page/modules/slashMenu.test.ts, unit tests "P11: the MyST slash menu lists every admonition directive, each with its own icon" and "P11: /versionadded inserts a valid version admonition with the version selected"; visual scenarios palette-slash/v34-slash-myst-admonitions-light-900 and palette-slash/v35-slash-myst-admonitions-dark-900 (the menu scrolled to its last entries, with the icons). The block renders as an admonition titled with the version (see SwRS-MDOKFSTUDIO-MYST-001).
- Method: test/page/modules/editPalette.test.ts, unit test "CR038: the slash menu offers the conversion only inside a table of the other form" (List table and Pipe table rows of the mode lists).
- Method: test/integration/realInput/markers.ts and the real-window scenario scenarioSlashMenu in test/integration/realInput/textEditing.ts (palette-slash/r01-slash-no-command) (No command).
- Method: visual scenarios palette-slash/v11-slash-strict-light-900, palette-slash/v12-slash-gfm-light-900, palette-slash/v13-slash-myst-light-900 (mode lists and grouping), palette-slash/v14-slash-myst-filtered-dark-900 (ranked list with categories), palette-slash/v12-slash-gfm-light-900 (the nomatch state), palette-slash/v09-mode-myst-light-900 (the kbd role button).
- Criteria: The entries are those returned by the palette, so the menu rebuilds with the palette mode. The groups follow the first appearance of each palette group; the shortcut text is the one of the palette tooltip. The aliases are h1 title heading1, h2 heading2 and so on, text plain p for Paragraph, the type name callout github for alerts and the type name callout admonition for admonitions (see also for See also). The No command row has the role option, aria-disabled true and data-slash-none. SwRS-MDOKFSTUDIO-PALETTE-001 states that both Key buttons are offered in MyST mode.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-015](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-015.md): A writer runs any palette command from an accessible slash menu
- Depends on:
  - [SwRS-MDOKFSTUDIO-PALETTE-001](SwRS-MDOKFSTUDIO-PALETTE-001.md): The palette mode decides the button sets, in registry order
- Supersedes:
  - [SwRS-MDOKFSTUDIO-PALETTE-268](SwRS-MDOKFSTUDIO-PALETTE-268.md): The MyST slash menu lists every admonition directive with its icon
<!-- okf:links:end -->
