---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-016
uuid: 167b5bc4-1f15-400a-ac8a-5f308a801299
title: Link status is visible on each value
description: When a frontmatter link value is displayed, the Studio SHALL show
  whether it resolves and, if not, why, without blocking the first paint.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I see at a glance which references are broken and why.
derived_by: []
superseded_by:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
default_owner_email: gaetan@xeberon.net
---

## Link status is visible on each value

### Normative behavior

When a frontmatter link value is displayed, the Studio SHALL show whether it resolves and, if not, why, without blocking the first paint.

### Preserved stakeholder intent

Broken references should be found while writing, not when a reader complains.

As a writer, I see at a glance which references are broken and why.

### Rationale and constraints

- A resolving link shows as a link; otherwise the text shows with an error or warning mark and a plain label ("File not found", "Outside the allowed folder", "Link root unavailable", "Absolute paths are not allowed", "Several files match", "Empty link", "Invalid link" or "Link unavailable"), is keyboard-focusable, carries the full "[E10]" or "[W15]" message in its tooltip and counts in the badge. Link issues do not block saving other fields.
- Link inspection is deferred: the first paint shows each annotated value with a spinner and "File links are being resolved" (and no Studio link tooltip; Known issue: native title attributes remain); about 150 ms after the render the host resolves the links and swaps the table in place; it waits while a block or field editor is open and drops stale results.
