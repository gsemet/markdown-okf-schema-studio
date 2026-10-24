---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-019
uuid: 4aac77a2-f6f4-4c83-ab15-d3f0d8a8412c
title: The nearest schema folder is found by walking up
description: When a document's frontmatter has a string `type`, the extension
  SHALL look for the schema folder by walking up from the document's folder to
  the workspace folder root and use the first `_schema` folder, or `_schemas`
  when a level has no `_schema`.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The nearest schema folder is found by walking up

### Normative behavior

When a document's frontmatter has a string `type`, the extension SHALL look for the schema folder by walking up from the document's folder to the workspace folder root and use the first `_schema` folder, or `_schemas` when a level has no `_schema`.

### Scenario: Nearest folder wins

- GIVEN a workspace with `_schema` at its root and `_schema` in the sub-folder docs, and a document in docs/guide
- WHEN the document is analysed
- THEN the schema folder is docs/_schema

### Scenario: No schema folder

- GIVEN a workspace with no `_schema` or `_schemas` folder above the document
- WHEN the document is analysed with a type
- THEN the generic table is shown and no info row appears

### Verification notes

- Method: Unit test of the schema folder search.
- Criteria: At each level `_schema` is preferred over `_schemas`. The workspace folder root itself is searched (the stop directory is included), so a root-level `_schema` is found; without a workspace root the walk runs up to the file-system root.
