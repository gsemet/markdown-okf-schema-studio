---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-058
uuid: e2e6e285-d184-4715-8560-44e0f043826e
title: The Colour picker wraps the selection in a safe colour span
description: 'When the writer presses Colour, the extension SHALL open a picker with
  the tabs Text and Background, sixteen colour swatches, a field for a colour code
  and a Remove button, apply a swatch, a valid colour code or Remove to the property
  of the open tab as a span whose only attribute is a colour style, and produce no
  edit for a value the sanitizer would strip.'
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-007
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-031
- SwRS-MDOKFSTUDIO-PALETTE-036
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/colourEditActions.ts
- src/page/modules/editPalettePopovers.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/modules/editPalette.test.ts
- test/page/runtimePaletteActions.test.ts
---

## The Colour picker wraps the selection in a safe colour span

### Normative behavior

When the writer presses Colour, the extension SHALL open a picker with the tabs Text and Background, sixteen colour swatches, a field for a colour code and a Remove button, apply a swatch, a valid colour code or Remove to the property of the open tab as a span whose only attribute is a colour style, and produce no edit for a value the sanitizer would strip.

### Scenario (nominal): Picker contents

- GIVEN an open block editor
- WHEN the writer presses Colour
- THEN the picker shows the tabs Text (selected) and Background, sixteen swatches each titled with its colour, the field named Colour code with the placeholder `#rrggbb` and the Remove button

- GIVEN an open table cell editor
- WHEN the writer presses Colour in the cell formatting group
- THEN the same picker opens

The action is a strict-mode action for blocks and cells with a swatch popover; the sixteen swatches are distinct and each is a colour the sanitizer keeps.

### Scenario (nominal): A swatch or a valid code applies the colour of the open tab

- GIVEN a selected word and the Text tab open
- WHEN the writer presses a swatch
- THEN the word is wrapped in a span with that text colour and the picker closes

- GIVEN the Background tab open
- WHEN the writer presses a swatch
- THEN the span gets a background colour instead

- GIVEN the field holds #c00 and a word is selected
- WHEN the writer presses Enter
- THEN the colour is applied like a swatch and the picker closes

The action receives the argument text:{colour} or background:{colour} and the picker is removed before the edit. The edit is one undo step and keeps the editor open.

### Scenario (refusal): Invalid colour code in the field

- GIVEN the field holds red
- WHEN the writer presses Enter
- THEN the field is marked aria-invalid, nothing is written and the picker stays open

The field is validated as the writer types too: a non-empty invalid value sets aria-invalid, an empty or valid value removes it; the valid values are the colour grammar of the sanitizer (see SwRS-MDOKFSTUDIO-GFM-034).

### Scenario (nominal): The span written and updated

In this table `[ ]` marks the selection and `|` marks the caret.

- GIVEN the selection foo and the argument text:#c00
- WHEN the action runs
- THEN the text is a span with style color:#c00 around foo, with foo selected

- GIVEN a table cell editor
- WHEN the action runs
- THEN the span is written without escaping any pipe, because it contains none

| Input | Argument | Outcome |
| --- | --- | --- |
| `say [foo] now` | `text:#c00` | say &lt;span style="color:#c00"&gt;[foo]&lt;/span&gt; now |
| `say [foo] now` | `background:#ff0` | say &lt;span style="background-color:#ff0"&gt;[foo]&lt;/span&gt; now |
| `say \| now` | `text:#c00` | say &lt;span style="color:#c00"&gt;\|&lt;/span&gt; now |
| `a[ foo ]b` (edge blanks ignored) | `text:#c00` | a &lt;span style="color:#c00"&gt;[foo]&lt;/span&gt; b |
| x &lt;span style="color:#c00"&gt;[foo]&lt;/span&gt; y (span around the selection) | `text:#00f` | the colour of the same span is replaced, no new span |
| x &lt;span style="color:#c00"&gt;f\|oo&lt;/span&gt; y (caret in the span) | `text:#00f` | the colour is replaced and the caret stays where it was |
| x &lt;span style="color:#c00"&gt;[foo]&lt;/span&gt; y | `background:#ff0` | `style="color:#c00; background-color:#ff0"`, the same span carries both colours |
| a span with both colours | `background:rgb(1, 2, 3)` | the background colour is replaced, the text colour is kept |
| `[foo]` in a table cell | `text:#c00` | &lt;span style="color:#c00"&gt;[foo]&lt;/span&gt; |
| a span with a colour, caret in it, in a table cell | `background:#ff0` | `style="color:#c00; background-color:#ff0"` |

The written opening tag is a span element with a single style attribute whose value is color:#c00; with two declarations they are separated by a semicolon and a space, color first. A span is recognised only when its tag has a style attribute with colour declarations the sanitizer keeps, and no other attribute.

### Scenario (boundary): Partial selection and whole content

- GIVEN a span around one two three and two selected
- WHEN a colour is applied
- THEN a new span surrounds two inside the outer span

- GIVEN the whole content of the span selected
- WHEN a colour is applied
- THEN the outer span is updated instead

| Input | Argument | Outcome |
| --- | --- | --- |
| x &lt;span style="color:#c00"&gt;a[b]c&lt;/span&gt; | `text:#00f` | x &lt;span style="color:#c00"&gt;a&lt;span style="color:#00f"&gt;[b]&lt;/span&gt;c&lt;/span&gt;, the outer span is unchanged |
| a[b&lt;span style="color:#c00"&gt;cd&lt;/span&gt;e]f (balanced span inside the selection) | `text:#00f` | the selection is wrapped in a new span around the balanced span |

### Scenario (nominal): Remove drops the property of the open tab

- GIVEN a word in a span with both colours and the Text tab open
- WHEN the writer presses Remove
- THEN the span keeps only the background colour

- GIVEN a span with only a text colour and the caret inside
- WHEN the text colour is removed
- THEN the tags are gone, the content stays and the caret stays on its character

- GIVEN the content selected
- WHEN the colour is removed
- THEN the content stays selected

- GIVEN a word outside any generated span
- WHEN the writer presses Remove
- THEN the text is unchanged

The action receives text: or background: with an empty colour; when no property is left the span is unwrapped (the edit replaces the whole span with its inner text); a property the span does not carry, or no generated span, gives no edit.

### Scenario (refusal): What the sanitizer would strip

- GIVEN the argument text:red
- WHEN the colour action runs
- THEN no edit is produced

- GIVEN a selection that starts inside a span and ends outside it
- WHEN the colour action runs
- THEN no edit is produced, in both directions

| Input | Outcome |
| --- | --- |
| argument `text:red`, `text:#12`, `text:#ggg`, `text:url(x)`, `text:#c00;position:fixed`, text:#c00"&gt;&lt;script&gt;, `text:rgb(1,2,3`, `text:var(--x)`, `text:#c00 !important`, `sky:#c00`, `#c00`, empty, or no argument | no edit (the colour is invalid or holds a control character) |
| ab&lt;span style="color:#c00"&gt;c[d&lt;/span&gt;e]f | no edit (selection straddles a span boundary) |
| a[b&lt;span style="color:#c00"&gt;c]d&lt;/span&gt;ef | no edit (selection straddles a span boundary, the other direction) |
| ab&lt;span style="co[lor:#c00"&gt;cd&lt;/span&gt;e]f | no edit (a boundary lies inside the text of a tag) |
| a&lt;b onclick="x\|y"&gt;c&lt;/b&gt; | no edit (a boundary lies inside the text of a tag) |
| a slice with an unmatched span tag | no edit |
| the registry built without a colour validator | no edit |

The action returns undefined. Everything the action writes passes the sanitizer grammar (see SwRS-MDOKFSTUDIO-GFM-034).

### Related requirements

- SwRS-MDOKFSTUDIO-GFM-034: the colour grammar of the sanitizer that the picker and the action follow.
- SwRS-MDOKFSTUDIO-PALETTE-031: the picker is a palette popover that opens inside the frame, one at a time.
- SwRS-MDOKFSTUDIO-PALETTE-036: leaving the frame from a palette control saves once.

### Verification notes

- Method: test/page/modules/editPalette.test.ts (T34: the Colour button opens a picker with two tabs, 16 swatches, a hex field and Remove; a swatch applies the colour of the open tab and closes the picker; the hex field validates live, refuses invalid values on Enter and applies a valid one; Remove unwraps the span of the open tab)
- Method: test/page/runtimePaletteActions.test.ts (T34: the picker edits the text box as one undo step and keeps the editor open)
- Method: test/page/modules/editActions.test.ts (T34: color is a strict-mode action for blocks and cells with a swatch popover; color wraps the selection in the exact span the renderer keeps; color updates the span the selection or caret is in, and adds the second property; a partial selection inside a coloured span nests a new span instead; color refuses a selection that straddles a span boundary, in both directions; color refuses a boundary inside a tag's own text; color Remove drops one property and unwraps the span when none is left; color refuses an invalid value and never writes markup the sanitizer would strip; without a colour validator the colour actions refuse; color works in a table cell without escaping the pipes)
- Method: test/page/modules/editActions.test.ts (marker holder of editActions.test.ts for this requirement)
- Method: visual scenarios palette-slash/v01-palette-popups-light-900 (picker contents; a swatch colours the selection)
- Criteria: The popover holds a tablist with two tabs, sixteen buttons with data-color-swatch, an input with the aria-label Colour code and a button with data-color-remove; the action receives text:{colour} or background:{colour}; the outer span of a partial selection is unchanged and the new span lies between its tags; the unmatched-span-tag slice is refused as well.
