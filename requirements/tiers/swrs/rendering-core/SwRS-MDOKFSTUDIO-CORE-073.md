---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-073
uuid: 34664f36-cbc5-4884-b42e-4ce8619811ac
title: The writing skill's examples render without error
description: When the repository is checked, the writing skill for Studio SHALL
  contain only examples that the preview pipeline renders without a diagnostic
  or an unresolved directive, and that cover the syntaxes the skill lists.
project: MDOKFSTUDIO
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- skills/writing-for-markdown-okf-schema-studio/SKILL.md
tested_in_files:
- test/core/render/writingSkill.test.ts
default_owner_email: gaetan@xeberon.net
---

## The writing skill's examples render without error

### Normative behavior

When the repository is checked, the writing skill for Studio SHALL contain only examples that the preview pipeline renders without a diagnostic or an unresolved directive, and that cover the syntaxes the skill lists.

### Scenario (nominal): Every example renders

- GIVEN the skill folder `skills/writing-for-markdown-okf-schema-studio/` with its `SKILL.md` and `references/*.md`
- WHEN each `markdown` example block of those files is rendered by the preview pipeline, in a workspace where the files it names exist
- THEN no render fails, no diagnostic of warning or error severity is produced, no directive is left unresolved, and every syntax family the skill lists (cards, tabs, version notes, alerts, admonitions, table of contents, math, list table, figure, Mermaid, PlantUML, Vega-Lite, README HTML, comment threads, front matter, radio choices in a plan) appears in at least one example and is rendered as its own element

### Scenario (boundary): Shape of the skill

| Input | Outcome |
| --- | --- |
| the skill folder is missing or has no `SKILL.md` | the check fails |
| the front matter `name` differs from the folder name, or `description` is empty or over 1 024 characters | the check fails |
| `SKILL.md` is longer than 160 lines | the check fails (progressive disclosure goes to `references/`) |
| a link or path into the repository sources (`src/`, `test/`, `..`, an absolute path) | the check fails: the skill is self-contained |
| an example uses a directive Studio does not know | the check fails (unresolved directive warning) |

### Related requirements

- SwRS-MDOKFSTUDIO-CORE-072: the table of contents marker the skill teaches.
- SwRS-MDOKFSTUDIO-DIAG-121: the chart fences the skill teaches.

### Verification notes

- Method: test/core/render/writingSkill.test.ts renders every example through `renderPreviewDocument` and checks the shape of the skill folder.
- Criteria: zero diagnostics and zero unresolved directives over all examples; each listed syntax family present and rendered; the shape rules above hold.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
<!-- okf:links:end -->
