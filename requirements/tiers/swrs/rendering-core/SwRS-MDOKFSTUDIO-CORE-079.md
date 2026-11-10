---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-079
uuid: b1b0a10a-7fcb-4e6a-a032-35bb5dca4685
title: Inline code shows a front matter value of the document
description: When inline code in the body is exactly = this.field or =this.field
  and the front matter of the document holds a value for that field, the preview
  SHALL show that value as plain text in place of the inline code, and SHALL
  show the inline code as written with a warning style and report a warning when
  the field is missing.
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
- src/core/preview/styles/frontmatterValueStyles.ts
- src/core/render/frontmatterValues.ts
tested_in_files:
- test/core/render/frontmatterValue.test.ts
- test/core/render/writingSkill.test.ts
- test/visual/frontmatterValueScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Inline code shows a front matter value of the document

### Normative behavior

When inline code in the body is exactly = this.field or =this.field and the front matter of the document holds a value for that field, the preview SHALL show that value as plain text in place of the inline code, and SHALL show the inline code as written with a warning style and report a warning when the field is missing.

### Scenario (nominal): A field of the front matter in the text

- GIVEN a document whose front matter has `title: Hello` and a body line Title: followed by inline code that holds = this.title
- WHEN the preview renders the document
- THEN the line reads "Title: Hello", the value is a span of plain text and no code element remains

### Scenario (nominal): The value follows the front matter

- GIVEN the same document shown in the preview
- WHEN the front matter value changes, in the properties table or in the text editor
- THEN the next render shows the new value, and the source keeps the expression

### Scenario (boundary): Types of value

| Value of the field | Shown as |
| --- | --- |
| a string or a number | the text |
| a boolean | true or false |
| a list | its items joined with a comma and a space |
| an object | its YAML on one line, in flow style |
| a nested field, written this.a.b | the value at that path, through objects only |

The form is inline code that holds exactly = this.field or =this.field, with at most one space after the equals sign. The number of backticks that delimit the inline code does not change its text: to show the form itself as code, keep a backtick inside the code (`` `= this.field` ``, shown with its backticks) or put it in a fenced block. The value is set as text: HTML and Markdown in it are never interpreted. A table of contents entry built from a heading that holds the form reads the value, and the heading anchor and the link of the entry are built from the value too (they agree, and they change when the value changes). An included file is part of the rendered document: its form reads the front matter of the including document. An empty object counts as without a value, like an empty list.

### Scenario (failure): A field without a value

- GIVEN a field that is absent, empty or null, a path through a scalar, an inherited name such as toString, a document without front matter, or a front matter that is not valid YAML
- WHEN the preview renders the inline code that names it
- THEN the inline code stays as written with a dashed warning underline and a title that says why, never an empty string, and the render reports one warning with the line (at most 20 per render)

### Scenario (boundary): Code that is not the form

- GIVEN inline code such as `= this.title x`, `==this.title`, `= that.title`, `= this.` or `x = this.title`, inline code that keeps a backtick around the form such as `` `= this.title` ``, or a fenced block that holds the expression
- WHEN the preview renders the document
- THEN it is unchanged and no warning is reported

### Verification notes

- Method: test/core/render/frontmatterValue.test.ts (every type, the missing cases, the hostile value, the lookalikes, the next render after a change of the front matter, the page sanitizer)
- Method: the writing skill example in test/core/render/writingSkill.test.ts
- Method: the visual scenarios rendering-core/v32 and v33 (value, missing key, light and dark)
- Method: only the front matter of the document itself is read; another document or a wikilink is not.
- Criteria: the text of the page equals the formatted value, the page holds no element built from the value, and the warning style and the diagnostic appear exactly for the fields without a value.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
<!-- okf:links:end -->
