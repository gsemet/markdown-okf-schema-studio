---
type: StRS
id: StRS-MDOKFSTUDIO-LIFE-019
uuid: f2d037ab-588a-4e5f-a0fb-fc0de55868be
title: A preview outside a trusted workspace is safe to read
description: When a reader opens a preview of a file in an untrusted workspace
  or outside any workspace folder, the Studio SHALL show it read-only.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: deprecated
status: deprecated
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I read Markdown from an untrusted source without the
  preview being able to edit, comment or read beyond the file's folder.
derived_by: []
default_owner_email: gaetan@xeberon.net
---

## A preview outside a trusted workspace is safe to read

### Normative behavior

When a reader opens a preview of a file in an untrusted workspace or outside any workspace folder, the Studio SHALL show it read-only.

### Preserved stakeholder intent

As a reader, I read Markdown from an untrusted source without the preview being able to edit, comment or read beyond the file's folder.

### Rationale and constraints

- Granting trust later does not make an already open preview writable.
