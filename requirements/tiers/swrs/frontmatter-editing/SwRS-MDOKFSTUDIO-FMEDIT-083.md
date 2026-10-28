---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-083
uuid: 51009a9c-74b0-4839-a8ab-c37a45184dd0
title: A save for a missing field or revision is refused as stale
description: "When a frontmatter save names a field absent from the current analysis
  or a document revision that no longer matches, the extension SHALL answer \"The
  frontmatter field is stale or its value does not match the schema.\""
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-016; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-016
default_owner_email: gaetan@xeberon.net
---

## A save for a missing field or revision is refused as stale

### Normative behavior

When a frontmatter save names a field absent from the current analysis or a document revision that no longer matches, the extension SHALL answer "The frontmatter field is stale or its value does not match the schema."

### Scenario: Nominal

- GIVEN a save for a field name absent from the current analysis
- WHEN the host plans the save
- THEN the answer is the stale-field message and the document is unchanged

### Scenario: Boundary or refusal

- GIVEN a save whose revision differs from the document revision
- WHEN the host receives it
- THEN the same stale-field message is the answer

### Known issues

- Known issue: the stale-field message is shared by stale renders and schema mismatches.

### Verification notes

- Method: Unit test on the save plan (test/core/edits/frontmatterEdit.test.ts) and inspection of currentPreviewDocument.
- Criteria: Adding a name that already exists gets the same message.
