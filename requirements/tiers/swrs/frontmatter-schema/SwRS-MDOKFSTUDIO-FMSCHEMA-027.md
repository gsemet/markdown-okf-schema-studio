---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-027
uuid: 9900c87c-5b96-4f5f-8571-b1cb2582ebb6
title: Schema edits are picked up on the next analysis
description: When a schema file or a file it refers to changes content, the
  extension SHALL use the new content at the next analysis, comparing content
  rather than modification time, without refreshing an open preview by itself.
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
implemented_in_files:
- src/core/frontmatter/schemaRegistry.ts
tested_in_files:
- test/core/frontmatter/schemaRegistry.test.ts
- test/session/diagReq.settings.requirements.test.ts
---

## Schema edits are picked up on the next analysis

### Normative behavior

When a schema file or a file it refers to changes content, the extension SHALL use the new content at the next analysis, comparing content rather than modification time, without refreshing an open preview by itself.

### Scenario (nominal): Edited schema

- GIVEN a document analysed once against a schema, then the schema file edited
- WHEN the document is analysed again
- THEN the new schema content is applied and the old compiled validator is released

### Scenario (boundary): Reverted and deleted

| Input | Outcome |
| --- | --- |
| a schema edited and then restored to its previous text | the restored text is reused without error |
| a schema deleted | the no-schema info row is shown |

### Scenario (refusal): No refresh by itself

- GIVEN a preview open on a typed document and its schema edited and saved
- WHEN nothing else happens
- THEN the table still shows the previous validation result

### Scenario (nominal): Document edited afterwards

- GIVEN the same preview after any edit of the document
- WHEN the frontmatter is re-analysed
- THEN the table reflects the edited schema

### Known issues

- Known issue: a schema author must touch the document or refresh the preview to see the effect of a schema edit.

### Verification notes

- Method: test/core/frontmatter/schemaRegistry.test.ts (edited schema, reverted and deleted).
- Method: test/session/diagReq.settings.requirements.test.ts, test `editing a schema file refreshes nothing by itself; the next document change re-analyses the table` (no refresh by itself, document edited afterwards).
- Criteria: Every file read and every probed reference registers a re-check; a deleted file or a changed existence of a probed reference counts as a change. No watcher observes `_schema` folders; only linked targets and Markdown stems are watched. The table is also refreshed by a refresh, a re-render or a settings change.
