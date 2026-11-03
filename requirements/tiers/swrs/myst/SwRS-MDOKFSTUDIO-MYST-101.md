---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-101
uuid: d5a39fae-9b2b-45f5-bbc4-e90f5b33a9f3
title: A +++ line inside a container renders as text
description: When a document holds a +++ line inside a container (a MyST
  directive, a quote, a list item or an alert), the extension SHALL render the
  line as text and keep rendering the document, and only a +++ line at the root
  of the document stays a block break.
project: MDOKFSTUDIO
scope: myst
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystNestedBlockBreaks.ts
tested_in_files:
- test/core/render/blockBreakInContainer.test.ts
default_owner_email: gaetan@xeberon.net
---

## A +++ line inside a container renders as text

### Normative behavior

When a document holds a +++ line inside a container (a MyST directive, a quote, a list item or an alert), the extension SHALL render the line as text and keep rendering the document, and only a +++ line at the root of the document stays a block break.

### Scenario: Nominal

- GIVEN a `:::{note}` directive whose body holds a line `+++` between the paragraphs "a" and "b"
- WHEN the preview renders
- THEN the note shows the paragraphs "a", "+++" and "b", and the document renders

| Input | Outcome |
| --- | --- |
| `+++` or `+++ {"a": 1}` in a directive body | a paragraph holding the line as text |
| `> +++` (a quote) and `- +++` (a list item) | a paragraph holding `+++` in the quote or the item |
| `+++` last in an alert, or a `- +++` item after an alert | a paragraph holding `+++` |

### Scenario: Boundary or refusal

- GIVEN a `+++` line at the root of the document, after a blank line
- WHEN the preview renders
- THEN it stays a block break and shows no text, as before

A `+++` line that splits a `{card}` or `{grid-item-card}` body into body and footer keeps that role (see SwRS-MDOKFSTUDIO-MYST-100).

### Related requirements

- SwRS-MDOKFSTUDIO-MYST-100: the card footer separator, which this rule leaves as is.

### Verification notes

- Method: test/core/render/blockBreakInContainer.test.ts (one render per input, and the root-level break)
- Criteria: no input throws, and each renders the line as a paragraph of text.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-001](../../strs/myst/StRS-MDOKFSTUDIO-MYST-001.md): MyST directives and roles render as readable blocks
<!-- okf:links:end -->
