---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-096
uuid: 482c1fbd-58b7-4b2a-933e-629e21977a6e
title: A directive the parser cannot build shows its source and the render
  continues
description: When a document holds a directive or fence the parser cannot build
  (an unclosed or empty backtick or colon fence such as a list-table or table
  without its body, also nested in another directive), the extension SHALL
  render the raw source lines of that construct as a code block and render the
  rest of the document, instead of failing the render. A fence left open before
  a later heading shows only its opening line, with a warning, and the rest of
  the document renders.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-005
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystDirectiveErrors.ts
- src/core/render/mystUnclosedFences.ts
tested_in_files:
- test/core/render/renderReq.syntaxErrors.requirements.test.ts
- test/visual/scenarioDefinitions1.ts
---

## EARS Expression

### Normative behavior

When a document holds a directive or fence the parser cannot build (an unclosed or empty backtick or colon fence such as a list-table or table without its body, also nested in another directive), the extension SHALL render the raw source lines of that construct as a code block and render the rest of the document, instead of failing the render. When an opening fence (backticks or colons, with or without a directive name) has no closing fence and a heading follows it, the extension SHALL render only the opening line as a code block, report a warning ("unclosed fence") on that line, and render the lines after it as ordinary document content.

### Scenario (nominal): An unclosed or empty directive shows its source
The parser reports a directive without its required body as an error the HTML writer cannot emit; the construct is shown as written instead.
- GIVEN a document ending with a ```` ```{list-table} ```` line, or holding a `:::{table} Caption` fence with no body, and other text around it
- WHEN the preview renders
- THEN the lines of the construct, options and closing fence included, appear as one code block in place, and the text before and after renders as usual

### Scenario (nominal): An unclosed fence in the middle of a document
Markdown runs an unclosed fence to the end of the file; the preview departs from that so the sections after it stay visible. The source is never changed.
- GIVEN a document with a ```` ```{list-table} ````, a `:::{table}`, a `:::{note}` or a plain ```` ``` ```` line that has no closing fence, followed by paragraphs and a heading
- WHEN the preview renders
- THEN the opening line appears as a code block, a warning with the code `unclosed-fence` is reported on that line, and the paragraphs and headings after it render as usual, also when the fence is nested in a closed directive or several fences are left open

### Scenario (boundary): Nested constructs and frontmatter
- GIVEN an unclosed directive inside a `{note}` admonition, or a document with frontmatter or CRLF line breaks
- WHEN the preview renders
- THEN the raw block sits inside the admonition, and its lines are those of the document, frontmatter lines counted

### Scenario (refusal): Labels and includes are not touched
| Input | Outcome |
| --- | --- |
| A label opened with `(name` and never closed | the line stays a paragraph |
| A `)=` target with no label before it | the line stays a paragraph |
| An `{include}` directive without a path | the existing inert placeholder with its warning, not a code block |
| A closed fence, or a fence unclosed to the end of the file with no heading after it | unchanged: a plain code block runs to the end of the file, a directive without body is shown as the code block of its lines |
| A directive error with no usable position (for example one from an included file) | the code block holds the opening fence rebuilt from the directive name and arguments |

### Verification notes
- Method: test/core/render/renderReq.syntaxErrors.requirements.test.ts (unclosed backtick and colon directives, options without body, nested directive, empty directive at the end of the file, labels, frontmatter and CRLF, the fixture, the rebuilt opening line); the visual scenarios myst/v37 and myst/v38 render the fixture test/visual/fixtures/64-unclosed-directives.md; the unclosed-fence tests of the same file (backtick, colon, plain and nested fences in the middle of a document, two open fences, closed fence, frontmatter and CRLF lines) and the visual scenarios myst/v39 and myst/v40 render test/visual/fixtures/65-unclosed-fence-mid-document.md.
- Criteria: the render never fails; each broken construct is one code block of its own lines; the rest of the document renders.
- Known issue: only a fence left open before a heading reports a diagnostic; a directive shown raw for another reason (no body, or open to the end of the file with no heading after it) has no hint.
