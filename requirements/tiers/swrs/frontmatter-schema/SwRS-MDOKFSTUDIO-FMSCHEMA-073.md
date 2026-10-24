---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-073
uuid: 79fa8d77-0296-4b3b-be82-3d980dfb8f40
title: Activating a resolving link opens its target
description: When a writer activates a resolving frontmatter link (click or
  Enter in read mode, Cmd or Ctrl and click in edit mode), the extension SHALL
  open the target in the editor at the marker line when the annotation has a
  `basename_marker`, keeping the query and fragment and recording the jump in
  the Back and Next history.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-018
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Activating a resolving link opens its target

### Normative behavior

When a writer activates a resolving frontmatter link (click or Enter in read mode, Cmd or Ctrl and click in edit mode), the extension SHALL open the target in the editor at the marker line when the annotation has a `basename_marker`, keeping the query and fragment and recording the jump in the Back and Next history.

### Scenario: Follow with a marker

- GIVEN a valid link whose annotation has a basename_marker found at line 10 of the target
- WHEN the writer presses Enter on it in read mode
- THEN the target opens in the editor at line 10 and the history gains an entry

### Scenario: Edit mode

- GIVEN the preview is in edit mode and the link sits in an editable value cell
- WHEN the writer clicks the link without a modifier
- THEN the field editor opens and the link is not followed; Cmd or Ctrl and click follows it

### Verification notes

- Method: Integration test.
- Criteria: Filename-stem links are re-resolved at click time. When no line carries the marker, the target still opens, at the top.
