---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-023
uuid: d6227a6d-cdfc-489e-9063-04bce3aa7e3c
title: A click on an image block opens its editor
description: When a writer clicks a plain image, or a raw img block, in edit
  mode, the page SHALL open the editor of that block.
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-003
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A click on an image block opens its editor

### Normative behavior

When a writer clicks a plain image, or a raw img block, in edit mode, the page SHALL open the editor of that block.

### Scenario: Plain image

- GIVEN a paragraph holding only an image in edit mode
- WHEN the writer clicks the image
- THEN the editor of the paragraph opens

### Scenario: Raw img block

- GIVEN an HTML img block in edit mode
- WHEN the writer clicks it
- THEN the editor of the block opens

### Verification notes

- Method: Real-input scenario scenarioImageEditing in test/integration/realInput/renderPatching.ts. No unit test.
- Criteria: Both blocks are mapped and open through the generic click path.
