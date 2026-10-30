---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-089
uuid: c49be38c-0e03-406c-bec1-95f62892e9b9
title: The Link button opens a labelled link panel prefilled from the selection
description: When the writer presses the Link button or Cmd+K or Ctrl+K, the
  extension SHALL open the link panel under the palette, a dialog named Insert
  link with the fields Text and URL and the buttons Insert and Cancel, prefilled
  from the selection, and make no edit until the panel is submitted.
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
- src/page/features/blockEditor.ts
- src/page/features/editorChrome.ts
- src/page/modules/linkEditActions.ts
- src/page/modules/linkPanel.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/runtimeEditPalette.test.ts
- test/page/runtimePaletteActions.test.ts
default_owner_email: gaetan@xeberon.net
---

## The Link button opens a labelled link panel prefilled from the selection

### Normative behavior

When the writer presses the Link button or Cmd+K or Ctrl+K, the extension SHALL open the link panel under the palette, a dialog named Insert link with the fields Text and URL and the buttons Insert and Cancel, prefilled from the selection, and make no edit until the panel is submitted.

### Scenario (nominal): Button

- GIVEN a block editor with a selected word
- WHEN the writer presses Link
- THEN the panel Insert link opens under the palette and the text is unchanged

### Scenario (nominal): Structure

- GIVEN an open link panel
- WHEN the panel is inspected
- THEN it has role dialog and the name Insert link, two text fields with the accessible names Text and URL and the buttons Insert and Cancel in this tab order
- AND, when the panel was opened from a table cell editor, it sits inside the table bar under the buttons

### Scenario (nominal): Prefill and focus

| Input | Outcome |
| --- | --- |
| Selected text https://example.org | Text is empty, URL holds the address and the focus is in Text |
| Selected text some words | Text holds the words, URL is empty and the focus is in URL |
| A selected address that starts with http://, https://, mailto: or www. | The address goes to the URL field, any other selection to the Text field |
| Both fields filled | The focus is in Text |
| No selection | Both fields are empty and Text has the focus |

### Scenario (nominal): Keyboard inside the panel

| Input | Outcome |
| --- | --- |
| Tab with the focus on Cancel | The focus moves to Text |
| Shift+Tab with the focus on Text | The focus moves to Cancel |
| Tab or Shift+Tab between the first and the last stop | The browser's own order is used |
| Ctrl+K or Cmd+K with the focus in Text | The panel consumes the key, the focus moves to URL and VS Code does not receive the key |
| Ctrl+Shift+K with the focus in Text | The key is not consumed by the panel |

### Scenario (refusal): IME composition

- GIVEN the panel open and an IME composition in progress
- WHEN Enter confirms the composition
- THEN the panel stays open and nothing is inserted
- AND once the composition has ended, Enter inserts the link

### Scenario (refusal): Text changed since the opening

- GIVEN the panel open and the text box value changed by a script, without an input event
- WHEN Insert is pressed
- THEN the panel closes and the text is unchanged
- AND with the same text as at the opening, Insert writes the link

### Scenario (boundary): One panel, removed with the editor

| Input | Outcome |
| --- | --- |
| The panel is open and the writer presses Link again | The first empty field of the open panel takes the focus and no second panel opens |
| The panel is open and the editor is closed | The panel is removed |
| The panel was closed by Cancel and the editor is closed | Nothing is left of the panel |

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-092: the link that the panel writes on submit.

### Verification notes

- Method: test/page/modules/editActions.test.ts (link is a strict action for blocks and cells that opens the link panel; linkDraft prefills the text from the selection and the URL when the selection is one; scenarios button, prefill and focus)
- Method: test/page/runtimeEditPalette.test.ts (T22: the Link button opens the same panel and keeps the focus rule; Ctrl+K opens the link panel under the palette with the selection as the text; the panel has labelled fields, Insert and Cancel in the tab order; a selected URL fills the URL field and focus goes to the empty text; with no selection both fields are empty and the text takes the focus; an IME composition Enter does not insert; Tab cycles Text, URL, Insert, Cancel and back, and Shift+Tab goes the other way; Cmd/Ctrl+K inside a panel field is consumed and moves to the URL field; the panel is removed with the editor; Insert on a text that changed without an input event aborts without editing; all scenarios except the table cell case of structure)
- Method: test/page/runtimePaletteActions.test.ts (T35: the link panel opened from the cell keeps the editor open and clicking outside commits; scenario structure, table cell case)
- Method: real-window scenario scenarioLinkPanel in test/integration/realInput/textEditing.ts (scenarios structure, prefill and focus)
- Criteria: The action has the panel link, and the editor holds at most one panel; the tab stops are Text, URL, Insert, Cancel in this order; the focused field has its content selected; the keydown handler returns early when isComposing is true; the handler for Cmd/Ctrl+K checks the letter k, a command key and neither Alt nor Shift; the panel element is detached and its listeners ignore later events; the offsets recorded at opening are never applied to a different text.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-007](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-007.md): A writer inserts links, images, figures, tables, colours and emoji through pickers
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
<!-- okf:links:end -->
