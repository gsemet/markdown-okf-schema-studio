---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-021
uuid: 08e33de7-cb69-4fc9-b4a8-ff4d117235e2
title: Directives needing a build show an inert placeholder with a warning
description: When a document holds a directive the preview cannot resolve
  without a project build, the extension SHALL show an inert placeholder `{name}
  arguments` with its body and one warning Directive {name} is not available
  outside a full build.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-005
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-022; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-CORE-022
---

## Directives needing a build show an inert placeholder with a warning

### Normative behavior

When a document holds a directive the preview cannot resolve without a project build, the extension SHALL show an inert placeholder `{name} arguments` with its body and one warning Directive {name} is not available outside a full build.

### Scenario: Nominal

- GIVEN an unknown directive `{animation}` with a body
- WHEN the preview renders
- THEN a placeholder with the body shows and the warning is listed on that line

### Scenario: Boundary or refusal

- GIVEN `toc`, `{embed}`, `{glossary}` or an unexpanded `{include}`
- WHEN the preview renders
- THEN each shows the same placeholder and warning

### Verification notes

- Method: Unit test "project-scoped roles and directives degrade to labelled placeholders" in test/core/render/mystFeatures.test.ts; Unit test "a toctree lists links labelled by the target H1, the file name or an explicit title" in test/core/render/gridToctree.test.ts
- Criteria: Supported directives (admonitions, figure, image, tables, grid, toctree, math, code family, mermaid, uml, include) show no placeholder.
