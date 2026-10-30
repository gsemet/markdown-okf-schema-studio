---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-217
uuid: 4d28ac60-e8a1-48aa-8058-c13424b24b48
title: Pasted HTML becomes the matching Markdown
description: When the clipboard HTML of a paste is converted, the extension
  SHALL write the Markdown of each element it knows (headings, bold, italic,
  strikethrough, links, images, lists, code, block quotes and tables), escape
  text that Markdown would read as markup, keep only the text of every other
  element, and give an empty text when nothing readable is left.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-018
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-213
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/paste/htmlToMarkdown.ts
tested_in_files:
- test/core/paste/htmlToMarkdown.test.ts
- test/core/paste/paletteReq.requirements.test.ts
- test/integration/imagePaste.test.ts
default_owner_email: gaetan@xeberon.net
---

## Pasted HTML becomes the matching Markdown

### Normative behavior

When the clipboard HTML of a paste is converted, the extension SHALL write the Markdown of each element it knows (headings, bold, italic, strikethrough, links, images, lists, code, block quotes and tables), escape text that Markdown would read as markup, keep only the text of every other element, and give an empty text when nothing readable is left.

### Scenario (nominal): Headings and emphasis, also from styles
- GIVEN pasted HTML with headings and with bold, italic or struck-through text, set by an element or by a style
- WHEN the HTML is converted
- THEN each case gives the Markdown of the table, and an empty heading gives no line

| Input | Outcome |
| --- | --- |
| h1 to h6 element | a line with 1 to 6 number signs and the text |
| h2 element with a bold span | the line reads ## and the text, without asterisks (bold and italic markers inside a heading are dropped) |
| h2 element with no text | no line is produced |
| spans with font-weight 700, font-style italic and text-decoration line-through (Google Docs) | the text carries the markers **, * and ~~ (double asterisks, single asterisks, double tildes) |
| b element styled font-weight normal (Google Docs wrapper) | the text is not bold |

### Scenario (nominal): Links and images
- GIVEN a link with emphasis inside and an image with alt text Logo, both with a safe address
- WHEN the HTML is converted
- THEN the text reads [the *docs*](https://example.com/a%28b%29) and [Logo](https://example.com/i.png)

| Input | Outcome |
| --- | --- |
| link with text | [text](address), the parentheses of the address percent-encoded and an address with blanks in angle brackets |
| image with alternative text | [alt](address), using the word image when the alternative text is empty |
| link with no text | no link is produced |

The refusal of an unsafe address is in SwRS-MDOKFSTUDIO-PALETTE-229.

### Scenario (nominal): Lists with nesting, start number and task boxes
- GIVEN an ol with start 3, an inner ol, a rule and a checked task item
- WHEN the HTML is converted
- THEN the text reads 3. Three, 4. Four with an indented 1. Inner, then ---, then - [x] Done

| Input | Outcome |
| --- | --- |
| ul and ol lists | dash lists and numbered lists, with their nesting and the start number of an ordered list |
| checked checkbox input in an item | [x] |
| unchecked checkbox input in an item | [ ] |
| nested list placed next to its parent item (Google Docs) | the nested list is indented under the item before it |

### Scenario (nominal): Word list paragraphs
- GIVEN Word paragraphs with an mso-list style, of level 1 and level 2, and Word conditional comments around the markers
- WHEN the HTML is converted
- THEN the text reads - First and an indented - Second, and the comments and the marker characters are dropped

| Input | Outcome |
| --- | --- |
| mso-list paragraph, marker is a number or a letter | numbered line (every numbered item is written with 1.) |
| mso-list paragraph, any other marker (the marker o is a bullet) | bulleted line |
| level of the paragraph | each level below the first indents by three blanks |

### Scenario (nominal): Code, inline and fenced
- GIVEN a pre with a code element of class language-ts, a code element with a backtick inside, and a monospace block copied from VS Code
- WHEN the HTML is converted
- THEN a ts fence surrounds the code, the inline span uses a longer backtick run, and a VS Code copy is kept as raw text

| Input | Outcome |
| --- | --- |
| pre element, optionally with a code child | a fenced block whose language comes from a class language-, lang-, highlight-source- or highlight-text-, with a fence longer than any backtick run inside |
| code, kbd, samp or tt text | a backtick span, using a longer backtick run than any inside |
| monospace block with preserved white space (a pre white-space and a monospace, consolas, menlo or courier font), copied from an editor, any number of lines | the lines as copied, raw, with their blank lines and any code fence they contain; never wrapped in a fence of its own |

### Scenario (nominal): Block quotes
- GIVEN a blockquote with two paragraphs
- WHEN the HTML is converted
- THEN the text reads > Quoted, a bare >, and > Twice

| Input | Outcome |
| --- | --- |
| blockquote with blocks | its blocks, converted with the same rules, as lines that start with > , a bare > between paragraphs |
| empty blockquote | no line is produced |

### Scenario (boundary): Tables
- GIVEN a table with a header row and a cell a|b, and a table with a cell of colspan 2
- WHEN the HTML is converted
- THEN the first becomes a pipe table and the second keeps only the text of its cells

| Input | Outcome |
| --- | --- |
| table without colspan, rowspan or nested table | a pipe table with a delimiter row, the pipe in a cell escaped, a short row padded with empty cells, and the first row as header even when it uses td cells |
| table with a cell of colspan 2 (or a rowspan, or a nested table) | no table is written; the text of the cells stays, one line per row |

### Scenario (boundary): Text that looks like Markdown is escaped
- GIVEN the text 2 * 3 [x] `y` and a paragraph # not a heading
- WHEN the HTML is converted
- THEN the text reads 2 \* 3 \[x\] \`y\` and the number sign of the second paragraph is escaped

| Input | Outcome |
| --- | --- |
| asterisks, brackets, backticks, angle brackets | escaped with a backslash |
| underscore at a word edge | escaped with a backslash |
| underscore inside a word | left alone |
| line that Markdown would read as a heading, quote or list | its marker is escaped with a backslash |

### Scenario (boundary): Other elements and nothing readable
- GIVEN div, section and span elements around text, a heading among them, and a clipboard of only a style, a comment and a script
- WHEN the HTML is converted
- THEN the text of the plain elements is kept without markup and the heading is converted as usual, and the second clipboard gives an empty result

| Input | Outcome |
| --- | --- |
| element that is not converted | its text only; block elements separate paragraphs and inline elements join their text |
| converted element among them | converted as usual |
| nothing readable left | an empty Markdown text; the result is trimmed and runs of three line breaks are reduced to two |
| empty result reaches the page | the plain text of the clipboard is pasted, as SwRS-MDOKFSTUDIO-PALETTE-213 states |

### Related requirements
- SwRS-MDOKFSTUDIO-PALETTE-213: the page pastes the plain text of the clipboard when the conversion is empty.
- SwRS-MDOKFSTUDIO-PALETTE-229: the safety of pasted HTML (dropped elements, read attributes, unsafe addresses).

### Verification notes
- Method: test/core/paste/htmlToMarkdown.test.ts, data-driven unit test T1 htmlToMarkdown, rows "Google Docs: wrapper bold at normal weight, styled spans, heading, nested lists in the parent list" (headings and emphasis, nested list), "web page: link, inline code, image as link, blockquote, script and onclick dropped" (links and images, inline code, block quote), "ordered list, task item and horizontal rule" (lists), "Word: comments and o:p dropped, list paragraphs through mso-list" (Word lists), "web page: code block with the language from its class" (fenced code), "VS Code copy: several lines stay raw text, never wrapped in a fence", "VS Code copy of a document with code fences and blank lines is returned as copied" and "VS Code copy: one line stays plain text" (VS Code copy), "web page: simple table becomes a GFM table, a pipe in a cell is escaped" and "web page: a table with a colspan is not a table, only its text stays" (tables), "text that looks like Markdown is escaped" (escaping), "nothing readable" (empty result); no row checks the page fallback of an empty result, the empty heading, the empty link, the empty block quote, the rowspan or nested table, or the language classes other than language-.
- Method: test/core/paste/paletteReq.requirements.test.ts, unit test "elements that are not converted contribute their text only; converted ones keep their conversion" (other elements)
- Criteria: A weight of 600 or more, or the words bold and bolder, counts as bold. An unchecked checkbox becomes [ ]. Each level of a Word list indents by three blanks; the marker o is a bullet; every numbered item is written with 1. The language classes recognised are language-, lang-, highlight-source- and highlight-text-. The monospace rule needs a pre white-space and a monospace, consolas, menlo or courier font. The first row of a table is the header even when it uses td cells. Underscores inside words are left alone. The blocks inside a quote are converted with the same rules. Block elements separate paragraphs; inline elements join their text.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-018](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-018.md): A writer pastes screenshots and rich text safely as Markdown
- Depends on:
  - [SwRS-MDOKFSTUDIO-PALETTE-213](SwRS-MDOKFSTUDIO-PALETTE-213.md): Pasted rich text is converted by the host and replaces the selection in one step
<!-- okf:links:end -->
