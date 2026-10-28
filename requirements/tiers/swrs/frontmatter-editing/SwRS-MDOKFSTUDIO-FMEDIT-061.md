---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-061
uuid: 102fd29c-b166-44e4-908e-7d3f990b2ba3
title: A content patch closes the field editor
description: "When a content patch of the page arrives while a field editor is open,
  the extension SHALL close the editor and drop the waiting properties update."
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-BLOCK-193; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-BLOCK-193
default_owner_email: gaetan@xeberon.net
---

## A content patch closes the field editor

### Normative behavior

When a content patch of the page arrives while a field editor is open, the extension SHALL close the editor and drop the waiting properties update.

### Scenario: Nominal

- GIVEN a field editor with typed text and a waiting properties update
- WHEN a previewContentPatch arrives
- THEN the editor closes without a save and the waiting update is dropped

### Scenario: Boundary or refusal

- GIVEN no editor open
- WHEN a content patch arrives
- THEN the patch is applied normally

### Known issues

- Known issue: a content patch closes an open field editor and loses its typed text.

### Verification notes

- Method: Unit test a content patch closes an open field editor without a save and drops the waiting properties update in test/page/fmtableReqFrontmatter.requirements.test.ts.
- Criteria: closeFrontmatterEditor is called with the reason content patch.
