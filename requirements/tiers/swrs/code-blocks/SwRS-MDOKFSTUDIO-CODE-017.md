---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-017
uuid: 840b982c-ce45-4694-8991-d5240d6004c3
title: Show a Copy code button on hovered code blocks
description: When the pointer is over a code block of the preview content, the
  extension SHALL show a 26 px Copy code button 6 px inside the block's
  top-right corner.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Show a Copy code button on hovered code blocks

### Normative behavior

When the pointer is over a code block of the preview content, the extension SHALL show a 26 px Copy code button 6 px inside the block's top-right corner.

Known issue: the button is revealed by the pointer only (mouseover and mousemove), there is no keyboard path to show or focus it (backlog P2/copy-button-keyboard).

### Scenario: nominal behavior

- GIVEN a code block under the pointer
- WHEN the pointer enters the block
- THEN a 26 px Copy code button appears 6 px inside its top-right corner

### Scenario: boundary or refusal behavior

- GIVEN no code block has been hovered yet
- WHEN the page is loaded
- THEN no copy button exists in the page

### Verification notes

- Method: Unit test and copy-button visual scenarios.
- Criteria: Button geometry matches the statement; the button is created only on first hover.
