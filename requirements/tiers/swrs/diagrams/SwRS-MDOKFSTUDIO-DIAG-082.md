---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-082
uuid: c7e0f9c9-6df0-4b93-82f4-1a2da40af13e
title: PlantUML messages use the error style
description: When a PlantUML diagram shows a message, the extension SHALL style
  it in the theme error colour in italics.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-008
- StRS-MDOKFSTUDIO-DIAG-013
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## PlantUML messages use the error style

### Normative behavior

When a PlantUML diagram shows a message, the extension SHALL style it in the theme error colour in italics.

### Scenario: Message

- GIVEN a PlantUML diagram that shows a message
- WHEN the preview is shown
- THEN the paragraph of class myst-plantuml-error uses --studio-errorForeground (fallback #f14c4c) and italic text

### Scenario: Missing colour

- GIVEN a theme without --studio-errorForeground
- WHEN the preview is shown
- THEN the fallback red is used

### Known issues

- Known issue: Untested.

### Verification notes

- Method: No stylesheet test; visual scenarios show the messages.
- Criteria: Error colour and italic style.
