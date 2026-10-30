---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-001
uuid: 0974894c-5149-402f-8bec-8a278aa22ac1
title: Admonitions render as coloured callouts with a title
description: When a document holds an admonition directive, the extension SHALL
  render a panel with the title, accent colour, badge and Markdown body of its
  kind, and a custom, untitled, simple, icon-less, version or Quarto form keeps
  its own title and decoration.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/directives/admonition.ts
- src/core/render/mystBlockTransforms.ts
- src/core/render/mystNormalize.ts
tested_in_files:
- test/core/directives/registry.test.ts
- test/core/preview/previewStyles.test.ts
- test/core/render/cardsTabs.test.ts
- test/core/render/mystFeatures.test.ts
- test/integration/mystBlocksWindow.ts
- test/visual/cardsTabsScenarios.ts
- test/visual/scenarioDefinitions1.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CORE-061
- SwRS-MDOKFSTUDIO-MYST-002
- SwRS-MDOKFSTUDIO-MYST-004
- SwRS-MDOKFSTUDIO-MYST-005
- SwRS-MDOKFSTUDIO-MYST-010
- SwRS-MDOKFSTUDIO-MYST-011
- SwRS-MDOKFSTUDIO-MYST-012
- SwRS-MDOKFSTUDIO-MYST-087
---

## Admonitions render as coloured callouts with a title

### Normative behavior

When a document holds an admonition directive, the extension SHALL render a panel with the title, accent colour, badge and Markdown body of its kind, and a custom, untitled, simple, icon-less, version or Quarto form keeps its own title and decoration.

### Scenario (nominal): Named kind shows its default title

- GIVEN a document with a `:::{note}` directive and a Markdown body, and one directive for each other named kind written with colon or backtick fences
- WHEN the preview renders
- THEN a panel titled Note holds the rendered body, and each kind is titled by its own directive name and has its own palette action, as the table gives

| Directive | Default title |
| --- | --- |
| note | Note |
| attention | Attention |
| caution | Caution |
| danger | Danger |
| error | Error |
| hint | Hint |
| important | Important |
| seealso | See Also |
| tip | Tip |
| warning | Warning |

### Scenario (boundary): Kind outside the named list

- GIVEN a document with an admonition kind outside the named list, or an admonition name that is not registered
- WHEN the preview renders
- THEN the panel is titled Admonition, uses the generic Admonition rendering and keeps its body

### Scenario (nominal): Accent colour and badge by kind

- GIVEN a note, a tip, an important, a warning, a caution and a danger admonition
- WHEN the preview renders
- THEN each panel has the accent of its kind and a badge in that accent, as the table gives

| Kind | Accent |
| --- | --- |
| note | blue |
| tip | green |
| important | purple |
| warning | yellow |
| caution | red with an octagon (not the warning yellow) |
| danger | red with a cross |

### Scenario (nominal): Version admonitions

- GIVEN `{versionadded} 2.1` with a body, `{versionchanged}` and `{deprecated}` with versions, and a body with emphasis
- WHEN the preview renders
- THEN each panel has the title and accent of the table, with the given version for X, and the Markdown body follows parsed (the emphasis is rendered)

| Directive | Title | Accent |
| --- | --- | --- |
| `{versionadded}` | Added in version X (for example Added in version 2.1), no trailing colon | green |
| `{versionchanged}` | Changed in version X | yellow |
| `{deprecated}` | Deprecated since version X | red |

### Scenario (nominal): Custom admonition title and class

- GIVEN `{admonition} A *plain* title` with `:class: tip`, and an `{admonition}` without a `:class:` option
- WHEN the preview renders
- THEN the title shows its inline Markdown rendered (emphasised text) and the panel has the tip colour, and the panel without a class keeps the neutral accent

### Scenario (boundary): Untitled admonition takes its title from the first body line

- GIVEN an admonition without a title argument whose body starts with a bold line or a heading
- WHEN the preview renders
- THEN the first line becomes the panel title, shown as a title and not as a heading, and the remaining lines form the body

| Body starts with | Panel title |
| --- | --- |
| `**A bold title**` | A bold title |
| `### Title` | Title |

### Scenario (boundary): Simple and icon-less admonitions

- GIVEN an admonition with `:class: simple`, and an admonition with `:icon: false`
- WHEN the preview renders
- THEN the first is a plain left-bar callout and the second hides the badge, each option changing only its own decoration

### Scenario (boundary): Dropdown admonitions show their state

- GIVEN an admonition with `:class: dropdown`, once closed and once with `:open: true`
- WHEN the preview renders and the reader toggles the title
- THEN a chevron at the right of the title points right while the dropdown is closed and down while it is open, whatever the admonition kind and theme

### Scenario (boundary): Quarto callouts

- GIVEN a Quarto callout div such as `::: {.callout-tip}`, once with a leading heading and once without
- WHEN the preview renders
- THEN a simple admonition of that kind is shown, titled with the leading heading, or with the kind's default title when the div has no heading

### Verification notes

- Method: test/core/render/mystFeatures.test.ts (scenarios named kind and kind outside the list: "all named MyST admonitions receive their documented default title"; version admonitions: "Sphinx version admonitions render generated titles and Markdown bodies"; custom title and class: "custom admonition titles preserve inline Markdown and their class"; untitled: "a leading bold paragraph or heading supplies the MyST admonition title"; Quarto callouts: "Quarto callout classes render as semantic MyST admonitions"; simple and icon-less: "dropdown admonitions render as openable details with a summary", which checks the `simple` and `no-icon` classes)
- Method: test/core/preview/previewStyles.test.ts (dropdown state: "dropdown admonitions show their open or closed state with a chevron"); test/visual/scenarioAssertions.ts (dropdown state: visual scenarios myst-gallery-full, assertion "the closed dropdown shows a state chevron at the right of its title")
- Method: test/core/preview/previewStyles.test.ts (accent and badge: "every admonition flavour gets an accent colour"; simple and icon-less: "MyST simple and no-icon admonition modifiers are styled")
- Method: test/visual/scenarioDefinitions1.ts (accent and badge: visual scenario admonitions-dark-full)
- Method: test/core/directives/registry.test.ts (named kind and kind outside the list: "each directive name has one plug-in, found by its exact name")
- Criteria: Every named kind shows its default title and accent; an unregistered name falls back to Admonition; every version, custom, untitled, simple, icon-less and Quarto form changes only its own title or decoration.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-001](../../strs/myst/StRS-MDOKFSTUDIO-MYST-001.md): MyST directives and roles render as readable blocks
- Supersedes:
  - [SwRS-MDOKFSTUDIO-CORE-061](../rendering-core/SwRS-MDOKFSTUDIO-CORE-061.md): Render version admonitions
  - [SwRS-MDOKFSTUDIO-MYST-002](SwRS-MDOKFSTUDIO-MYST-002.md): Admonitions take an accent colour and badge by kind
  - [SwRS-MDOKFSTUDIO-MYST-004](SwRS-MDOKFSTUDIO-MYST-004.md): Custom admonitions show their written title and class colour
  - [SwRS-MDOKFSTUDIO-MYST-005](SwRS-MDOKFSTUDIO-MYST-005.md): Untitled admonitions take their title from a leading bold line or heading
  - [SwRS-MDOKFSTUDIO-MYST-010](SwRS-MDOKFSTUDIO-MYST-010.md): Simple and icon-less admonitions drop their decoration
  - [SwRS-MDOKFSTUDIO-MYST-011](SwRS-MDOKFSTUDIO-MYST-011.md): Version admonitions show their version title
  - [SwRS-MDOKFSTUDIO-MYST-012](SwRS-MDOKFSTUDIO-MYST-012.md): Quarto callouts render as simple admonitions
  - [SwRS-MDOKFSTUDIO-MYST-087](SwRS-MDOKFSTUDIO-MYST-087.md): Each admonition kind renders under its own directive name
<!-- okf:links:end -->
