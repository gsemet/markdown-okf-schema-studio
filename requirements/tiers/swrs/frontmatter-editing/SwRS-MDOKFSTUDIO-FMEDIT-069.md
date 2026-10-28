---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-069
uuid: 49ecd8b5-f1a0-4058-8684-2543fc3af531
title: A refused flush warns that the typed text was dropped
description: When the host refuses a flush save, the extension SHALL show a
  warning that the typed text was not saved.
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

## A refused flush warns that the typed text was dropped

### Normative behavior

When the host refuses a flush save, the extension SHALL show a warning that the typed text was not saved.

### Scenario: Nominal

- GIVEN a flush save of the field status that the host refuses with a reason
- WHEN the host answers
- THEN a warning reads "Markdown OKF-Schema Studio could not save the text you typed in the frontmatter field "status": {reason}. That text was not saved."

### Scenario: Boundary or refusal

- GIVEN a normal save that is refused
- WHEN the host answers
- THEN no host warning is shown, only the error in the editor

### Verification notes

- Method: Unit test on flushRefusalMessage (test/core/preview/flushWait.test.ts) and inspection of postEditError.
- Criteria: The page is about to be replaced, so only a host warning is visible.
