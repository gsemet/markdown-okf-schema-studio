---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-071
uuid: fece009c-782f-4169-a9a5-1688b5099ac8
title: A link tooltip appears on hover and focus
description: When a writer hovers or focuses a link value that is not pending,
  the extension SHALL show its full title in a tooltip below it, or above it
  when there is no room, never under the toolbar and at most 480 px wide.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-017
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A link tooltip appears on hover and focus

### Normative behavior

When a writer hovers or focuses a link value that is not pending, the extension SHALL show its full title in a tooltip below it, or above it when there is no room, never under the toolbar and at most 480 px wide.

### Scenario: Hover

- GIVEN a resolved link near the middle of the page
- WHEN the pointer rests on it
- THEN a tooltip with its title appears below it, at most 480 px wide

### Scenario: No room below

- GIVEN a link at the bottom of the page
- WHEN it is focused
- THEN the tooltip is placed above it and stays clear of the toolbar

### Verification notes

- Method: Page unit tests; real-input and integration tests.
- Criteria: Invalid and unavailable spans are focusable and have the same tooltip.
