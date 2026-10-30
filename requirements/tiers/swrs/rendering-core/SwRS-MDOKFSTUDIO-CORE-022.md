---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-022
uuid: 725d038d-c6c0-4ea4-8cc5-c9b1ea831414
title: Build-dependent constructs show an inert placeholder with a warning
description: When a document holds a construct that only a full project build
  can resolve (an unknown directive, `toc`, an unexpanded `{include}`,
  `{embed}`, `{glossary}`, a known directive that renders nothing, a `{cite}`
  role, a `{bibliography}` directive, a `#tbl:` notebook output reference or an
  unexecuted `{code-cell}` output), the extension SHALL render an inert, muted
  placeholder that shows the name, arguments and body as text and list a warning
  for a directive, a notebook output or a code cell output while the render
  stays successful.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-003
- StRS-MDOKFSTUDIO-MYST-005
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.ts
- src/core/render/mystNormalize.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/core/render/gridToctree.test.ts
- test/core/render/mystFeatures.test.ts
- test/core/render/mystPaletteRendering.test.ts
- test/integration/projectFeatures.test.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CORE-023
- SwRS-MDOKFSTUDIO-CORE-036
- SwRS-MDOKFSTUDIO-CORE-047
- SwRS-MDOKFSTUDIO-MYST-020
- SwRS-MDOKFSTUDIO-MYST-021
- SwRS-MDOKFSTUDIO-MYST-022
- SwRS-MDOKFSTUDIO-MYST-023
---

## Build-dependent constructs show an inert placeholder with a warning

### Normative behavior

When a document holds a construct that only a full project build can resolve (an unknown directive, `toc`, an unexpanded `{include}`, `{embed}`, `{glossary}`, a known directive that renders nothing, a `{cite}` role, a `{bibliography}` directive, a `#tbl:` notebook output reference or an unexecuted `{code-cell}` output), the extension SHALL render an inert, muted placeholder that shows the name, arguments and body as text and list a warning for a directive, a notebook output or a code cell output while the render stays successful.

### Scenario (nominal): Unknown directive
- GIVEN an unknown directive `{foo} bar` with a body, or `{animation}` with a body, on line 4
- WHEN the preview renders
- THEN a placeholder shows `{foo} bar` and the body text, mapped to its line
- AND the status region lists one warning "Directive {foo} is not available outside a full build." with line 4 and the status is "Preview ready"

### Scenario (boundary): Directives that only a build resolves
| Input | Outcome |
| --- | --- |
| `toc` | the same placeholder and the same warning |
| `{embed}` | the same placeholder and the same warning |
| `{glossary}` | the same placeholder and the same warning |
| an unexpanded `{include}` | the same placeholder and the same warning |
| a known directive that renders to nothing | the placeholder is shown, not an empty gap, with the warning |
| a supported directive (admonitions, figure, image, tables, grid, toctree, math, code family, mermaid, uml, include) | no placeholder and no such warning |
| a document with no unresolved directive | no such warning is listed |

### Scenario (boundary): Citations
| Input | Outcome |
| --- | --- |
| `{cite}`smith2020`` | `[smith2020]` in muted text with the tooltip "Unresolved citation: smith2020"; an inert citation placeholder; no warning is listed |
| `{cite}`a,b,c`` in a paragraph, a list and an admonition | the group stays in its paragraph with every key kept and no warning is listed |
| a document without a `{bibliography}` | no bibliography is appended |

### Scenario (nominal): Bibliography directive
- GIVEN a `{bibliography}` directive
- WHEN the preview renders
- THEN the placeholder says "Bibliography resolves at build time."
- AND a document without the directive shows no such note

### Scenario (nominal): Notebook output and code cell output
- GIVEN an unexecuted `{code-cell}` output
- WHEN the preview renders
- THEN a note "Code cell output is not executed in the active-file preview; it is available in a full project build." is shown with a warning on its line
- AND a `#tbl:` notebook output reference shows a note "Notebook output #tbl:... is only available in a full project build." with a warning on its line

### Scenario (nominal): Inert styling
| Placeholder | Style |
| --- | --- |
| unresolved directive | muted text in a dashed box |
| citation | muted text with a dotted underline and a help cursor |
| notebook output | muted text |
| bibliography | muted text |

### Verification notes
- Method: test/core/render/mystFeatures.test.ts, tests "project-scoped roles and directives degrade to labelled placeholders" (unknown directive, directives that only a build resolves, citations) and "Jupyter table output embeds show a project-build placeholder" (the `#tbl:` case); "MyST code-cell directives render numbered input without claiming execution" (code cell output)
- Method: test/integration/projectFeatures.test.ts, suite run() (unknown directive warning with its line and "Preview ready"; no warning without an unresolved directive)
- Method: test/core/render/gridToctree.test.ts, test "a toctree lists links labelled by the target H1, the file name or an explicit title" (supported directives show no placeholder)
- Method: test/core/render/mystPaletteRendering.test.ts, test "T30: a {cite} inserted by the edition palette renders the citation placeholder" (citations)
- Method: visual scenario unresolved-dark-full in test/visual/scenarioDefinitions1.ts (bibliography directive note, exact text)
- Method: test/core/preview/previewStyles.test.ts, test "MyST table alignment and notebook output placeholders are styled" (inert styling)
- Criteria: One warning per placeholder with its line and a ready status; a citation yields a placeholder and no added section or warning; the placeholder classes carry the muted, dashed and dotted styles.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-003](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-003.md): A reader sees what cannot be rendered and keeps a usable preview
  - [StRS-MDOKFSTUDIO-MYST-005](../../strs/myst/StRS-MDOKFSTUDIO-MYST-005.md): Build-dependent constructs appear as labelled placeholders
- Supersedes:
  - [SwRS-MDOKFSTUDIO-CORE-023](SwRS-MDOKFSTUDIO-CORE-023.md): List a warning for an unavailable directive
  - [SwRS-MDOKFSTUDIO-CORE-036](SwRS-MDOKFSTUDIO-CORE-036.md): Style placeholders as inert
  - [SwRS-MDOKFSTUDIO-CORE-047](SwRS-MDOKFSTUDIO-CORE-047.md): Show a citation as an unresolved placeholder
  - [SwRS-MDOKFSTUDIO-MYST-020](../myst/SwRS-MDOKFSTUDIO-MYST-020.md): Unresolved citations show as muted keys
  - [SwRS-MDOKFSTUDIO-MYST-021](../myst/SwRS-MDOKFSTUDIO-MYST-021.md): Directives needing a build show an inert placeholder with a warning
  - [SwRS-MDOKFSTUDIO-MYST-022](../myst/SwRS-MDOKFSTUDIO-MYST-022.md): The bibliography directive explains build-time resolution
  - [SwRS-MDOKFSTUDIO-MYST-023](../myst/SwRS-MDOKFSTUDIO-MYST-023.md): Notebook output references show a note and a warning
<!-- okf:links:end -->
