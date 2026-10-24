---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-067
uuid: c38ecdda-1899-40f9-a200-e7f840fb9219
title: A link tooltip shows fields of the linked file
description: "When a link annotation lists `tooltip_shows_fields`, the extension SHALL
  add to the tooltip of the resolved link one \"name: value\" line per listed field
  found in the target's frontmatter, counting only string, number and boolean values."
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-017
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A link tooltip shows fields of the linked file

### Normative behavior

When a link annotation lists `tooltip_shows_fields`, the extension SHALL add to the tooltip of the resolved link one "name: value" line per listed field found in the target's frontmatter, counting only string, number and boolean values.

### Scenario: Fields found

- GIVEN tooltip_shows_fields owner and count and a target whose frontmatter has owner Bob and count 3
- WHEN the table is rendered
- THEN the tooltip lists the path, then owner: Bob and count: 3

### Scenario: Fields missing or structured

- GIVEN a listed field that is absent and a listed field holding a mapping
- WHEN the table is rendered
- THEN neither appears in the tooltip

### Verification notes

- Method: Unit test of the link details; integration and visual scenarios.
- Criteria: A target with a leading byte-order mark is read normally.
