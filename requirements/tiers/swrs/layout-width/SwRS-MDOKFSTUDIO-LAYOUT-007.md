---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-007
uuid: 5ae08f04-3c6c-4cc7-b00c-5a51867f151a
title: The first element starts 40 px below the top in read mode
description: When a document opens in read mode, the extension SHALL start its
  first element 40 px below the top of the pane as a top margin of that element,
  whatever the element is.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The first element starts 40 px below the top in read mode

### Normative behavior

When a document opens in read mode, the extension SHALL start its first element 40 px below the top of the pane as a top margin of that element, whatever the element is.

### Scenario: Paragraph first

- GIVEN a document whose first element is a paragraph, read mode, 900 px pane
- WHEN the preview is rendered
- THEN the paragraph starts 40 px (within 4 px) below the top of the pane

### Scenario: Elements with their own margin

- GIVEN documents that open with an h1, an h2, an h3, a table, an image, an admonition, a properties table or a schema properties table
- WHEN each preview is rendered
- THEN each first element starts 40 px (within 4 px) below the top, and the column itself has no 40 px padding and does not move

### Known issues

- Known issue: CHANGELOG entry 0.2.1 still quotes superseded margins (56 px for the first-block editor, 24 px for Start writing); the uniform 40 px of the Unreleased entry replaces them.

### Verification notes

- Method: Unit test of the first-child rule (and the absence of 40 px column padding) plus the first-element gap visual checks of the family v10 to v65 in read mode.
- Criteria: The first child of the content column has margin-top 40 px and measures 40 px (within 4 px) from the top.
