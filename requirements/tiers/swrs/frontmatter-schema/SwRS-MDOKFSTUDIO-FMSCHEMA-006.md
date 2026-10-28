---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-006
uuid: ddd79816-4f35-4eb1-bfe0-afb844a70534
title: Property values read like YAML in a lean table
description: When the properties table is displayed, the extension SHALL show
  each frontmatter value in the Value cell as YAML reads it, a mapping without a
  link as a YAML code block, a boolean as a read-only checkbox, a list as at
  most 50 dash-marked items and an empty list or null as `[]` or `null`, inside
  a table drawn without outer border that fits a preview 640 px wide or less.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/frontmatter/propertiesTable.ts
tested_in_files:
- test/core/frontmatter/propertiesTable.test.ts
- test/visual/scenarioDefinitions1.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## Property values read like YAML in a lean table

### Normative behavior

When the properties table is displayed, the extension SHALL show each frontmatter value in the Value cell as YAML reads it, a mapping without a link as a YAML code block, a boolean as a read-only checkbox, a list as at most 50 dash-marked items and an empty list or null as `[]` or `null`, inside a table drawn without outer border that fits a preview 640 px wide or less.

### Scenario (nominal): Value kinds

| Input | Outcome |
| --- | --- |
| A mapping value `obj` with the keys `a: 1` and `b` holding a list with x | The Value cell of obj holds a code block in YAML syntax reading `a: 1`, `b:` and `  - x` on separate lines |
| A list field that holds a mapping item | The list item is shown with its keys as a nested key and value list, not as raw JSON |
| `flag: true` | The Value cell holds a checked checkbox with aria-disabled true and tabindex -1, and the word true |
| `flag: false` | The Value cell holds an unchecked checkbox with aria-disabled true and the word false |
| `empty: []` | The Value cell reads [] |
| `none:` with no value | The Value cell reads null |

### Scenario (boundary): List limit

| Input | Outcome |
| --- | --- |
| A list field with 52 items | 50 items are listed, one dash-marked item per line, and the text "+ 2 more" follows them |
| A list field with exactly 50 items | All 50 items are listed and no "more" text appears |

### Scenario (nominal): Lean frame

- GIVEN a document with frontmatter in a dark, a white and a cream theme
- WHEN the preview is rendered
- THEN the section and table have no border and no background, the cells are transparent and the title Frontmatter properties has no background
- WHEN the header row is inspected
- THEN the header cells show the translucent grey background and the data cells do not, and an error row has the red background

### Scenario (boundary): Contrast thresholds

| Input | Outcome |
| --- | --- |
| The title badge in a dark, a white and a cream theme | It reaches 2.5:1 contrast |
| The description text | It reaches 2.2:1 and is smaller than the value text |
| The value text | It reaches 4:1 |

### Scenario (boundary): Narrow preview

| Input | Outcome |
| --- | --- |
| A preview 460 px wide showing a schema table with alert rows and link details | The page has no horizontal overflow and long names, values and links wrap inside their cells, with fixed columns |
| A preview wider than 640 px | The table keeps its normal automatic layout |

### Known issues

- Known issue: the helper formatValue of the table renderer is never called and would show an em dash for null; today null shows the word null.
- Known issue: a word can still break in the middle of a name in a narrow preview; there is no stacked layout.

### Verification notes

- Method: `test/core/frontmatter/propertiesTable.test.ts` (value kinds, nested object values as escaped YAML, read-only checkboxes, list cap, empty lists).
- Method: `test/visual/scenarioDefinitions1.ts` (visual scenarios v01 and v05: checkboxes, lean frame, contrast, style checks).
- Method: `test/visual/scenarioDefinitions2.ts` (visual scenarios v01 and v05 style checks; v10, v17 and v19 no-overflow checks at 460 px).
- Criteria: Top-level mapping values use the language-yaml code block; mappings with link results use the structured list. The checkbox has aria-disabled and tabindex -1 but not the HTML disabled attribute; clicking it in edit mode is a frontmatter-editing behaviour.
- Criteria: MAX_LIST_ITEMS is 50; the omitted count is the list length minus 50; both empty-value tokens are literal text in the Value cell.
- Criteria: Computed styles of [data-okf-properties] and its cells match the lean frame in every theme; the contrast thresholds are those checked by the visual scenarios in `capture.py`; the narrow rules apply under the media query max-width 640px.
