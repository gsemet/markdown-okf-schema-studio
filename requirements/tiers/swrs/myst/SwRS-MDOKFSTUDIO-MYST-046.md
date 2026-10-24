---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-046
uuid: d057c8f9-3a4b-4cbe-99ab-6ea96b8b2bfe
title: A valid rename edits only the label text as one undo step
description: When a valid rename is accepted, the extension SHALL change only
  the `(old)=` text of that line as one undo step of the source editor, keeping
  surrounding whitespace and CRLF endings.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-010
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A valid rename edits only the label text as one undo step

### Normative behavior

When a valid rename is accepted, the extension SHALL change only the `(old)=` text of that line as one undo step of the source editor, keeping surrounding whitespace and CRLF endings.

### Scenario: Nominal

- GIVEN the line `  (old)=` with CRLF
- WHEN a valid rename to `new` is accepted
- THEN only the label text changes, whitespace and CRLF stay, and one undo restores it

### Scenario: Boundary or refusal

- GIVEN `{ref}` uses of the old name
- WHEN a rename is accepted
- THEN they are not rewritten

### Verification notes

- Method: test
- Criteria: Edit is a single editor operation.
