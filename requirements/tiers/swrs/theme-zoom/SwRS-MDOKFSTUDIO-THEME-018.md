---
type: SwRS
id: SwRS-MDOKFSTUDIO-THEME-018
uuid: f6f099c6-66f9-4da6-8c8c-387d3d18b869
title: A high-contrast VS Code theme is followed like any other
description: When the VS Code theme is a high-contrast theme and the Current
  mode is shown, the extension SHALL take the page colours from the host theme
  variables as for any other theme.
project: markdown-okf-schema-studio
scope: theme-zoom
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-THEME-002
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## A high-contrast VS Code theme is followed like any other

### Normative behavior

When the VS Code theme is a high-contrast theme and the Current mode is shown, the extension SHALL take the page colours from the host theme variables as for any other theme.

### Scenario: High contrast dark

- GIVEN theme kind 3 reported by the host and the Current mode
- WHEN the page applies the theme
- THEN data-sphinx-preview-theme reads 3 and the page colours are the host variables, with no Studio palette applied

### Scenario: High contrast light

- GIVEN theme kind 4 reported by the host
- WHEN the page applies the theme
- THEN data-sphinx-preview-theme reads 4 and the colours again come from the host variables

### Verification notes

- Method: Untested: no test or visual scenario uses a high-contrast host (the unit test uses kind 2). The forced-colors media rules of the stylesheet cover the warning banner border, the diff lines, the focus outline and the slash menu only; there is no rule for the page palette.
- Criteria: By code reading only; the property to test is that no rule overrides the host variables in Current mode.
