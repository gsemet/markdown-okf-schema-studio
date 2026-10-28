---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-110
uuid: fab59073-58fe-48fd-9fc4-e96ae5791109
title: JAR results wait for an open block edit
description: When a block editor is open, the extension SHALL hold the JAR
  results and apply them after the edit ends instead of closing the editor.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-105; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-105
default_owner_email: gaetan@xeberon.net
---

## JAR results wait for an open block edit

### Normative behavior

When a block editor is open, the extension SHALL hold the JAR results and apply them after the edit ends instead of closing the editor.

### Scenario: Open editor

- GIVEN an open block editor and arriving JAR results
- WHEN the results are ready
- THEN they are held and the editor stays open

### Scenario: Editor closed

- GIVEN the editor closes
- WHEN the edit ends
- THEN the held results are applied, the latest one winning

### Verification notes

- Method: Unit test of the edit lock (deferred plantuml work, latest wins).
- Criteria: Work is deferred while editing.
