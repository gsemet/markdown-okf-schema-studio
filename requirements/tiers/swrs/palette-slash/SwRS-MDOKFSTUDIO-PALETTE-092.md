---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-092
uuid: 9c10bd98-5c95-4ecf-9432-6e12ec274d94
title: The link panel writes a safe inline Markdown link
description: When the writer presses Enter in the Text or URL field of the link
  panel or presses Insert, the extension SHALL write [text](url) over the
  selection, or over the link around the caret, as one undoable step with the
  text and the target escaped so that they cannot break the link, and return the
  focus to the text box.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-007
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/linkEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/runtimeEditPalette.test.ts
default_owner_email: gaetan@xeberon.net
---

## The link panel writes a safe inline Markdown link

### Normative behavior

When the writer presses Enter in the Text or URL field of the link panel or presses Insert, the extension SHALL write [text](url) over the selection, or over the link around the caret, as one undoable step with the text and the target escaped so that they cannot break the link, and return the focus to the text box.

### Scenario (nominal): Enter or Insert

- GIVEN the panel with Text docs and URL https://example.org
- WHEN the writer presses Enter in the URL field
- THEN the selection is replaced by [docs](https://example.org) in one undo step and the focus returns to the text box
- AND Enter in the Text field and the Insert button write the same link

### Scenario (boundary): Empty fields

| Input | Outcome |
| --- | --- |
| Text docs and an empty URL | [docs]() is written with the caret between the parentheses |
| Text docs and a URL | The caret is after the closing parenthesis |
| An empty Text and the URL https://example.org | [https://example.org](https://example.org) is written |
| A Text that holds only blanks | The address is used as the label as well |

### Scenario (boundary): Characters that would break the link

| Input | Outcome |
| --- | --- |
| The Text a [b] c | The label is written a \[b\] c; only the characters [ and ] are escaped |
| The caret in a link with the label a \[b\] c, panel opened | Text shows a [b] c without backslashes |
| The URL my file.md | The target is written in angle brackets around my file.md |
| The URL a<b | The less-than character is written %3C and the target stays unwrapped |
| The URL a(b, with unbalanced parentheses | The target is wrapped in angle brackets, written &lt;a(b&gt;; a blank or unbalanced parentheses both trigger the wrapping |
| A URL with balanced parentheses and no blank | The target is left as typed; the URL is trimmed |

### Scenario (nominal): Link around the caret

- GIVEN the caret inside [docs](https://example.org "Site")
- WHEN the panel opens and the URL is changed
- THEN both fields are prefilled, the whole link is replaced, the title "Site" is kept and the caret is after the link; one undo restores it

### Scenario (nominal): Reference-style link

- GIVEN the text see [docs][d] with the line [d]: https://example.org and the caret in the link, in the form [text][ref], [text][] or [ref]
- WHEN the panel opens and Insert is pressed
- THEN the panel shows docs and the address, the link becomes an inline link and the definition line stays

### Scenario (boundary): Not a link

| Input | Outcome |
| --- | --- |
| The caret inside ![alt](pic.png) | The image is not taken for a link and the panel starts as for a plain caret |
| A reference-style link with no definition line in the text | The panel starts as for a plain selection and saving inserts an inline link |

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-089: the link panel that opens and prefills.

### Verification notes

- Method: test/page/modules/editActions.test.ts (the link action applies the argument as the target of the selected text; linkEdit escapes brackets in the text and reads escaped text back; linkEdit never breaks the target: < and > are encoded, spaces get angle brackets; linkDraft takes the existing link around the selection or the caret; replacing an existing link keeps its title; CR035: link replacement keeps the title and the caret inside a link with a title; CR035: linkDraft reads a reference-style link back from its definition; CR035: an unresolvable reference link inserts an inline link instead; CR035: saving the panel replaces a reference link by an inline one, definition kept; all scenarios)
- Method: test/page/runtimeEditPalette.test.ts (T22: Enter in the URL field inserts [text](url) as one undo step and returns to the text box; Enter in the Text field and the Insert button also insert; an empty URL inserts [text]() with the caret inside the parentheses; a selection inside an existing link prefills both fields and replaces that link; scenarios Enter or Insert, empty fields, link around the caret)
- Method: real-window scenario scenarioLinkPanelPrefill in test/integration/realInput/textEditing.ts (scenario link around the caret)
- Note: the unbalanced-parentheses row is deduced from linkEdit in src/page/modules/linkEditActions.ts; no test covers it.
- Criteria: The panel closes before the edit and the text box selection is restored first; the caret equals the start of the link plus the length of the opening bracket part; the label is the trimmed text, or the encoded address when the trimmed text is empty; the link pattern needs a target without blanks or a target in angle brackets, and an optional quoted title, and a match preceded by ! is skipped; labels of reference links are compared after trimming, collapsing blanks and lower-casing, and the first definition of a label wins.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-007](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-007.md): A writer inserts links, images, figures, tables, colours and emoji through pickers
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
<!-- okf:links:end -->
