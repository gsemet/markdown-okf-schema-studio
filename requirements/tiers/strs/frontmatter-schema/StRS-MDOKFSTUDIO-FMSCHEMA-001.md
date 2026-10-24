---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-001
uuid: 10650af4-e1c7-454f-8c9a-6f01d11f7428
title: Frontmatter appears as a properties table
description: When a writer opens a document that starts with YAML frontmatter,
  the Studio SHALL show it as a properties table at the top of the preview,
  escaping every value.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I read my document metadata as a table above the text,
  safely, without opening the YAML.
derived_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-001
- SwRS-MDOKFSTUDIO-FMSCHEMA-002
- SwRS-MDOKFSTUDIO-FMSCHEMA-003
- SwRS-MDOKFSTUDIO-FMSCHEMA-005
- SwRS-MDOKFSTUDIO-FMSCHEMA-012
- SwRS-MDOKFSTUDIO-FMSCHEMA-013
---

## Frontmatter appears as a properties table

### Normative behavior

When a writer opens a document that starts with YAML frontmatter, the Studio SHALL show it as a properties table at the top of the preview, escaping every value.

### Preserved stakeholder intent

Writers expect the metadata block to be readable at a glance and the preview to stay aligned with the source line where it starts.

As a writer, I read my document metadata as a table above the text, safely, without opening the YAML.

### Rationale and constraints

- A block needs a first-line `---` fence and a closing `---` or `...` fence alone on its line; a value ending in `...` or `---` does not close it and a document without a closing fence has no frontmatter. An empty block (two adjacent fences) is recognised but shows the "Frontmatter is not a mapping." error row instead of an empty table (Known issue). CRLF fences are accepted.
- Frontmatter without a string `type`, or whose type has no schema, shows a generic two-column table headed "Names / Values" in source key order, with nested mappings as YAML code.
- The properties section maps to source line 1, so syncing the source to line 1 shows the top of the preview.
- Known issue: a leading byte-order mark in the document itself is not stripped, so such a file shows no frontmatter (it is stripped only for linked targets).
- Known issue: the generic header reads "Names / Values" while a schema table reads "Name / Value".
