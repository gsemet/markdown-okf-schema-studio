---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-022
uuid: 5745c6d3-1480-4d4b-9435-b83a3df2119a
title: "A diagram under edit is hidden"
description: "When a block editor is open on a diagram block, the page SHALL hide
  the rendered block with display none and show the editor after it, and show the
  block again when the editor closes."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-001
default_owner_email: gaetan@xeberon.net
---

## A diagram under edit is hidden

### Normative behavior

When a block editor is open on a diagram block, the page SHALL hide the rendered block with display none and show the editor after it, and show the block again when the editor closes.

### Scenario: Editor opens

- GIVEN a Mermaid figure in edit mode
- WHEN a block editor opens on the diagram block
- THEN the figure carries data-sphinx-preview-editing true and is not displayed, with the editor placed right after it

### Scenario: Editor closes

- GIVEN an open editor on a diagram
- WHEN the editor closes
- THEN the attribute is removed and the diagram is displayed again

### Known issues

- Known issue: There is no live preview of the diagram while it is edited (absent from docs/known-limitations.md).
- Known issue: A theme change still redraws a hidden Mermaid diagram because the theme observer draws every diagram.

### Verification notes

- Method: Unit test `a diagram block is hidden while its editor is open and shown again when it closes` in `test/page/diagReq.diagramEdit.requirements.test.ts`.
- Criteria: The block is hidden only while its editor is open.
