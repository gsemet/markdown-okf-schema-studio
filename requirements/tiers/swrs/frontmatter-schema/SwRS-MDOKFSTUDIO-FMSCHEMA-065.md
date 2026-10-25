---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-065
uuid: 0cdf91d6-78cf-4b93-8556-8f43d0f4b01a
title: Links are shown as pending on the first paint
description: When the table is first rendered, the extension SHALL show each
  annotated link value with its text, a spinner and the status "File links are
  being resolved", without the Studio link tooltip.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-063; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-063
---

## Links are shown as pending on the first paint

### Normative behavior

When the table is first rendered, the extension SHALL show each annotated link value with its text, a spinner and the status "File links are being resolved", without the Studio link tooltip.

### Scenario: First paint

- GIVEN a document with annotated links
- WHEN the preview is first rendered
- THEN each link shows its text and a spinner labelled File links are being resolved and is marked busy

### Scenario: Pending link

- GIVEN the pointer is moved over a pending link
- WHEN the pointer rests on it
- THEN the Studio link tooltip is not shown

### Verification notes

- Method: Unit test of the table renderer; visual scenario.
- Criteria: The first render and the 300 ms table refresh do not touch the file system for links.
- Known issue: a pending link still carries the native title "Loading linked file" and its spinner the native title "File links are being resolved", so the browser may show a plain tooltip.
