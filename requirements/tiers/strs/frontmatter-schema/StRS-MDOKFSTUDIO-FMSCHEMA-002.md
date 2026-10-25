---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-002
uuid: 2f59877e-f8fa-462c-ab10-04436c488692
title: Invalid frontmatter is explained and the body still renders
description: When a document's frontmatter is not valid YAML or is not a
  mapping, the Studio SHALL show an error row and badge in the properties table
  while still rendering the Markdown body.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I see why my frontmatter is rejected and keep reading my
  document; a broken metadata block must never blank the preview.
derived_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-001
- SwRS-MDOKFSTUDIO-FMSCHEMA-017
- SwRS-MDOKFSTUDIO-FMSCHEMA-018
- SwRS-MDOKFSTUDIO-FMSCHEMA-076
---

## Invalid frontmatter is explained and the body still renders

### Normative behavior

When a document's frontmatter is not valid YAML or is not a mapping, the Studio SHALL show an error row and badge in the properties table while still rendering the Markdown body.

### Preserved stakeholder intent

As a writer, I see why my frontmatter is rejected and keep reading my document; a broken metadata block must never blank the preview.

### Rationale and constraints

- Invalid YAML shows one row "Invalid frontmatter YAML: {parser message}" and an error badge of 1; a list, a scalar or an empty block shows "Invalid frontmatter YAML: Frontmatter is not a mapping.". YAML aliases expand up to 100, beyond which the parse fails as invalid YAML.
- Known issue: the parser message is the raw text of the YAML library, with frontmatter-relative line numbers and caret markers.
