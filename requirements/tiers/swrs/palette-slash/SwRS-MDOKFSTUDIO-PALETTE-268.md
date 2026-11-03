---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-268
uuid: 19c4cd5f-ce96-479f-80ac-133411de208e
title: The MyST slash menu lists every admonition directive with its icon
description: When the writer opens the slash menu in MyST mode, the extension
  SHALL list one entry for each of the admonition directives note, tip, hint,
  important, warning, caution, attention, danger, error, seealso, versionadded,
  versionchanged and deprecated and a custom admonition entry, each with the
  icon of its preview callout. When the writer picks a version admonition entry,
  the extension SHALL write a fenced block whose first line carries a version
  placeholder, selected.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-015
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/palette/paletteActions.ts
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/page/modules/slashMenu.test.ts
default_owner_email: gaetan@xeberon.net
---

## The MyST slash menu lists every admonition directive with its icon

### Normative behavior

When the writer opens the slash menu in MyST mode, the extension SHALL list one entry for each of the admonition directives note, tip, hint, important, warning, caution, attention, danger, error, seealso, versionadded, versionchanged and deprecated and a custom admonition entry, each with the icon of its preview callout. When the writer picks a version admonition entry, the extension SHALL write a fenced block whose first line carries a version placeholder, selected.

### Scenario (nominal): Every admonition kind is listed with its icon
- GIVEN the MyST mode and an empty text box
- WHEN / is typed
- THEN the list holds an entry "<kind> admonition" for note, tip, hint, important, warning, caution, attention, danger, error, seealso, versionadded, versionchanged and deprecated, and "Custom admonition", each with an icon

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

### Scenario (nominal): A version admonition asks for a version
- GIVEN the MyST mode and an empty text box
- WHEN /versionadded is typed and Enter is pressed
- THEN the text box holds the block `:::{versionadded} 1.0`, an empty line and `:::`, with 1.0 selected, in one undo step; versionchanged and deprecated write the same block with their name

### Scenario (boundary): The other modes and the type popover
- GIVEN the GFM mode, or the Admonition type popover of the MyST mode
- WHEN the slash menu or the popover is opened
- THEN the GFM menu lists no admonition entry, and the popover keeps offering only the ten simple types and Custom

### Verification notes

- Method: test/page/modules/slashMenu.test.ts, unit tests "P11: the MyST slash menu lists every admonition directive, each with its own icon" and "P11: /versionadded inserts a valid version admonition with the version selected".
- Criteria: The entries come from the Admonition variants of the palette registry; the icon of a variant is a palette icon named after the callout shape. The version admonitions are not options of the popover (see SwRS-MDOKFSTUDIO-PALETTE-127). The block renders as an admonition titled with the version (see SwRS-MDOKFSTUDIO-MYST-001).

### Related requirements
- SwRS-MDOKFSTUDIO-PALETTE-238: the slash menu lists the palette commands and their variants.
- SwRS-MDOKFSTUDIO-PALETTE-127: the Admonition action and its popover.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-015](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-015.md): A writer runs any palette command from an accessible slash menu
<!-- okf:links:end -->
