---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-015
uuid: d4321aa6-bd82-4975-abf7-02fd5a63ee63
title: Fields without a schema type are edited as YAML text
description: "When a writer opens the editor of a field without a schema, of unknown
  type, list-typed with a non-list value or holding an object, the extension SHALL
  show a YAML text box of 1 to 20 rows holding the value as YAML."
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-004; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-004
default_owner_email: gaetan@xeberon.net
---

## Fields without a schema type are edited as YAML text

### Normative behavior

When a writer opens the editor of a field without a schema, of unknown type, list-typed with a non-list value or holding an object, the extension SHALL show a YAML text box of 1 to 20 rows holding the value as YAML.

### Scenario: Nominal

- GIVEN a document without a schema and a field tags holding an object
- WHEN the writer opens its editor
- THEN a text box labelled "Frontmatter tags" shows the value as YAML, its rows between 1 and 20; Enter adds a line and Cmd or Ctrl+Enter saves

### Scenario: Boundary or refusal

- GIVEN a field just added, whose value is the empty string
- WHEN its editor opens
- THEN the text box starts empty instead of showing the two quote characters

### Known issues

- Known issue: objects are edited as de-indented YAML and a YAML parser error is shown as raw, possibly multi-line text.

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: Tests schema-free frontmatter values use a generic YAML editor; Enter in the YAML frontmatter editor inserts a line.
