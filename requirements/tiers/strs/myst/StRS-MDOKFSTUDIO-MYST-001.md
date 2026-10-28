---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-001
uuid: 1547ec65-6ae8-4b0d-9a47-f3bf5ec0c596
title: MyST directives and roles render as readable blocks
description: When a document uses MyST admonitions, context tags, definition
  lists, text roles, sized figures, grid cards or table directives, the Studio
  SHALL show each as a readable block in the preview without a Sphinx build.
project: markdown-okf-schema-studio
scope: myst
lifecycle: approved
approved_by: gaetan@xeberon.net
approved_on: 2026-10-28
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I want these MyST constructs to look as readers will see
  them, without building, so that I can judge and lay out my document in VS
  Code.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-012
- SwRS-MDOKFSTUDIO-CORE-045
- SwRS-MDOKFSTUDIO-CORE-056
- SwRS-MDOKFSTUDIO-CORE-057
- SwRS-MDOKFSTUDIO-CORE-058
- SwRS-MDOKFSTUDIO-CORE-059
- SwRS-MDOKFSTUDIO-CORE-061
- SwRS-MDOKFSTUDIO-CORE-063
- SwRS-MDOKFSTUDIO-GFM-031
- SwRS-MDOKFSTUDIO-MYST-001
- SwRS-MDOKFSTUDIO-MYST-002
- SwRS-MDOKFSTUDIO-MYST-003
- SwRS-MDOKFSTUDIO-MYST-004
- SwRS-MDOKFSTUDIO-MYST-005
- SwRS-MDOKFSTUDIO-MYST-006
- SwRS-MDOKFSTUDIO-MYST-007
- SwRS-MDOKFSTUDIO-MYST-008
- SwRS-MDOKFSTUDIO-MYST-009
- SwRS-MDOKFSTUDIO-MYST-010
- SwRS-MDOKFSTUDIO-MYST-011
- SwRS-MDOKFSTUDIO-MYST-012
- SwRS-MDOKFSTUDIO-MYST-013
- SwRS-MDOKFSTUDIO-MYST-014
- SwRS-MDOKFSTUDIO-MYST-015
- SwRS-MDOKFSTUDIO-MYST-016
- SwRS-MDOKFSTUDIO-MYST-017
- SwRS-MDOKFSTUDIO-MYST-018
- SwRS-MDOKFSTUDIO-MYST-031
- SwRS-MDOKFSTUDIO-MYST-032
- SwRS-MDOKFSTUDIO-MYST-033
- SwRS-MDOKFSTUDIO-MYST-034
- SwRS-MDOKFSTUDIO-MYST-035
- SwRS-MDOKFSTUDIO-MYST-052
- SwRS-MDOKFSTUDIO-MYST-053
- SwRS-MDOKFSTUDIO-MYST-054
- SwRS-MDOKFSTUDIO-MYST-055
- SwRS-MDOKFSTUDIO-MYST-056
- SwRS-MDOKFSTUDIO-MYST-063
- SwRS-MDOKFSTUDIO-MYST-064
- SwRS-MDOKFSTUDIO-MYST-065
- SwRS-MDOKFSTUDIO-MYST-087
- SwRS-MDOKFSTUDIO-MYST-088
- SwRS-MDOKFSTUDIO-MYST-091
- SwRS-MDOKFSTUDIO-MYST-092
- SwRS-MDOKFSTUDIO-MYST-093
- SwRS-MDOKFSTUDIO-MYST-095
- SwRS-MDOKFSTUDIO-MYST-098
- SwRS-MDOKFSTUDIO-MYST-099
- SwRS-MDOKFSTUDIO-MYST-100
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-MYST-002
- StRS-MDOKFSTUDIO-MYST-003
- StRS-MDOKFSTUDIO-MYST-008
- StRS-MDOKFSTUDIO-MYST-011
- StRS-MDOKFSTUDIO-MYST-013
---

## MyST directives and roles render as readable blocks

### Normative behavior

When a document uses MyST admonitions, context tags, definition lists, text roles, sized figures, grid cards or table directives, the Studio SHALL show each as a readable block in the preview without a Sphinx build.

### Preserved stakeholder intent

Writers want every admonition kind, custom title, dropdown and nesting to look like a distinct callout, pasted context tags to stay readable and inert, text constructs typeset, figure sizing reflected immediately, card layouts usable in narrow panes and all table directive forms to look like tables, so that they can review the document without building.

### Rationale and constraints

- Admonitions: applies to all ten named admonition kinds, custom titles, dropdowns and nesting, shown as a coloured callout with title and body; the same look holds in dark and light themes.
- Context tags: pasted prompt-style tags are shown as a readable panel, never executed as HTML and never losing content; unknown tags stay visible as text.
- Definition lists, subscript, superscript, abbreviations and keys are typeset in the preview without a Sphinx build.
- Figures: width and alignment follow what the source says.
- Grid cards reflow with the pane width rather than overflow sideways.
- List, caption and CSV table directives show as ordinary tables; content stays as authored in the source.
