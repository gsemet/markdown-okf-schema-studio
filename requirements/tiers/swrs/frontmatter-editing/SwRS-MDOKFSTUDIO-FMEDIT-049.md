---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-049
uuid: 361a71b8-b7c5-4894-9aec-e7f526cf6928
title: Only errors of the edited field block a save
description: When the edited field has no schema error other than a link
  problem, the extension SHALL accept the save even if other fields or links of
  the frontmatter are invalid.
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

## Only errors of the edited field block a save

### Normative behavior

When the edited field has no schema error other than a link problem, the extension SHALL accept the save even if other fields or links of the frontmatter are invalid.

### Scenario: Nominal

- GIVEN an edited field whose only error is a broken link
- WHEN the save arrives
- THEN the save is accepted

### Scenario: Boundary or refusal

- GIVEN another field of the frontmatter with a schema error
- WHEN a different field is edited with a valid value
- THEN the save is accepted

### Verification notes

- Method: Unit test on the candidate check (test/core/edits/frontmatterEdit.test.ts).
- Criteria: Only the edited field's issues with origin other than link are considered.
