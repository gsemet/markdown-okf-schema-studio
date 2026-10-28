---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-008
uuid: 00a4d76e-4417-433f-9bc1-806154cbe2ae
title: The first element starts 40 px below the top in edit mode
description: When a document opens in edit mode, the extension SHALL start its
  first element 40 px below the top of the pane, as it does in read mode.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-004
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-007; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-LAYOUT-007
default_owner_email: gaetan@xeberon.net
---

## The first element starts 40 px below the top in edit mode

### Normative behavior

When a document opens in edit mode, the extension SHALL start its first element 40 px below the top of the pane, as it does in read mode.

### Scenario: Paragraph and heading first

- GIVEN edit mode on and a document whose first element is a paragraph, then one that opens with an h1, h2 or h3
- WHEN the preview is rendered
- THEN the first element starts 40 px (within 4 px) below the top

### Scenario: Other first elements

- GIVEN edit mode on and a first element that is an image, an admonition, a table or a properties table
- WHEN the preview is rendered
- THEN the first element starts 40 px (within 4 px) below the top

### Known issues

- Known issue: Only visual scenarios check the edit-mode half; no unit test differs between the modes.

### Verification notes

- Method: Visual scenarios of the first-element gap family (edit-mode half); the CSS rule is unit-tested through the read-mode requirement.
- Criteria: The measured top of the first element is 40 px within 4 px.
