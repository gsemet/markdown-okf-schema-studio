---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-006
uuid: a77e17ef-100c-4c4b-ad2c-8f5d6a56938f
title: Open previews follow a change of the width setting
description: When the setting maxContentWidth changes, the extension SHALL read
  it again and update every open preview from its last good render without
  reloading the editor.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Open previews follow a change of the width setting

### Normative behavior

When the setting maxContentWidth changes, the extension SHALL read it again and update every open preview from its last good render without reloading the editor.

### Scenario: Setting changed with a preview open

- GIVEN an open preview that has a last good render and maxContentWidth changed from 960 to 1200
- WHEN the settings change event arrives
- THEN the session re-reads the preview configuration, schedules the incoming-changes refresh, and updates the preview from the last good render; the page shell now carries the new width rule, so the whole page is replaced (no in-place content patch)

### Scenario: No last good render or unrelated section

- GIVEN an open preview that has no last good render yet, or a settings change outside the preview, PlantUML and frontmatter sections
- WHEN the settings change event arrives
- THEN the preview is not updated (no change for an unrelated section; nothing to redraw without a last good render)

### Known issues

- Known issue: No automated test changes the setting on an open preview.
- Known issue: The width rule is an inline style of the page shell and the shell key includes it, so a changed rule makes the content patch planner return nothing and the whole page is replaced; the scroll position is restored by the normal page reload path.

### Verification notes

- Method: Inspection of onSettingsChanged and of the content patch planner (the shell key differs when the rule differs, and maxContentWidth is not a startup setting); no automated test changes the setting on an open preview.
- Criteria: The handler re-reads the section and calls the preview update with the last good render, only when one exists.
