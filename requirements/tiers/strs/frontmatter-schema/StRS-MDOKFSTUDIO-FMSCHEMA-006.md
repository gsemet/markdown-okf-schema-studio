---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-006
uuid: 6431bb3a-8a6d-410b-8416-630e14f0882f
title: A document finds its schema by its type
description: When a document's frontmatter has a string `type`, the Studio SHALL
  look for the matching schema file in the nearest schema folder and tell the
  writer when none applies.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer of Open Knowledge Format documents, I get schema-aware
  metadata simply by setting `type`, and I learn when no schema is found.
derived_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-019
- SwRS-MDOKFSTUDIO-FMSCHEMA-020
- SwRS-MDOKFSTUDIO-FMSCHEMA-021
- SwRS-MDOKFSTUDIO-FMSCHEMA-022
- SwRS-MDOKFSTUDIO-FMSCHEMA-077
- SwRS-MDOKFSTUDIO-FMSCHEMA-088
---

## A document finds its schema by its type

### Normative behavior

When a document's frontmatter has a string `type`, the Studio SHALL look for the matching schema file in the nearest schema folder and tell the writer when none applies.

### Preserved stakeholder intent

Schema discovery should need no configuration, and the writer must see why a table is generic.

As a writer of Open Knowledge Format documents, I get schema-aware metadata simply by setting `type`, and I learn when no schema is found.

### Rationale and constraints

- The schema folder is the first `_schema` folder (preferred) or `_schemas` folder found walking up from the document's folder to the workspace folder root.
- The schema file is `{type}.schema.yaml`, `.yml`, `.json` or `.json5` whose stem equals the type, case-insensitively; `.yaml` wins over `.yml`, `.json`, `.json5`.
- A missing schema file shows the info row "No schema found for type "{type}" in {folder}/." and an info badge; no schema folder gives the generic table with no info row.
- In Restricted Mode, and for a standalone file outside the workspace, no schema is looked up and the info row "Schema validation requires a trusted workspace; showing generic frontmatter." is shown.
- The info row appears only when the frontmatter has a string `type`.
- Known issue: a file outside every workspace folder in a trusted workspace is also told that schema validation requires a trusted workspace.
