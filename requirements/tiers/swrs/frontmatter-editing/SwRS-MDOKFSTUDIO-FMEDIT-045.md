---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-045
uuid: 0f9df557-4f33-4644-9edf-8c2951ff0525
title: A frontmatter edit that loses or corrupts a key is refused
description: When a frontmatter edit would leave a block that does not parse or
  whose keys are not exactly the expected ones, the extension SHALL refuse it
  with "The frontmatter YAML could not be updated."
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-043; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-043
default_owner_email: gaetan@xeberon.net
---

## A frontmatter edit that loses or corrupts a key is refused

### Normative behavior

When a frontmatter edit would leave a block that does not parse or whose keys are not exactly the expected ones, the extension SHALL refuse it with "The frontmatter YAML could not be updated."

### Scenario: Nominal

- GIVEN a patch that deletes the author key or duplicates the status key
- WHEN the patch guard checks it
- THEN it is refused and no edit is applied; the host answers "The frontmatter YAML could not be updated."

### Scenario: Boundary or refusal

- GIVEN a faithful patch of the status line, or a patch that leaves invalid YAML
- WHEN the patch guard checks it
- THEN the first passes unchanged and the second is refused

### Verification notes

- Method: Unit test on the patch guard (test/core/frontmatter/frontmatterFence.test.ts).
- Criteria: Test patch guard refuses patches that lose, duplicate or corrupt a key.
