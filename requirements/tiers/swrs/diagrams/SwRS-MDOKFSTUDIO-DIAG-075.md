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
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-024; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-024
default_owner_email: gaetan@xeberon.net
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

### Verification notes

- Method: Unit test `a plantuml setting change reads the settings again and renders the open document again` in `test/session/diagReq.settings.requirements.test.ts`.
- Criteria: Only the three configured sections trigger the work.
