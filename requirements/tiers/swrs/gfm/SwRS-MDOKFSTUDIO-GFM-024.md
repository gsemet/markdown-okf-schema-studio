---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-024
uuid: f44a29be-4b1d-4396-a256-2f771aa964ca
title: A refused toggle reverts the checkbox with a reason
description: When the host refuses a checkbox toggle, the extension SHALL revert
  the checkbox and put the reason in its tooltip.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-GFM-021; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-GFM-021
default_owner_email: gaetan@xeberon.net
---

## A refused toggle reverts the checkbox with a reason

### Normative behavior

When the host refuses a checkbox toggle, the extension SHALL revert the checkbox and put the reason in its tooltip.

### Scenario: Stale refusal reverts the box

- GIVEN a toggle refused as out of date
- WHEN the result arrives
- THEN the checkbox returns to its previous state and the tooltip reads 'The preview is out of date. Try again once it has refreshed.'

### Scenario: Marker gone

- GIVEN a toggle for a marker removed from the source
- WHEN the host plans the edit
- THEN it is refused with 'The checkbox is no longer in the source. Refresh the preview.'

### Scenario: Open edit

- GIVEN an open Markdown edit
- WHEN a toggle reaches the host
- THEN it is refused with 'Save or cancel the open Markdown edit before toggling a checkbox.'

### Scenario: Apply failure

- GIVEN VS Code fails to apply the edit
- WHEN the host applies the toggle
- THEN it is refused with 'VS Code could not apply the checkbox edit.' or the edit error

### Verification notes

- Method: Unit test "a rejected checkbox toggle reverts the box and explains why" in test/page/runtimePageControls.test.ts. Untested: the host refusal paths.
- Criteria: Box reverted and the matching reason shown for every refusal.
