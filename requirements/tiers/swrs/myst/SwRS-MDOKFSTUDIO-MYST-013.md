---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-013
uuid: cded7006-5260-4b08-b9bd-c5ae8b434973
title: Context tags render as titled panels
description: When a document holds a lower-case context tag alone on its line
  with a matching closing tag, the extension SHALL render a no-icon admonition
  panel titled with the literal tag around the Markdown between the tags, mapped
  from opening to closing line, nested pairs as nested panels, and keep an
  unpaired or non-context tag visible as literal text.
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
- src/core/render/mystContextTags.ts
tested_in_files:
- test/core/render/mystFeatures.test.ts
- test/session/alertBlockEditOpen.test.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-MYST-014
- SwRS-MDOKFSTUDIO-MYST-015
- SwRS-MDOKFSTUDIO-MYST-016
---

## Context tags render as titled panels

### Normative behavior

When a document holds a lower-case context tag alone on its line with a matching closing tag, the extension SHALL render a no-icon admonition panel titled with the literal tag around the Markdown between the tags, mapped from opening to closing line, nested pairs as nested panels, and keep an unpaired or non-context tag visible as literal text.

### Scenario (nominal): Standalone context tags render as titled panels

- GIVEN an opening and a closing context tag named context around links, bold and a fenced YAML block
- WHEN the preview renders
- THEN a panel titled with the tag holds the rendered Markdown and maps to both lines

### Scenario (boundary): Only the context tag pattern becomes a panel

- GIVEN an inline tag in a sentence
- WHEN the preview renders
- THEN the raw tag is not rendered as HTML and no panel is made, since only the pattern `[a-z][a-z0-9_-]*` (lower-case letters, digits, hyphens and underscores) alone on its line with a matching closing tag becomes a panel

### Scenario (nominal): Nested context tags render as nested panels

- GIVEN an outer tag pair around an inner one
- WHEN the preview renders
- THEN two panels are shown, the inner inside the outer, with distinct source ranges, each pair mapping to its own lines

### Scenario (refusal): Unpaired tags stay visible as text

- GIVEN a context tag with a missing or mismatched closing tag, a tag with attributes, a self-closing tag, or an inner pair with a missing closing tag
- WHEN the preview renders
- THEN the tag and its body show as literal text and no panel is made, the unpaired inner tag staying literal text inside the outer panel

### Scenario (refusal): Non-context tags are never grouped

- GIVEN `div`, `details`, `summary`, `table`, `script`, inline XML or fenced `xml` code, or an upper-case or dotted tag
- WHEN the preview renders
- THEN they are never grouped into a panel

### Scenario (nominal): Context tags group inside containers and split raw HTML blocks

- GIVEN a context tag pair inside a block quote, list item, definition list or directive container, or a raw HTML block kept whole by the parser
- WHEN the preview renders
- THEN the pair is grouped as a panel inside its container (for a list item, the panel appears inside the list item) and its Markdown is parsed

### Scenario (boundary): A raw HTML block with tags and Markdown is split

- GIVEN a raw HTML block with tags and Markdown without blank lines holding a GitHub alert
- WHEN the preview renders
- THEN the block is split and the alert is rendered

### Verification notes

- Method: test/core/render/mystFeatures.test.ts (standalone, tag pattern and inline tag: "standalone hyphenated context tags render as mapped Markdown admonitions"; nested and nested unpaired inner tag: "nested context tags preserve each wrapper range"; unpaired and non-context tags: "unsupported context boundaries stay literal and fenced XML stays code")
- Method: test/visual/scenarioDefinitions1.ts (grouping inside containers and split raw HTML block: visual scenario `context-tags-${theme}-wide`)
- Criteria: Only the pattern `[a-z][a-z0-9_-]*` with a matching closing tag becomes a panel; each pair maps to its own lines; grouping works in all listed containers.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-001](../../strs/myst/StRS-MDOKFSTUDIO-MYST-001.md): MyST directives and roles render as readable blocks
- Supersedes:
  - [SwRS-MDOKFSTUDIO-MYST-014](SwRS-MDOKFSTUDIO-MYST-014.md): Nested context tags render as nested panels
  - [SwRS-MDOKFSTUDIO-MYST-015](SwRS-MDOKFSTUDIO-MYST-015.md): Unpaired or non-context tags stay visible as text
  - [SwRS-MDOKFSTUDIO-MYST-016](SwRS-MDOKFSTUDIO-MYST-016.md): Context tags group inside containers and split raw HTML blocks
<!-- okf:links:end -->
