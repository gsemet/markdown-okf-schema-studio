---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-055
uuid: 2fa293cf-9ed3-487f-adbf-5d8c8c37cb4e
title: Each frontmatter save is one document edit
description: When the host applies a frontmatter save, the extension SHALL apply
  it as one edit of the document so that one Undo reverts it.
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-BLOCK-058; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-BLOCK-058
default_owner_email: gaetan@xeberon.net
---

## Each frontmatter save is one document edit

### Normative behavior

When the host applies a frontmatter save, the extension SHALL apply it as one edit of the document so that one Undo reverts it.

### Scenario: Nominal

- GIVEN a value save, an add, a rename or a remove
- WHEN the host applies it
- THEN exactly one text edit is passed to the document

### Scenario: Boundary or refusal

- GIVEN the document in the text editor after the save
- WHEN the writer presses Undo once
- THEN the document returns to its text before the save

### Verification notes

- Method: Unit test a value save, an add, a rename and a remove are each one text edit of the document in test/host/fmtableReq.requirements.test.ts. Untested: the Undo step itself needs a real VS Code window.
- Criteria: applyEdits receives a single-element list.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-001](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-001.md): A writer edits metadata values in place with fitting controls
- Superseded by:
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
<!-- okf:links:end -->
