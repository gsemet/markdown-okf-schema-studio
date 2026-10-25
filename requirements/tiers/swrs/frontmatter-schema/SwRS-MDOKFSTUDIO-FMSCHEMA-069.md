---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-069
uuid: 7181a3cf-3773-47c7-a838-b1b852290c58
title: A link can show the line of its marker
description: 'When a link annotation sets `show_line_number: true` and a `basename_marker`,
  the extension SHALL show "line N" beside the resolved link, N being the 1-based
  line of the first line of the target that carries the marker followed by the document
  identity.'
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-067; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-067
---

## A link can show the line of its marker

### Normative behavior

When a link annotation sets `show_line_number: true` and a `basename_marker`, the extension SHALL show "line N" beside the resolved link, N being the 1-based line of the first line of the target that carries the marker followed by the document identity.

### Scenario: Marker line

- GIVEN basename_marker Evidence, id_marker id, the document id dd and a target whose tenth line is Evidence dd
- WHEN the table is rendered
- THEN the link shows line 10

### Scenario: No matching line

- GIVEN a target without a line carrying the marker and the identity
- WHEN the table is rendered
- THEN no line label is shown

### Scenario: Identity field missing

- GIVEN an id_marker that names a field the document does not define
- WHEN the table is rendered
- THEN no line label is shown and the file name is not used instead

### Verification notes

- Method: Unit test of the link details; integration and visual scenarios.
- Criteria: The identity is the string value of the id_marker field of the document; the file name without extension is used only when the annotation has no id_marker. The line must hold the marker, whitespace, then the identity, followed by the end of the line or a character that is not a letter, digit, underscore or hyphen (Evidence dd does not match Evidence ddx). The marker must start the line or follow whitespace (`xEvidence dd` does not match). The file name stem used without an id_marker is the document's own, not the target's.
