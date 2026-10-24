---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-010
uuid: 285213ef-2b75-456b-9d89-0d072ae7ba88
title: Keep PlantUML pictures in place while typing
description: When the preview content or theme changes, the Studio SHALL redraw
  only the bundled-engine diagrams that need it and reuse the others.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I keep typing while the diagrams I did not touch stay
  drawn and the preview stays responsive.
derived_by:
- SwRS-MDOKFSTUDIO-DIAG-039
- SwRS-MDOKFSTUDIO-DIAG-040
- SwRS-MDOKFSTUDIO-DIAG-041
- SwRS-MDOKFSTUDIO-DIAG-042
- SwRS-MDOKFSTUDIO-DIAG-043
- SwRS-MDOKFSTUDIO-DIAG-044
- SwRS-MDOKFSTUDIO-DIAG-045
---

## Keep PlantUML pictures in place while typing

### Normative behavior

When the preview content or theme changes, the Studio SHALL redraw only the bundled-engine diagrams that need it and reuse the others.

### Preserved stakeholder intent

Writers expect unchanged diagrams not to be redrawn when they edit nearby text or flip the theme, so the preview stays quick.

As a writer, I keep typing while the diagrams I did not touch stay drawn and the preview stays responsive.

### Rationale and constraints

- Bundled-engine pictures are kept by source, include base and light/dark variant (64 most recent); results with a refused include, or with an unsupported directive in an included file, are not kept and are asked again next time. Known issue: a plain engine failure (for example a syntax error) is kept until the source or the variant changes. The engine draws one diagram at a time, and a render superseded by a newer one of the same element does not overwrite it.
- After a content patch only the diagrams without a render state are drawn. Known issue: the page-side event wiring and the 64-entry eviction have no unit test; only the visual campaign covers them.
