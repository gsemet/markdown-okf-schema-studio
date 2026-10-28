---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-028
uuid: f91be4a8-150b-4beb-85fd-f3a3ac3cb6e3
title: Full width removes the column limit
description: When the width mode is Full width, the extension SHALL lift the
  column limit and set the page side gutter to 16 px.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-022; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-LAYOUT-022
default_owner_email: gaetan@xeberon.net
---

## Full width removes the column limit

### Normative behavior

When the width mode is Full width, the extension SHALL lift the column limit and set the page side gutter to 16 px.

### Scenario: Full width in a wide pane

- GIVEN Full width mode and a 1600 px pane
- WHEN the preview is rendered
- THEN the column cap is 100000 px and the content gutter is 16 px

### Scenario: Compared with Margin

- GIVEN the same pane in Margin mode
- WHEN the preview is rendered
- THEN the content gutter is the clamp of 16 px, 8vw and 78 px, so up to 78 px each side instead of 16 px

### Known issues

- Known issue: docs/user/settings.md says that with the setting at 0 all three modes look the same, but Full width uses a 16 px gutter where Margin and Auto use up to 78 px (not identical, and not tested).

### Verification notes

- Method: Unit tests P7 full width uses the 16 px gutter a broken-out table keeps in auto and T10 full width lifts the column limit; visual width-mode checks.
- Criteria: The Full width rule sets column width 100000px and gutter 16px.
