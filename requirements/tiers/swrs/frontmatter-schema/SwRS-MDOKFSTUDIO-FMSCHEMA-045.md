---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-045
uuid: 8b439d06-ce78-445e-94d9-eb0b307943d4
title: A frontmatter setting change re-analyses the open previews
description: When any `markdownOkfSchemaStudio.frontmatter.*` setting changes,
  the extension SHALL re-read the frontmatter settings of every open preview and
  re-analyse the table of each preview whose document is the active editor's
  document.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-004; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-004
default_owner_email: gaetan@xeberon.net
---

## A frontmatter setting change re-analyses the open previews

### Normative behavior

When any `markdownOkfSchemaStudio.frontmatter.*` setting changes, the extension SHALL re-read the frontmatter settings of every open preview and re-analyse the table of each preview whose document is the active editor's document.

### Scenario: Strict turned on

- GIVEN an open preview of the active document with an undeclared field
- WHEN frontmatter.strictAdditionalProperties is changed to true
- THEN the open table shows the unknown-field warning without reopening the preview

### Scenario: Other section

- GIVEN a change to a setting outside the preview, plantuml and frontmatter sections
- WHEN the change is notified
- THEN the open previews are not re-analysed

### Verification notes

- Method: Unit test `a frontmatter setting change reads the settings again and analyses the table of the active document only` in `test/session/diagReq.settings.requirements.test.ts`.
- Criteria: The change event is filtered by section; the preview and plantuml sections also trigger the same refresh. Other previews are re-rendered from their last good render with the new settings, not re-analysed.
- Known issue: a preview whose document is not the active editor's document is not re-analysed by this path; it only re-renders from its last good render.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-001](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-001.md): Frontmatter appears as a readable, configurable properties table
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-004](SwRS-MDOKFSTUDIO-FMSCHEMA-004.md): The propertiesTable setting hides the table while the body renders
<!-- okf:links:end -->
