---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-040
uuid: f61fe369-bc81-4504-b837-edd395df49c0
title: "The column lists the h1 to h4 headings with folding"
description: "When the column is built, the extension SHALL list the headings h1 to
  h4 of the content container that have text, in document order, indented by their
  level below the shallowest listed heading, with the heading text only, a Table of
  contents landmark and a twisty on each entry that has deeper entries."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-006
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/tocColumn.ts
tested_in_files:
- test/page/modules/tocColumn.test.ts
- test/page/runtimePageControls.test.ts
- test/visual/capture_layout_checks.py
default_owner_email: gaetan@xeberon.net
---

## The column lists the h1 to h4 headings with folding

### Normative behavior

When the column is built, the extension SHALL list the headings h1 to h4 of the content container that have text, in document order, indented by their level below the shallowest listed heading, with the heading text only, a Table of contents landmark and a twisty on each entry that has deeper entries.

### Scenario (nominal): Four levels
- GIVEN headings h1 to h5 in the content
- WHEN the column is built
- THEN entries for levels 1 to 4 appear with their level, in order, and the h5 is not listed

### Scenario (boundary): Indent, text and excluded headings
| Input | Outcome |
| --- | --- |
| A document whose top heading is an h2 | That h2 is at indent 0 and a following h3 one step deeper (--sphinx-preview-toc-depth = level - shallowest listed level) |
| A heading whose text is empty | It is not listed |
| A heading in a normal section | It is listed |
| Headings inside a properties table, an admonition, an open block editor or the sticky band | None of them is listed |
| A heading with a permalink glyph and a comment chip | The entry holds the heading words only, without the glyph, the chip or its hidden body |
| A heading with a TODO word chip | The TODO word stays in the entry |

### Scenario (refusal): No headings
| Input | Outcome |
| --- | --- |
| A document without headings and the column open | The column shows the text No headings and no entry |
| A document whose only headings are inside admonitions | The column shows No headings |

### Scenario (nominal): Landmark
- GIVEN a page with the column closed
- WHEN the nav element is read
- THEN it exists as nav[data-sphinx-preview-toc] with aria-label Table of contents, hidden by the stylesheet; once the column is opened it is the same element and is displayed

### Scenario (nominal): Fold
- GIVEN a parent entry with two children
- WHEN its twisty is pressed
- THEN the children are hidden, aria-expanded is false, the accessible name becomes Unfold followed by the heading, and sibling entries stay shown; pressed again, they show and the name is Fold again

### Scenario (boundary): Twisty by entry
| Input | Outcome |
| --- | --- |
| An entry with deeper entries below it | It has a twisty button that hides or shows exactly its own subtree, down to the next entry of the same or a shallower level, and sets aria-expanded; its accessible name is Fold followed by the heading while the subtree is shown and Unfold followed by the heading while it is folded |
| An entry with no deeper entry below it | It has no twisty |

### Scenario (nominal): Folded sections are remembered
- GIVEN a folded entry and a content update
- WHEN the column is rebuilt
- THEN the entry is still folded; the folded entries are kept in the webview state (tocCollapsed), keyed by level, text and occurrence, and applied after every rebuild and reload

### Scenario (boundary): Same text twice
- GIVEN two headings with the same level and text
- WHEN the first is folded
- THEN only the first is folded, because the key holds the occurrence number

### Verification notes
- Method: test/page/modules/tocColumn.test.ts (Four levels and Indent, text and excluded headings: the entries list h1 to h4 with their level and without the permalink glyph, headings in properties, admonitions, block editors and the sticky band are left out, a comment chip and its hidden body stay out of the entry label and a TODO word chip stays in; No headings: an empty document shows No headings; Landmark: the TOC is off by default and the page is marked closed, asserting the aria-label; Fold and Twisty by entry: only parent entries get a twisty with aria-expanded, collapsing a parent hides its descendants, collapsing a middle parent hides only its own subtree; the twisty name switches between Fold and Unfold; Folded sections are remembered and Same text twice: a rebuild keeps it collapsed and a repeated heading text is told apart by its occurrence). The shallowest-level indent, the empty-text skip and the case of only excluded headings are untested.
- Method: test/page/runtimePageControls.test.ts (Folded sections are remembered: T13, a state snapshot keeps the TOC visibility and the folded sections).
- Method: test/visual/capture_layout_checks.py (check_toc_column: levels 1 to 4 and no h5; a twisty hides and shows sub-entries).
- Criteria: levels listed are 1..4; entries equal the headings that match no excluded selector; the empty paragraph carries the text No headings; nav[data-sphinx-preview-toc] has aria-label Table of contents; hidden entries are those below a folded parent; tocCollapsed in the webview state lists the keys.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-006](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-006.md): The reader uses a table of contents beside the document
<!-- okf:links:end -->
