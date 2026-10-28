---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-003
uuid: 181e563a-f6da-4b89-9c55-8a486f9121eb
title: Edit mode titles an open comment with its literal tag
description: While edit mode is on, when the writer opens an HTML comment chip,
  the preview SHALL title the opened block with the literal opening syntax of
  the comment, <!-- --> for a comment and <!-- TODO --> for a comment whose text
  starts with TODO in any case, and the renderer SHALL treat that comment as a
  TODO comment.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-012
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/commentMarkers.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/core/render/blockTagTitle.test.ts
- test/core/render/commentMarkers.test.ts
- test/integration/commentTitleWindow.ts
default_owner_email: gaetan@xeberon.net
---

## Edit mode titles an open comment with its literal tag

### Normative behavior

While edit mode is on, when the writer opens an HTML comment chip, the preview SHALL title the opened block with the literal opening syntax of the comment, <!-- --> for a comment and <!-- TODO --> for a comment whose text starts with TODO in any case, and the renderer SHALL treat that comment as a TODO comment.

### Scenario (nominal): Comment titles

| Source | Title of the opened block in edit mode |
| --- | --- |
| `<!-- a plain note -->` | `<!-- -->` in code font |
| `<!-- TODO: cite the slop zone -->` | `<!-- TODO -->` in code font |
| `<!-- todo lower case -->` | `<!-- TODO -->` in code font |
| A multi-line comment starting with TODO on its first line | `<!-- TODO -->` in code font |

### Scenario (boundary): Read mode

- GIVEN the same comments with edit mode off
- WHEN a chip is opened
- THEN the title stays the word Comment, or TODO for a TODO comment

### Scenario (boundary): What is a TODO comment

| Comment text | Kind |
| --- | --- |
| Starts with TODO, todo or Todo, with or without a colon | todo (green chip) |
| Starts with TODOS or TODO_ | comment (gray chip) |
| Has TODO later in the text, not at the start | comment (gray chip) |

### Scenario (refusal): Title is data

- GIVEN a comment whose text holds markup
- WHEN the document is rendered
- THEN the title is the constant tag held in a `data-okf-tag` attribute, never the comment text

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-133: the gray comment chip and its hidden body.
- SwRS-MDOKFSTUDIO-REVIEW-139: the green TODO chip.

### Verification notes

- Method: test/core/render/commentMarkers.test.ts (`a TODO comment is detected in any case, with or without a colon, on one or several lines`, `a comment body carries its literal edit-mode tag as data`), test/core/render/blockTagTitle.test.ts (title rules), test/core/preview/previewStyles.test.ts (`edit mode titles an open comment with its literal tag`).
- Method: real-window scenario test/integration/commentTitleWindow.ts (the title painted for each comment in edit and read mode).
- Criteria: the body of each comment carries the constant data-okf-tag, a lower-case todo comment is of kind todo, the stylesheet shows the tag in code font only when edit mode is on, and the painted title equals the expected tag.
