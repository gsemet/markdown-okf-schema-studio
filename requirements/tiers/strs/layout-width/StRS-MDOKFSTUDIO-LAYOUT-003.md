---
type: StRS
id: StRS-MDOKFSTUDIO-LAYOUT-003
uuid: 9806c49c-5f3c-41ac-a8af-165b5cae728f
title: The text column width follows a setting
description: When a writer or team sets the maximum width of the text column,
  the Studio SHALL limit and centre the column of every preview to that width
  and follow later changes of the setting.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer or team, I choose how wide the text column is, from a
  narrow measure to the whole pane, and every open preview follows.
derived_by:
- SwRS-MDOKFSTUDIO-LAYOUT-002
- SwRS-MDOKFSTUDIO-LAYOUT-003
- SwRS-MDOKFSTUDIO-LAYOUT-004
- SwRS-MDOKFSTUDIO-LAYOUT-005
- SwRS-MDOKFSTUDIO-LAYOUT-006
- SwRS-MDOKFSTUDIO-LAYOUT-036
---

## The text column width follows a setting

### Normative behavior

When a writer or team sets the maximum width of the text column, the Studio SHALL limit and centre the column of every preview to that width and follow later changes of the setting.

### Preserved stakeholder intent

As a writer or team, I choose how wide the text column is, from a narrow measure to the whole pane, and every open preview follows.

### Rationale and constraints

- Accepted values are 0 to 2400 pixels (default 960, step 50 in the settings UI): 1 to 2400 limits and centres the column, 0 lifts the limit, a larger value is cut to 2400, a negative or non-numeric value falls back to 960 and a decimal is rounded (`normalizePreviewContentWidth` in `src/core/configuration/settingsRegistry.ts`).
- At 100% zoom a pane wider than the cap shows a column exactly the cap wide and centred (960 px by default in a 1600 px pane, 1400 px in a 2000 px pane); the zoom scaling of the column belongs to the theme-zoom scope.
- The rule is written into each rendered page, and a change of the setting updates open previews from their last good render without reloading the editor.
- Known issue: the README says that with the setting at 0 the three width modes look the same, which is not exact because Full width keeps a 16 px gutter while the other modes keep up to 78 px.
- Known issue: the update of an open preview after a setting change has no automated test.
