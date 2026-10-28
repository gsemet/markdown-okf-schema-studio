---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-017
uuid: e0fc7db4-405d-40d9-b36e-18b77c088728
title: Definition lists and inline roles are typeset
description: "When a document holds a term followed by `: Definition` lines or an
  inline `{sub}`, `{sup}`, `{abbr}`, `{kbd}`, `{doc}`, `{download}` or `{numref}`
  role, the extension SHALL render a definition list, subscript, superscript, an abbreviation
  with its expansion as title, a keyboard key, a plain link to the written target,
  or an inert placeholder for the numbered reference."
project: markdown-okf-schema-studio
scope: myst
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystBlockTransforms.ts
- src/core/render/mystRenderer.ts
tested_in_files:
- test/core/render/mystFeatures.test.ts
- test/core/render/mystPaletteRendering.test.ts
- test/core/render/renderReq.myst.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## Definition lists and inline roles are typeset

### Normative behavior

When a document holds a term followed by `: Definition` lines or an inline `{sub}`, `{sup}`, `{abbr}`, `{kbd}`, `{doc}`, `{download}` or `{numref}` role, the extension SHALL render a definition list, subscript, superscript, an abbreviation with its expansion as title, a keyboard key, a plain link to the written target, or an inert placeholder for the numbered reference.

### Scenario (nominal): Definition lists render

- GIVEN a term line and a `: Definition` line, and a definition list written by the palette Definition list button
- WHEN the preview renders
- THEN a definition list with the term and the definition is shown (term and definition become dt and dd), the palette form rendering the same list form

### Scenario (nominal): Inline roles sub, sup, abbr and kbd

- GIVEN ``{abbr}`HR (Heart Rate)` ``, and the roles `{sub}`, `{sup}` and `{kbd}`
- WHEN the preview renders
- THEN HR is shown with the title Heart Rate, and subscript, superscript and a keyboard key appear, each role mapping to its element (a `{kbd}` role inserted by the edition palette renders a kbd element)

### Scenario (boundary): Doc and download roles are plain links

- GIVEN a doc role and a download role, each written with a label and a target in angle brackets, and a doc role written with a bare target
- WHEN the preview renders
- THEN each is a plain link whose `href` is the written target, with the label as text; a role written without a label shows the written target as text (the file name for a download role)

### Scenario (refusal): Numbered references stay inert placeholders

- GIVEN ``{numref}`fig-x` `` where `(fig-x)=` labels a heading in the same buffer, and the same role with an explicit title
- WHEN the preview renders
- THEN an inert placeholder (`reference role unhandled`) holding the role name and the written key is shown, not a numbered link, and the same holds with the explicit title

### Known issues

- Known issue: the preview adds no resolution of its own. `{doc}` and `{download}` targets are not checked against the workspace and `{numref}` to a heading label is never resolved to a number (it stays an inert placeholder span).

### Verification notes

- Method: test/core/render/mystFeatures.test.ts (definition lists and sub, sup, abbr, kbd: "MyST typography renders definitions, abbreviations, scripts, and footnotes")
- Method: test/core/render/mystPaletteRendering.test.ts (palette-written kbd role: "T30: a {kbd} role inserted by the edition palette renders a kbd element")
- Method: test/core/render/renderReq.myst.requirements.test.ts (doc and download links, numref placeholder: "doc and download roles render as plain links and numref as an inert placeholder")
- Criteria: Term and definition become dt and dd; each role maps to its element; doc and download are plain links with the written target; the doc and download text is the label, or the written target (file name for a download) without a label; the numref placeholder holds the role name and the written key.
