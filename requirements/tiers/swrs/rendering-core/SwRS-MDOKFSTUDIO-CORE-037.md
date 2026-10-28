---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-037
uuid: a76c4a8c-a569-446c-b829-b3771f612bb4
title: Reach the end of the document
description: When a document is shown, the extension SHALL keep a bottom padding
  so that its last block ends at least 30 px above the frame bottom.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-028; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-CORE-028
default_owner_email: gaetan@xeberon.net
---

## Reach the end of the document

### Normative behavior

When a document is shown, the extension SHALL keep a bottom padding so that its last block ends at least 30 px above the frame bottom.

### Scenario: Nominal reach the end of the document

- GIVEN a long document scrolled to its end
- WHEN the last block is shown
- THEN it ends at least 30 px above the frame bottom

### Scenario: Boundary or refusal of reach the end of the document

- GIVEN a short document
- WHEN it is shown
- THEN the same padding applies

### Verification notes

- Method: Visual scenario handbook-dark-bottom in test/visual/scenarioDefinitions1.ts
- Criteria: The last block bottom is at least 30 px from the frame bottom.
