---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-019
uuid: 4aac77a2-f6f4-4c83-ab15-d3f0d8a8412c
title: A typed document finds its schema in the nearest schema folder
description: When a document's frontmatter has a string `type`, the extension
  SHALL look for the schema folder by walking up from the document's folder to
  the workspace folder root and use the first `_schema` folder, or `_schemas`
  when a level has no `_schema`, pick in it the file `{type}.schema.yaml`,
  `.yml`, `.json` or `.json5` whose stem equals the type ignoring case, and look
  up no schema when the workspace is not trusted or the document is not inside a
  workspace folder.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-006
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/frontmatter/okfFrontmatter.ts
tested_in_files:
- test/core/frontmatter/okfFrontmatter.test.ts
- test/node-services/schemaFiles.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMSCHEMA-020
- SwRS-MDOKFSTUDIO-FMSCHEMA-021
- SwRS-MDOKFSTUDIO-FMSCHEMA-022
- SwRS-MDOKFSTUDIO-FMSCHEMA-077
---

## A typed document finds its schema in the nearest schema folder

### Normative behavior

When a document's frontmatter has a string `type`, the extension SHALL look for the schema folder by walking up from the document's folder to the workspace folder root and use the first `_schema` folder, or `_schemas` when a level has no `_schema`, pick in it the file `{type}.schema.yaml`, `.yml`, `.json` or `.json5` whose stem equals the type ignoring case, and look up no schema when the workspace is not trusted or the document is not inside a workspace folder.

### Scenario (nominal): Nearest folder wins

- GIVEN a workspace with `_schema` at its root and `_schema` in the sub-folder docs, and a document in docs/guide
- WHEN the document is analysed
- THEN the schema folder is docs/_schema

### Scenario (nominal): The file is chosen by the type name

| Input | Outcome |
| --- | --- |
| A schema folder with Note.schema.yaml and a document of type note | Note.schema.yaml is used as the schema |
| A schema folder with note.schema.json, note.schema.yml and note.schema.yaml | note.schema.yaml is used and the other two files are ignored (preference `.yaml`, then `.yml`, `.json`, `.json5`) |

### Scenario (boundary): Folder and file matching

| Input | Outcome |
| --- | --- |
| A level that holds both `_schema` and `_schemas` | `_schema` is preferred |
| A `_schema` at the workspace folder root itself | It is found; the stop directory is included |
| No workspace root | The walk runs up to the file-system root |
| A file named Note.SCHEMA.YAML and a document of type note | It matches; the stem and the `.schema` suffix are compared in lower case |
| A file that does not end in `.schema` plus an accepted extension | It never matches |

### Scenario (refusal): No schema folder

- GIVEN a workspace with no `_schema` or `_schemas` folder above the document
- WHEN the document is analysed with a type
- THEN the generic table is shown and no info row appears

### Scenario (refusal): No file for the type

- GIVEN a schema folder holding only other.schema.yaml and a document of type Note
- WHEN the preview is rendered
- THEN the table is generic, one info row reads No schema found for type "Note" in _schema/. and the badge reads ℹ 1
- WHEN the file Note.schema.yaml is added to the folder and the document is analysed again
- THEN the info row is gone and the schema table is shown

### Scenario (refusal): No lookup in Restricted Mode or for a standalone file

| Input | Outcome |
| --- | --- |
| A schema exists for the type, the workspace is in Restricted Mode and the document has `type: Note` | No schema is looked up and no field is editable; the generic table shows the info row "Schema validation requires a trusted workspace; showing generic frontmatter." and an info badge |
| A document without a type in Restricted Mode | No info row is shown |
| A Markdown file opened outside every workspace folder with a typed frontmatter | No schema is read |

### Scenario (boundary): The schema folder listing is kept while the folder is unchanged

- GIVEN a schema folder listed in an earlier render
- WHEN the document is rendered again, first with the folder unchanged and then after a schema file was added or the folder removed
- THEN the unchanged folder is not listed again, an added file is found, and a removed folder lists nothing

### Known issues

- Known issue: a file outside every workspace folder in a trusted workspace is also told that schema validation requires a trusted workspace, which is misleading.
- Known issue: the untrusted integration suite does not assert the info row.

### Related requirements

- SwRS-MDOKFSTUDIO-FMSCHEMA-005: the generic table shown when no schema is looked up.

### Verification notes

- Method: `test/core/frontmatter/okfFrontmatter.test.ts`, markers of the tests in `okfFrontmatter.test.ts` (schema folder search, schema file matcher, missing schema info row, analysis with schema resolution off; all scenarios).
- Method: integration test of the untrusted workspace (generic table only; the info row in Restricted Mode is untested there).
- Method: test/node-services/schemaFiles.test.ts (the folder is read once while unchanged, again after a file is added, and lists nothing once removed)
- Criteria: The folder name in the message is the base name of the schema folder; the summary counts one info, also for a typed document in Restricted Mode.
- Criteria: Schema resolution is off when the preview is read-only (no workspace folder, or an untrusted workspace).
