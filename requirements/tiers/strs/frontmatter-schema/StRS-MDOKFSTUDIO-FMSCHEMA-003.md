---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-003
uuid: 09f44009-c937-4c84-851c-fb986a5b930e
title: Property values read like YAML
description: When a writer reads a properties table, the Studio SHALL show
  booleans, lists, null and nested values in a compact YAML-like form that fits
  the preview width.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I read property values in the form I typed them and the
  table never pushes the page sideways.
derived_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-006
- SwRS-MDOKFSTUDIO-FMSCHEMA-007
- SwRS-MDOKFSTUDIO-FMSCHEMA-008
- SwRS-MDOKFSTUDIO-FMSCHEMA-009
- SwRS-MDOKFSTUDIO-FMSCHEMA-010
- SwRS-MDOKFSTUDIO-FMSCHEMA-011
---

## Property values read like YAML

### Normative behavior

When a writer reads a properties table, the Studio SHALL show booleans, lists, null and nested values in a compact YAML-like form that fits the preview width.

### Preserved stakeholder intent

Writers expect values to look like their YAML source and the table to stay inside the preview, including in a narrow panel.

As a writer, I read property values in the form I typed them and the table never pushes the page sideways.

### Rationale and constraints

- Booleans show as a read-only checkbox followed by true or false; lists show one dash-marked item per line, at most 50 items then "+ N more"; an empty list shows `[]` and null shows `null`.
- The table has a lean frame (no outer border, transparent cells, grey header cells) and in a preview of 640 px or less uses a fixed layout in which names, values, links and type labels wrap anywhere.
- Known issue: in a narrow preview a word can still break in the middle of a name; there is no stacked layout.
- Known issue: the helper `formatValue` of the table renderer is unused and would show an em dash for null; today null shows `null`.
