---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-057
uuid: 149bacec-3be9-4eee-988c-aa939ee4f480
title: Render list-table headers, widths and alignment
description: When a `{list-table}` has `:header-rows:`, `:widths:` or an
  alignment, the extension SHALL render `thead`/`th`, column widths and the
  alignment, ignoring widths whose count differs from the columns or that are
  not numbers.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-063; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-063
default_owner_email: gaetan@xeberon.net
---

## Render list-table headers, widths and alignment

### Normative behavior

When a `{list-table}` has `:header-rows:`, `:widths:` or an alignment, the extension SHALL render `thead`/`th`, column widths and the alignment, ignoring widths whose count differs from the columns or that are not numbers.

### Scenario: Nominal render list-table headers, widths and alignment

- GIVEN a list-table with `:header-rows: 1`
- WHEN it is rendered
- THEN the first row is in `thead` with `th`

### Scenario: Boundary or refusal of render list-table headers, widths and alignment

- GIVEN `:widths:` with a wrong count
- WHEN it is rendered
- THEN the widths are ignored

### Verification notes

- Method: Unit test "CR038: a list-table renders its title, header rows, widths and alignment as one editable block" in test/core/render/mystFeatures.test.ts
- Criteria: Header, widths and alignment follow the options.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-001](../../strs/myst/StRS-MDOKFSTUDIO-MYST-001.md): MyST directives and roles render as readable blocks
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-063](../myst/SwRS-MDOKFSTUDIO-MYST-063.md): Table directives render as ordinary tables
<!-- okf:links:end -->
