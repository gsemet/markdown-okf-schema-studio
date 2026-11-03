---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-275
uuid: 0f4fd84d-7ebf-4789-8986-3f864701cfab
title: Every rendered syntax has a slash menu entry or a documented exception
description: The extension SHALL list in the slash menu of the palette mode that
  offers it every syntax the writing skill documents as rendered, except the
  syntaxes of a documented exception list that have another way in.
project: MDOKFSTUDIO
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files:
- test/page/modules/slashSyntaxCoverage.test.ts
default_owner_email: gaetan@xeberon.net
---

## Every rendered syntax has a slash menu entry or a documented exception

### Normative behavior

The extension SHALL list in the slash menu of the palette mode that offers it every syntax the writing skill documents as rendered, except the syntaxes of a documented exception list that have another way in.

### Scenario (nominal): A rendered syntax is reachable from the slash menu

- GIVEN a syntax of the writing skill's "What renders" table (a GFM construct, an admonition, a card, grid, tab set or figure, a role, a diagram or a chart fence)
- WHEN the writer opens the slash menu in the palette mode that offers it
- THEN the menu lists an entry that inserts that syntax, from the first mode that offers it up to Full, and no lower mode lists it

### Scenario (boundary): A syntax without an entry is a documented exception

- GIVEN a rendered syntax that has no slash entry of its own (autolinks, `{list-table}`, `{toctree}`, `{uml}`, `{contents}`, presentation HTML, front matter)
- WHEN the syntax list of the coverage test is read
- THEN the syntax carries a written reason, such as an equivalent entry or a dedicated editor, and a rendered syntax missing from the list fails the test

### Verification notes

- Method: test/page/modules/slashSyntaxCoverage.test.ts (the list of syntaxes against the slash entries of each palette mode, and against the directives and fence languages the writing skill names)
- Criteria: Every directive and fence language of the skill table has a row, covered or excepted with a reason.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
<!-- okf:links:end -->
