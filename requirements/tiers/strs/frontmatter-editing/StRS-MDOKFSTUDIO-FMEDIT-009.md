---
type: StRS
id: StRS-MDOKFSTUDIO-FMEDIT-009
uuid: 55dec935-b86a-4ac1-9337-68ffe0a203ed
title: Refuse metadata edits that break the schema or the document state
description: When a metadata edit does not match the schema, targets a stale
  preview or runs in an untrusted workspace, the Studio SHALL refuse it with a
  reason and leave the document unchanged.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I am protected from saving metadata that the schema
  rejects or that no longer matches the document.
derived_by: []
superseded_by:
- StRS-MDOKFSTUDIO-FMEDIT-008
default_owner_email: gaetan@xeberon.net
---

## Refuse metadata edits that break the schema or the document state

### Normative behavior

When a metadata edit does not match the schema, targets a stale preview or runs in an untrusted workspace, the Studio SHALL refuse it with a reason and leave the document unchanged.

### Preserved stakeholder intent

Writers expect a refusal to explain itself and never to leave the document half-edited.

As a writer, I am protected from saving metadata that the schema rejects or that no longer matches the document.

### Rationale and constraints

- The schema check covers type, enum, null and conditional rules; link problems do not block a save.
- Malformed page messages are ignored without a reply.
- Known issue: the stale-field message is shared by stale renders and schema mismatches.
