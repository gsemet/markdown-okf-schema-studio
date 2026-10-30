---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-043
uuid: 0744ee93-51aa-474c-9333-77d4840754aa
title: The host refuses a rename while an edit is open
description: When a rename arrives while a block edit is open, the extension
  SHALL change nothing and answer Save or cancel the open Markdown edit before
  renaming a label.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-BLOCK-041; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-BLOCK-041
default_owner_email: gaetan@xeberon.net
---

## The host refuses a rename while an edit is open

### Normative behavior

When a rename arrives while a block edit is open, the extension SHALL change nothing and answer Save or cancel the open Markdown edit before renaming a label.

The host holds no state for a frontmatter edit: the page itself refuses to start a rename while a block or frontmatter editor is open (see the rename field requirement on open editors), so no request is sent in that case.

### Scenario: Nominal

- GIVEN a block editor open
- WHEN a rename request arrives
- THEN the answer carries that reason and nothing changes

### Scenario: Boundary or refusal

- GIVEN a frontmatter edit open in the page
- WHEN the writer clicks the anchor icon
- THEN the page opens its field disabled with Save or cancel the open edit before renaming a label, and sends no request

### Verification notes

- Method: Unit test "a rename while a block edit is open changes nothing and answers Save or cancel the open Markdown edit" in test/session/renderReq.labelRename.requirements.test.ts
- Criteria: The document is unchanged.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-009](../../strs/myst/StRS-MDOKFSTUDIO-MYST-009.md): A writer sees, links and renames labels safely
- Superseded by:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
<!-- okf:links:end -->
