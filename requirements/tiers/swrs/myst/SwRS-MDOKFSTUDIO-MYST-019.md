---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-019
uuid: bab03b92-b6cb-434a-8dce-8afda479063d
title: Reference roles link to in-page targets
description: When a document uses `{ref}` to a heading, figure, table, equation
  or `(name)=` label, the extension SHALL render an in-page link showing the
  target text or the given text, and for a figure or table without a caption a
  readable link, not an empty one.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
- StRS-MDOKFSTUDIO-MYST-005
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystBlockTransforms.ts
- src/core/render/mystInlineTransforms.ts
tested_in_files:
- test/core/render/mystFeatures.test.ts
- test/core/render/mystPaletteRendering.test.ts
---

## Reference roles link to in-page targets

### Normative behavior

When a document uses `{ref}` to a heading, figure, table, equation or `(name)=` label, the extension SHALL render an in-page link showing the target text or the given text, and for a figure or table without a caption a readable link, not an empty one.

### Scenario (nominal): A reference to a heading shows the heading text

- GIVEN ``{ref}`name` `` to a heading
- WHEN the preview renders
- THEN a link shows the heading text without the anchor icon

### Scenario (boundary): Explicit text and paragraph labels

- GIVEN `{ref}` with explicit text and a target name, and a `{ref}` to a label on a paragraph
- WHEN the preview renders
- THEN the given text is shown and the paragraph label becomes a plain #name link

### Scenario (boundary): Captions decide the link text

- GIVEN a `{numref}` or `{ref}` that points to a figure or table without a caption, and a `{ref}` to a captioned table
- WHEN the preview renders
- THEN a `{ref}` without caption shows the key, a `{numref}` shows its number (Figure 1, Table 1), no link is empty, the captioned table gives its caption as the link text, and a missing label raises no warning

### Verification notes

- Method: test/core/render/mystPaletteRendering.test.ts (nominal and explicit text and paragraph labels: "a label before a paragraph renders an anchor icon span that is the link target")
- Method: test/core/render/mystFeatures.test.ts (captions decide the link text: "figure references render figures whose body supplies the caption" and "references to captionless figures and tables stay readable", which checks `{ref}` only; the `{numref}` case is untested)
- Criteria: A captionless figure or table shows the key for `{ref}` and its number for `{numref}`; no reference link is empty; a missing label raises no warning.
