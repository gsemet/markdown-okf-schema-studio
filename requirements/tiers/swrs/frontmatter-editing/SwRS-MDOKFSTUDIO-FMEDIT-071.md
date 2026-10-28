---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-071
uuid: 17cd981f-779c-4bda-8d5c-09ce992bcaa1
title: A refused plain save is saved again as a flush before a navigation
description: When a navigation waits for a plain save that the host refuses, the
  extension SHALL re-enable the editor and save the typed text again as a flush
  before navigating.
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
default_owner_email: gaetan@xeberon.net
---

## A refused plain save is saved again as a flush before a navigation

### Normative behavior

When a navigation waits for a plain save that the host refuses, the extension SHALL re-enable the editor and save the typed text again as a flush before navigating.

### Scenario: Nominal

- GIVEN a plain save in flight and a navigation waiting
- WHEN the host refuses the save
- THEN the typed text is posted again as a flush, then the navigation goes on

### Scenario: Boundary or refusal

- GIVEN a pending plain save that gets no result
- WHEN the bounded wait of about 1.5 seconds elapses
- THEN the navigation goes on; a plain save accepted before the flush is not saved twice

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeEditorFlush.test.ts).
- Criteria: Tests CR 025 a blur save refused before a host flush is saved again as a flush; accepted is not saved twice; no result still answers after a bounded wait.
