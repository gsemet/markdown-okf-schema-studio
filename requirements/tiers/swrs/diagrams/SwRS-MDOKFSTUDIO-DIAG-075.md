---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-075
uuid: 4421d230-d34c-4215-b3e8-f0d966141c68
title: Changing a PlantUML setting renders the open document again
description: When any markdownOkfSchemaStudio.plantuml setting changes, the
  extension SHALL read the settings again for every open preview and render the
  open document again without reopening the preview.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Changing a PlantUML setting renders the open document again

### Normative behavior

When any markdownOkfSchemaStudio.plantuml setting changes, the extension SHALL read the settings again for every open preview and render the open document again without reopening the preview.

### Scenario: Engine switch

- GIVEN an open preview and a change of plantuml.useJar
- WHEN the setting changes
- THEN the preview settings are read again and the document is rendered with the other engine

### Scenario: Unrelated setting

- GIVEN a change of a setting outside the preview, plantuml and frontmatter sections
- WHEN the setting changes
- THEN nothing is re-read and nothing is rendered again

### Known issues

- Known issue: Untested: onSettingsChanged has no session test.

### Verification notes

- Method: No session test for the settings change path.
- Criteria: Only the three configured sections trigger the work.
