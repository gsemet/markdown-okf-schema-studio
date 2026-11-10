---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-125
uuid: 252787a3-581f-43a9-9e8b-20674244fbb3
title: SVG blocks are drawn inline after the sanitizer rebuilt them
description: When a document holds an svg fence or a raw svg element that fills
  a whole block, the preview SHALL draw it inline as a picture rebuilt from an
  allow-list of drawing elements and presentation attributes, with every id and
  reference renamed per picture, and SHALL draw an svg element inside a
  sentence, a comment, a math block, a code block or a raw HTML table as
  nothing.
project: MDOKFSTUDIO
scope: diagrams
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/svgPictures.ts
- src/core/security/svgSanitizer.ts
tested_in_files:
- test/core/render/svgRendering.test.ts
- test/page/svgBreakout.test.ts
- test/security/svgSanitizer.test.ts
- test/visual/svgPictureScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## SVG blocks are drawn inline after the sanitizer rebuilt them

### Normative behavior

When a document holds an svg fence or a raw svg element that fills a whole block, the preview SHALL draw it inline as a picture rebuilt from an allow-list of drawing elements and presentation attributes, with every id and reference renamed per picture, and SHALL draw an svg element inside a sentence, a comment, a math block, a code block or a raw HTML table as nothing. No reference of a picture (url(#id), href) SHALL point at an id the picture does not declare, and a value SHALL hold only a colour, var(), url(#id) or transform function and no scheme.

### Scenario (nominal): A fence and a raw block are pictures

- GIVEN a document with an svg fence and, after a blank line, a raw svg element that holds its whole block (one line or several)
- WHEN the preview renders it
- THEN each is one figure of the class myst-svg-figure that holds one svg element with its viewBox and declared width, carries the data-line of its first line and the data-end-line of its last line, and no code block is left

### Scenario (refusal): Active content and shared ids

- GIVEN an svg with a script element, an on-handler, a foreignObject, a link to an https page, a style element, a use that points at another file, a javascript: or data: URL and a gradient whose id another picture also uses, an image-set() or src() value, and a use or url() that points at an id of another picture or of the page
- WHEN the preview renders it
- THEN none of these reaches the page, the render carries one warning that names what was removed, and each picture keeps its own ids with every url(#id) and href="#id" reference renamed with them

### Scenario (boundary): Inline svg and unreadable source

- GIVEN an svg element inside a sentence, and an svg fence that holds no svg element
- WHEN the preview renders them
- THEN the first draws nothing and the second stays a code block with one warning

| Input | Outcome |
| --- | --- |
| svg fence | one picture |
| raw svg that starts a block after a blank line and ends its last line | one picture |
| svg inside a sentence | nothing |
| svg inside a code block or a fence | the code, unchanged |
| svg inside an html comment, a $$ math block or a raw html table | left as it is (the comment stays one comment); a table cell drops it |
| a `<!--` or `$$` inside a sentence or a code span, before a raw svg block or a code block | opens nothing: the later picture is drawn, the code block keeps its text |
| an author's aria-label (any text, parentheses included) | kept as written |
| a document comment that looks like a picture placeholder | stays a comment; the placeholder holds a per-render random token |
| svg left unclosed | not a picture; the scan stops at the next fence or after 2000 lines |

### Verification notes

- Method: test/security/svgSanitizer.test.ts (one case per hostile input, id renaming, text-only title and desc)
- Method: test/core/render/svgRendering.test.ts (fence, raw block, inline svg, hostile picture, two pictures with the same ids, unreadable source)
- Method: test/page/svgBreakout.test.ts (Auto breaks out a picture wider than the column, keeps a narrower one and one sized in %)
- Method: the visual scenarios diagrams/v19 to v21 (pictures drawn in Cream, White and Dark)
- Criteria: A picture is rebuilt from the allow-list; nothing that runs script, loads a resource or restyles the page survives; ids never collide.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-001](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-001.md): A writer reads and inserts Mermaid diagrams that follow the theme
<!-- okf:links:end -->
