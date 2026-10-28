---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-072
uuid: bdf17d06-bb66-4a26-99d4-d34571724a17
title: A [TOC] marker or a contents directive renders the table of contents
description: When a paragraph holds only [TOC] or [[_TOC_]] (any case), or a
  MyST contents directive is written, the preview SHALL render in its place the
  headings of the document as a nested list of links to the headings, limited by
  the depth option and to the current section by the local option of the
  directive, generated at render time and never written to the file, and, in
  edit mode, SHALL show the block as an admonition-like block titled with the
  literal marker instead of the list.
project: MDOKFSTUDIO
scope: rendering-core
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/tocStyles.ts
- src/core/render/mystToc.ts
tested_in_files:
- test/core/render/blockTagTitle.test.ts
- test/core/render/mystToc.test.ts
- test/integration/tocWindow.ts
default_owner_email: gaetan@xeberon.net
---

## A [TOC] marker or a contents directive renders the table of contents

### Normative behavior

When a paragraph holds only `[TOC]` or `[[_TOC_]]` (case-insensitive), or a MyST `{contents}` directive is written, the preview SHALL render in its place the headings of the document as a nested list of links to the headings, limited to N list levels by the `:depth: N` option and to the section the directive is in by the `:local:` option of the directive, generated at render time and never written to the file, and, in edit mode, SHALL show the block as an admonition-like block titled with the literal marker (`[TOC]`, `[[_TOC_]]` or the `{contents}` opening line) instead of the list. The bracket markers take no depth option.

### Scenario (nominal): Table of contents

- GIVEN a document with `[TOC]` (or `[[_TOC_]]`, or `{contents}`) alone in a block and the headings `# A`, `## B`, `## C`, `### D`
- WHEN the document is rendered
- THEN the marker is replaced by a `nav` holding a nested list of links `A` > (`B`, `C` > `D`), each pointing to `#` plus the slug of its heading, every heading carries that slug as its `id`, and the saved file still holds only the marker

### Scenario (boundary): Depth, duplicates and exclusions

| Input | Outcome |
| --- | --- |
| `{contents}` with `:depth: 1` | only the top level of the list; `:depth: 2` stops after two list levels (a heading that skips a level nests directly under the previous shallower one); without the option, no limit |
| `{contents}` with `:local:` | only the headings of the section the directive is in, after it, down to the next heading as high as the one before it; the rest of the document when no heading precedes it |
| `[toc]`, `[[_toc_]]` | markers too: the match ignores the case |
| two headings with the same text | the second gets the slug suffix `-1` (then `-2`), like on GitHub |
| a heading made only of an anchor or empty text | not listed |
| headings brought in by `{include}` | not listed; the scope is the document itself |
| `[TOC]` or `[[_TOC_]]` inside a code block, inline code, or in a paragraph with other text | not a marker; the usual rendering applies |
| a document without headings | the marker renders nothing in read mode |

### Scenario (nominal): Edit mode

- GIVEN edit mode is on
- WHEN a `[TOC]`, `[[_TOC_]]` or `{contents}` block is rendered
- THEN it is shown as an admonition-like block titled with the literal marker in code font, the generated list is hidden, a click edits the marker line only, and read mode shows the list without any frame or title

### Related requirements

- SwRS-MDOKFSTUDIO-CORE-003: the source lines of a block, which the table of contents block shares.
- SwRS-MDOKFSTUDIO-CORE-071: the literal-tag title of an HTML block in edit mode.
- SwRS-MDOKFSTUDIO-REVIEW-003: the literal-tag title of a comment block in edit mode.
- SwRS-MDOKFSTUDIO-PALETTE-003: the action that inserts the marker.

### Verification notes

- Method: test/core/render/mystToc.test.ts (the three syntaxes, depth, local, duplicate slugs, exclusions, source lines, read and edit-mode style rules), test/core/render/blockTagTitle.test.ts (the title)
- Method: real-window scenario test/integration/tocWindow.ts (the painted list in read mode, the titled block in edit mode, a click on an entry that reaches its heading)
- Criteria: the rendered tree and CSS match the scenarios above and the painted page shows a clickable list in read mode and the titled box in edit mode.
