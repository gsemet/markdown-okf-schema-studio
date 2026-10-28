---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-006
uuid: d02093c6-70d2-494a-bc0f-194a5342ee02
title: Admonitions nest, collapse and map as one block
description: When an admonition directive contains another directive, the
  extension SHALL render the inner panel inside its parent panel, keep inner
  fences as literal code under a longer outer fence, collapse a dropdown under
  its title, and map each admonition as one block from its opening line to its
  closing fence.
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
- src/core/directives/admonition.ts
- src/core/render/mystNormalize.ts
tested_in_files:
- test/core/render/mystFeatures.test.ts
- test/visual/scenarioDefinitions1.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-MYST-003
- SwRS-MDOKFSTUDIO-MYST-007
- SwRS-MDOKFSTUDIO-MYST-008
- SwRS-MDOKFSTUDIO-MYST-009
- SwRS-MDOKFSTUDIO-MYST-052
---

## Admonitions nest, collapse and map as one block

### Normative behavior

When an admonition directive contains another directive, the extension SHALL render the inner panel inside its parent panel, keep inner fences as literal code under a longer outer fence, collapse a dropdown under its title, and map each admonition as one block from its opening line to its closing fence.

### Scenario (nominal): Admonitions nest inside each other

- GIVEN `::::{note}` around `:::{tip}`, and a palette-written warning around a note
- WHEN the preview renders
- THEN the tip panel sits inside the note panel and the note panel stays inside the warning panel, the inner panel being a descendant of the outer one

### Scenario (boundary): The fence length decides which fence closes the directive

- GIVEN a four-colon admonition holding a literal `markdown` code fence, and an outer fence not longer than the inner one
- WHEN the preview renders
- THEN the outcomes of the table hold

| Outer fence | Inner fence | Outcome |
| --- | --- | --- |
| longer than the inner one | `markdown` code fence or inner admonition | the inner fence shows as literal code inside the panel |
| not longer than the inner one | any | the inner fence closes the outer one as Markdown defines |

### Scenario (nominal): An admonition is one mapped block over its whole directive

- GIVEN a three-line admonition at lines 5 to 7, and an admonition nested in another
- WHEN the preview renders
- THEN the panel carries data-line 5 and data-end-line 7, and the outer panel of the nested pair spans the whole outer directive

### Scenario (boundary): Dropdown admonitions collapse under their title

- GIVEN an admonition with `:class: dropdown` or with an `:open:` option
- WHEN the preview renders
- THEN a collapsible section (the native details element) shows the title as its summary, as the table gives

| Options | State |
| --- | --- |
| `:class: dropdown` without `:open:` | closed |
| `:class: dropdown` with `:open: true` | open |
| `:open: true` without `:class: dropdown` | collapsible section, open |

### Scenario (nominal): Admonition gallery keeps one title line per panel without sideways scroll

- GIVEN the admonition gallery document in dark and light themes at 900 px
- WHEN the preview renders
- THEN each admonition has exactly one title line, a source line and a panel colour distinct from the page, the paragraph after it keeps the body text colour and the page does not scroll sideways

### Scenario (boundary): Admonition gallery in a narrow pane

- GIVEN the same gallery at 460 px, scrolled to a titled block or to the end
- WHEN the preview renders
- THEN the same assertions hold and the scrolled-to block stays inside the frame

### Scenario (nominal): The MyST gallery renders without sideways scroll

- GIVEN the MyST gallery document in dark and in light theme at 900 px
- WHEN the preview renders
- THEN a reference link, a closed dropdown, a definition list, sub and superscript, a kbd key, an abbreviation, a footnote and typeset inline math are present and the page does not overflow horizontally

### Verification notes

- Method: test/core/render/mystFeatures.test.ts (nesting and fence length: "nested backtick and colon delimiters preserve their enclosing Markdown"; mapped block: "MyST admonitions retain the directive range through the closing fence"; dropdown: "dropdown admonitions render as openable details with a summary")
- Method: test/visual/scenarioDefinitions1.ts (admonition gallery, both scenarios: visual scenario admonitions-dark-titled)
- Method: test/visual/scenarioDefinitions2.ts (MyST gallery: visual scenario `myst/v${20 + index}-myst-gallery-full-${theme}-900`)
- Criteria: The inner panel is a descendant of the outer panel; the fence length decides which fence closes the directive; data-line and data-end-line match the directive's source lines; the toggle is the native details element; the visual families (one for each gallery, two themes) pass the shared checks.
