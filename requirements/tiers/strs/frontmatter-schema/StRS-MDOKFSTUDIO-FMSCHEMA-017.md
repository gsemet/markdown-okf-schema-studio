---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-017
uuid: a28fb05d-d3d4-4098-819e-23e36a8181ff
title: Linked files show their evidence
description: When a frontmatter link resolves to a Markdown file, the Studio
  SHALL show the fields and line the annotation asks for from that file, and
  keep them current.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-FMSCHEMA-014; no marker expected."
derives_from: []
user_need: As a reviewer, I see key facts about a linked file without opening
  it.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-FMSCHEMA-014
---

## Linked files show their evidence

### Normative behavior

When a frontmatter link resolves to a Markdown file, the Studio SHALL show the fields and line the annotation asks for from that file, and keep them current.

### Preserved stakeholder intent

Evidence links are only useful if their content can be judged in place.

As a reviewer, I see key facts about a linked file without opening it.

### Rationale and constraints

- The tooltip shows the workspace-relative target path then one "name: value" line per `tooltip_shows_fields` field found in the target's frontmatter; `preview_shows_fields` values are shown beside the link as one excerpt (whitespace collapsed, joined by "; ", clipped with an ellipsis); only string, number and boolean values count and a target with a byte-order mark is read.
- With `show_line_number: true` and a `basename_marker`, the link shows "line N", the 1-based line of the first line carrying the marker and the document identity: the `id_marker` field value, or the document's file name stem when the annotation names no `id_marker` (an `id_marker` naming a missing field gives no line); no matching line, no label.
- The metadata refreshes when a linked target is saved, created or deleted on disk, through a watcher per displayed target backed by the preview-wide file watcher. Known issue: a link whose annotation lists no tooltip field, no preview field and no `show_line_number` gets no watcher of its own and relies on the preview-wide watcher.
- Hovering or focusing a link (not while pending) shows a tooltip below or above it, never under the toolbar, at most 480 px wide, closing on Escape, scroll, resize, outside click or when pointer and focus leave.
