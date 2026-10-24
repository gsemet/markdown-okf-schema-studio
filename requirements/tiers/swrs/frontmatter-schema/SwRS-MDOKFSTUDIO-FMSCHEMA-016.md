---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-016
uuid: 57fd7f83-c45e-4a29-a67f-af919bf1b10c
title: Narrow previews start with the Description column collapsed
description: When a document has no remembered Description choice and the
  preview is 640 px wide or less at page start, the extension SHALL start with
  the Description column collapsed.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Narrow previews start with the Description column collapsed

### Normative behavior

When a document has no remembered Description choice and the preview is 640 px wide or less at page start, the extension SHALL start with the Description column collapsed.

### Scenario: Narrow start

- GIVEN a preview 640 px wide and no remembered choice
- WHEN the page starts
- THEN the Description column is collapsed

### Scenario: Wide start

- GIVEN a preview 641 px wide and no remembered choice
- WHEN the page starts
- THEN the Description column is shown

### Verification notes

- Method: Unit test of the page start state; visual scenarios at 460 px.
- Criteria: The width is measured once, at page start (window.innerWidth <= 640).
- Known issue: resizing the preview afterwards does not change the choice.
