---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-027
uuid: 9900c87c-5b96-4f5f-8571-b1cb2582ebb6
title: Schema changes are picked up by content
description: When a schema file or a file it refers to changes content, the
  extension SHALL use the new content at the next analysis, comparing content
  rather than modification time.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-009
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Schema changes are picked up by content

### Normative behavior

When a schema file or a file it refers to changes content, the extension SHALL use the new content at the next analysis, comparing content rather than modification time.

### Scenario: Edited schema

- GIVEN a document analysed once against a schema, then the schema file edited
- WHEN the document is analysed again
- THEN the new schema content is applied and the old compiled validator is released

### Scenario: Reverted and deleted

- GIVEN a schema edited and then restored to its previous text, or deleted
- WHEN the document is analysed again
- THEN a restored text is reused without error and a deleted schema gives the no-schema info row

### Verification notes

- Method: Unit test of the schema registry.
- Criteria: Every file read and every probed reference registers a re-check; a deleted file or a changed existence of a probed reference counts as a change.
