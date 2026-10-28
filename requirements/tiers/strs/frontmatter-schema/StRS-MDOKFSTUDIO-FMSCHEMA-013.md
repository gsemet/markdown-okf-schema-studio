---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-013
uuid: 92961f38-3e5e-4cb1-a08d-7bc9625c812f
title: The table follows edits to the document
description: When a writer edits the frontmatter, the Studio SHALL refresh the
  properties table in place shortly after the last change without reloading the
  preview.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-FMSCHEMA-001; no marker expected."
derives_from: []
user_need: As a writer, I see validation results update while I type, without
  the preview jumping.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-FMSCHEMA-001
default_owner_email: gaetan@xeberon.net
---

## The table follows edits to the document

### Normative behavior

When a writer edits the frontmatter, the Studio SHALL refresh the properties table in place shortly after the last change without reloading the preview.

### Preserved stakeholder intent

A reload would lose scroll position and open editors.

As a writer, I see validation results update while I type, without the preview jumping.

### Rationale and constraints

- The frontmatter is re-analysed 300 ms after the last change; while a field editor is open the new table waits until it closes; a page not ready for the current render loads the full document instead.
