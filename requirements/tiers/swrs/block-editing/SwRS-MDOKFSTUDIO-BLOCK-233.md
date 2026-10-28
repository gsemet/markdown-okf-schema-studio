---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-233
uuid: d6ce571b-3366-43a2-b6c1-0eb3026f30b1
title: Overlapping or out-of-range text edits are refused
description: When text edits overlap each other or lie outside the text,
  applyTextEdits SHALL throw a RangeError and change nothing.
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-025
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## Overlapping or out-of-range text edits are refused

### Normative behavior

When text edits overlap each other or lie outside the text, applyTextEdits SHALL throw a RangeError and change nothing.

### Scenario: Overlap

- GIVEN two overlapping edits
- WHEN they are applied
- THEN a RangeError is thrown

### Scenario: Outside

- GIVEN an edit whose end is beyond the text
- WHEN it is applied
- THEN a RangeError is thrown

### Verification notes

- Method: Unit test `overlapping or out-of-range text edits are refused` in test/core/edits/textEdit.test.ts.
- Criteria: The check covers non-integer, negative and reversed offsets as well.
