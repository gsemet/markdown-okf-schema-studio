---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-053
uuid: a73b4d1a-8be6-40e2-90e5-977f0e4535d8
title: "Grids lay out cards in responsive columns"
description: "When a document holds a `{grid}` with `{grid-item-card}` items, the
  extension SHALL lay out its items in the columns of its argument, such as `1 1 2
  2`, for the extra-small, small, medium and large panes, chosen by the pane width,
  and show each card with its title, header, body, footer and link."
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystGridToctree.ts
tested_in_files:
- test/core/render/gridToctree.test.ts
- test/visual/scenarioDefinitions2.ts
---

## Grids lay out cards in responsive columns

### Normative behavior

When a document holds a `{grid}` with `{grid-item-card}` items, the extension SHALL lay out its items in the columns of its argument, such as `1 1 2 2`, for the extra-small, small, medium and large panes, chosen by the pane width, and show each card with its title, header, body, footer and link.

### Scenario (nominal): Columns per pane size
- GIVEN `{grid} 1 1 2 2`
- WHEN the preview renders
- THEN the columns per pane size are 1, 1, 2 and 2, one class per breakpoint

### Scenario (boundary): Column arguments
| Input | Outcome |
| --- | --- |
| Fewer than four values | The missing sizes inherit the last value |
| `auto` | Items fill 14 em columns |
| More than 12 | At most 12 columns |
| An invalid value | 1 column |

### Scenario (nominal): Columns follow the pane width
| Input | Outcome |
| --- | --- |
| Four items at 900 px | They form 2 columns |
| The same grid at 460 px | They form 1 column, every card inside the pane and the text after the grid intact |

The columns are picked by the container width (480, 640 and 800 px), not by the window width.

### Scenario (nominal): A card shows its parts
- GIVEN a `{grid-item-card}` with title, a header before `^^^`, body and a footer after `+++`
- WHEN the preview renders
- THEN all four parts show

### Scenario (boundary): Card title link and empty card
| Input | Outcome |
| --- | --- |
| `:link:` given | The title is one link; `:link-alt:` is its tooltip |
| `:link:` with `:link-type: ref` | A `#label` link |
| `:link:` with `:link-type: doc` | The link adds `.md` |
| A title that already holds a link | Only one link is made |
| A card without title, link or parts | An empty body shows |

### Scenario (nominal): Grids nest and keep absolute source lines
- GIVEN grids with backtick, tilde or colon fences, nested up to 8 levels, such as a grid in a card
- WHEN the preview renders
- THEN everything inside, blank lines included, keeps absolute source lines, which scroll sync and block selection rely on

### Scenario (refusal): Grids deeper than 8 levels
- GIVEN a grid deeper than 8 levels
- WHEN the preview renders
- THEN it stays an unexpanded directive placeholder

### Verification notes
- Method: test/core/render/gridToctree.test.ts ("a grid renders its items in a column container with one class per breakpoint": columns and arguments; "the grid stylesheet collapses to one column in a narrow pane": pane width; "a grid-item-card renders header, body, footer and a stretched link": card parts and links; "a grid also works with backtick fences, and grids nest inside items with colon fences": nesting; the placeholder beyond 8 levels has no named test (untested))
- Method: test/visual/scenarioDefinitions2.ts (`myst/v${22 + index}-grid-cards-full-${theme}-${width}`: pane width, one visual family across themes and widths)
- Criteria: Column values are bounded; one visual family across themes and widths; the cards stay inside the pane.
