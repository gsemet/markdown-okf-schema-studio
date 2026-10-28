---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-021
uuid: 679970ae-8f27-446f-80d5-a1a253a71c6a
title: Keep focus and editors untouched by the copy button
description: When the reader presses the copy button, the extension SHALL keep
  the focus of an open block editor, without opening or committing an editor or
  letting the click reach the block's own click handling.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-004
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CODE-019; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CODE-019
default_owner_email: gaetan@xeberon.net
---

## Keep focus and editors untouched by the copy button

### Normative behavior

When the reader presses the copy button, the extension SHALL keep the focus of an open block editor, without opening or committing an editor or letting the click reach the block's own click handling.

### Scenario: nominal behavior

- GIVEN a block editor is open elsewhere
- WHEN the reader presses the copy button
- THEN the editor keeps the focus

### Scenario: boundary or refusal behavior

- GIVEN edit mode is on
- WHEN the reader clicks the copy button of a block
- THEN the code is copied and no editor opens or commits

### Verification notes

- Method: Unit tests of mousedown and click handling.
- Criteria: mousedown is default-prevented; click does not propagate.
