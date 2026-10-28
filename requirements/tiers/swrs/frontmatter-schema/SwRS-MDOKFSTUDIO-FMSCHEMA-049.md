---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-049
uuid: 0035018e-7b91-4a10-926f-78a06efe953b
title: Query and fragment are split off a link target
description: When a link value carries a `?query` or a `#fragment` after the
  target, the extension SHALL resolve the target alone and keep the query and
  the fragment for navigation.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-046; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-046
default_owner_email: gaetan@xeberon.net
---

## Query and fragment are split off a link target

### Normative behavior

When a link value carries a `?query` or a `#fragment` after the target, the extension SHALL resolve the target alone and keep the query and the fragment for navigation.

### Scenario: Fragment kept

- GIVEN a document-relative link value t.md#h next to an existing t.md
- WHEN the document is analysed
- THEN the link is valid and keeps the fragment h

### Scenario: Query and fragment

- GIVEN a link value t.md?x=1#h
- WHEN the document is analysed
- THEN the link is valid with the query x=1 and the fragment h

### Verification notes

- Method: Unit test of the link inspection (partial).
- Criteria: The fragment is cut first, then the query; the target is trimmed.
