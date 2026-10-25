---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-070
uuid: 2d833936-63ba-4412-880a-238cff4e0f99
title: A normal frontmatter save carries no flush flag
description: When a writer commits a field editor with Enter or by leaving it,
  the extension SHALL post the save without the flush flag.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-067; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-067
---

## A normal frontmatter save carries no flush flag

### Normative behavior

When a writer commits a field editor with Enter or by leaving it, the extension SHALL post the save without the flush flag.

### Scenario: Nominal

- GIVEN a field editor committed with Enter
- WHEN the save is posted
- THEN the message has no flush property

### Scenario: Boundary or refusal

- GIVEN an editor flushed by a navigation
- WHEN the save is posted
- THEN the message has flush true

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeEditorFlush.test.ts).
- Criteria: Test CR 025 a normal frontmatter save does not carry the flush flag.
