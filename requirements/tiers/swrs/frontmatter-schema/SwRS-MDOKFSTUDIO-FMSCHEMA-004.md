---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-004
uuid: fedff6f5-b384-4dc1-962c-a74ebc4237a9
title: The propertiesTable setting hides the table while the body renders
description: When `markdownOkfSchemaStudio.frontmatter.propertiesTable` is
  false, the extension SHALL show neither the properties table nor the raw
  frontmatter text and still render the body of the document.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/configuration/settingsRegistry.ts
- src/core/frontmatter/propertiesTable.ts
- src/session/features/frontmatter.ts
- src/session/hostEvents.ts
tested_in_files:
- test/core/frontmatter/propertiesTable.test.ts
- test/session/diagReq.settings.requirements.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## The propertiesTable setting hides the table while the body renders

### Normative behavior

When `markdownOkfSchemaStudio.frontmatter.propertiesTable` is false, the extension SHALL show neither the properties table nor the raw frontmatter text and still render the body of the document.

### Scenario (nominal): Setting off

- GIVEN a document with frontmatter and the heading `# Title`, with `frontmatter.propertiesTable` set to false
- WHEN the preview is rendered
- THEN no properties table and no frontmatter text appear and the heading Title is rendered at the top of the preview

### Scenario (nominal): Setting at its default

- GIVEN the same document with `frontmatter.propertiesTable` unset (default true, boolean, no other accepted value)
- WHEN the preview is rendered
- THEN the properties table is shown above the heading

### Scenario (boundary): Document without frontmatter

- GIVEN a document without frontmatter and the setting false
- WHEN the preview is rendered
- THEN the body is rendered as with the setting on

### Scenario (nominal): A frontmatter setting change re-analyses the open previews

- GIVEN an open preview of the active document with an undeclared field
- WHEN `frontmatter.strictAdditionalProperties` is changed to true
- THEN the open table shows the unknown-field warning without reopening the preview

### Scenario (boundary): Which setting changes re-analyse

| Input | Outcome |
| --- | --- |
| Any `markdownOkfSchemaStudio.frontmatter.*` setting changes | The frontmatter settings of every open preview are read again and the table of each preview whose document is the active editor's document is re-analysed |
| A change to a setting outside the preview, plantuml and frontmatter sections | The open previews are not re-analysed |
| A change in the preview or plantuml section | The same refresh runs; other previews are re-rendered from their last good render with the new settings, not re-analysed |

### Known issues

- Known issue: the frontmatter is still parsed and validated while the table is off; nothing is shown, so a schema problem cannot be seen.
- Known issue: a preview whose document is not the active editor's document is not re-analysed by this path; it only re-renders from its last good render.

### Related requirements

- SwRS-MDOKFSTUDIO-FMSCHEMA-001: the invalid-YAML error row that the setting also hides.

### Verification notes

- Method: `test/core/frontmatter/propertiesTable.test.ts` (setting off and on: the renderer returns no markup when the setting is off and does not touch the body; document without frontmatter).
- Method: `test/visual/scenarioDefinitions2.ts` (setting off: no table and no frontmatter text, heading at the top).
- Method: `test/session/diagReq.settings.requirements.test.ts`, unit test `a frontmatter setting change reads the settings again and analyses the table of the active document only` (setting change re-analyses; section filter).
- Criteria: Default true; the value is a boolean taken as stored; the change event is filtered by section.
