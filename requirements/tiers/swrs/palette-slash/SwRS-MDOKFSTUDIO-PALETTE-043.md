---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-043
uuid: 259e7f99-52a1-42a0-a3a7-9e483e798cf5
title: The Heading list sets the heading level of the touched lines
description: "When the writer presses the Heading button, the extension SHALL open
  a menu named Heading with the entries Paragraph and Heading 1 to Heading 5, and
  apply the chosen level by putting the matching number of # signs and a space in
  front of every non-blank line that the selection touches, replacing another level,
  and removing the prefix for Paragraph."
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/palette/paletteActions.ts
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/runtimeEditPalette.test.ts
default_owner_email: gaetan@xeberon.net
---

## The Heading list sets the heading level of the touched lines

### Normative behavior

When the writer presses the Heading button, the extension SHALL open a menu named Heading with the entries Paragraph and Heading 1 to Heading 5, and apply the chosen level by putting the matching number of # signs and a space in front of every non-blank line that the selection touches, replacing another level, and removing the prefix for Paragraph.

### Scenario (nominal): Choosing a level

- GIVEN a paragraph with the caret in it
- WHEN the writer presses Heading and chooses Heading 2
- THEN the list closes and the line starts with ## 

### Scenario (nominal): Menu entries and tooltip

- GIVEN the palette
- WHEN the writer hovers the Heading button and opens the menu
- THEN the tooltip reads Heading level and the menu items carry the option values 0 to 5 with the labels Paragraph, Heading 1 to Heading 5

### Scenario (nominal): Two lines

- GIVEN the selection a and b on two lines
- WHEN the level 2 is applied
- THEN both lines start with ## 

### Scenario (boundary): What counts as a heading line

- GIVEN a selection with the line of the table
- WHEN a level from 0 to 5 is applied
- THEN the outcome is the one of the table

| Line | Outcome |
| --- | --- |
| another heading level | the prefix is replaced by the chosen one |
| level 0 (Paragraph) | the prefix is removed |
| seven # signs | not a heading, gets the prefix |
| a # followed by text without a space | not a heading, gets the prefix |
| only one to six number signs | a heading |
| a single blank line | gets the prefix |
| other blank lines of a selection | left alone |

### Scenario (refusal): No change or unknown level

- GIVEN a line that already is a level 2 heading, or the level 9
- WHEN the action runs
- THEN no edit is produced

### Verification notes

- Method: test/page/runtimeEditPalette.test.ts (choosing a level, menu entries and tooltip: the heading list opens as a menu and choosing a level replaces the prefix); test/page/modules/editActions.test.ts (the palette actions declare their popovers, options and tooltips; data-driven unit tests named editActions heading, rows for two lines and the line table; heading without a change or with an unknown level returns no edit), with its marker file test/page/modules/editActions.test.ts
- Criteria: The menu items carry the option values 0 to 5 with the labels Paragraph, Heading 1 to Heading 5. A line of seven # signs, or a # followed by text without a space, is not a heading and gets the prefix, while a line holding only one to six number signs is a heading; a single blank line gets the prefix; other blank lines of a selection are left alone.
