---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-115
uuid: 2f8a8128-90d4-4189-9e80-fc5b01e89250
title: Alert inserts a GitHub alert and offers its type list
description: When the writer presses Alert, the extension SHALL quote the
  touched lines under the head `> [!NOTE]`, or leave the text alone when the
  caret is already in an alert, and open at the caret a list of Note, Tip,
  Important, Warning and Caution with none lit, from which a chosen type
  replaces the type word of the head of the alert at the caret.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
- StRS-MDOKFSTUDIO-PALETTE-005
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-031
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/blockEditActions.ts
- src/page/modules/editPalette.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/modules/editPalette.test.ts
- test/page/runtimeEditPalette.test.ts
---

## Alert inserts a GitHub alert and offers its type list

### Normative behavior

When the writer presses Alert, the extension SHALL quote the touched lines under the head `> [!NOTE]`, or leave the text alone when the caret is already in an alert, and open at the caret a list of Note, Tip, Important, Warning and Caution with none lit, from which a chosen type replaces the type word of the head of the alert at the caret.

### Scenario (nominal): Alert outside an alert

| Given | Pressing Alert |
| --- | --- |
| An empty line and the caret on it | The text is the head line `> [!NOTE]` and a quoted empty line with the caret on it, and the type list is open with no type lit |
| A selection of two lines and a blank line between them | The head is added, both lines are quoted and the blank line is kept as a bare quote line |
| A quote that is not an alert, or a caret after the alert | A new alert is inserted |

### Scenario (nominal): Choosing a type

- GIVEN the caret in an alert of type NOTE
- WHEN the writer chooses Warning in the list
- THEN the head reads WARNING, the rest of the alert is unchanged, the caret stays in place and the change is one more edit
- AND the list acts on the live selection, not the one at opening time
- Example: the alert action run with the argument CAUTION writes the head with CAUTION

### Scenario (boundary): Alert with the caret already in an alert

| Input | Outcome |
| --- | --- |
| Alert pressed with the caret inside an alert | The type list opens and the text is unchanged (the action without an argument returns no edit) |
| Alert pressed again while the list is open after an insertion | The list closes without another edit |
| Tip chosen with the caret in an alert of type TIP | No edit is made |
| Alert action with the argument INFO, or any value other than the five upper-case names NOTE, TIP, IMPORTANT, WARNING, CAUTION | No edit is produced (the check is case-sensitive) |

### Scenario (nominal): Where the list opens

| Caret | Outcome |
| --- | --- |
| Measurable | The list carries data-edit-popover-at caret and sits under the caret line, in the coordinates of the bar, pulled back to stay inside the frame; the vertical offset is the caret bottom minus the bar top plus 2 px |
| Not measurable | The list sits under the Alert button like the other popovers |

The five options carry the values NOTE, TIP, IMPORTANT, WARNING and CAUTION. The placement rule shared by all palette popovers is in SwRS-MDOKFSTUDIO-PALETTE-031.

### Scenario (nominal): Keys in the open list

| Input | Outcome |
| --- | --- |
| ArrowDown twice, then Enter, none lit at first | The second type, Tip, is lit and picked, and the head reads TIP; ArrowDown and ArrowUp light a type and wrap |
| Enter with none lit | Nothing is picked and the key keeps its usual effect |
| ArrowDown or ArrowUp with Alt, Cmd or Ctrl; Shift+Enter | Not taken by the list |
| Escape | The list closes, the head still reads NOTE, the focus is in the text box and the editor is open; the first Escape is consumed by the palette |
| A second Escape | The editor is cancelled |
| ArrowLeft | The list closes and the caret moves |
| Typing a character | The list closes and the character is typed |
| ArrowRight, Home, End, PageUp or PageDown | The list closes and the key takes its normal effect |

A list opened by the insertion itself is not closed by the input event of that insertion.

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-031: palette popovers open in the frame, one at a time, and Escape or typing closes them.

### Verification notes

- Method: test/page/modules/editActions.test.ts, through test/page/modules/editActions.test.ts (unit tests "alert on an empty line writes the NOTE head and a quoted line with the caret in it", "alert quotes the touched lines under the head and keeps blank lines quoted", "a quote that is not an alert, or a caret after the alert, inserts a new alert", "with the caret in an alert the action changes its type and keeps the caret in place", "alert takes the type from the argument and refuses an unknown one": scenarios "Alert outside an alert", "Choosing a type", "Alert with the caret already in an alert")
- Method: test/page/modules/editPalette.test.ts (unit tests "Alert writes the alert first, then lists the five types, none lit", "choosing a type changes the head of the alert the caret is in, in one more edit", "the dropdown acts on the live selection, not the one at opening time", "Alert on an existing alert only opens the list", "a second click on Alert closes the list without another edit", "the list opens at the caret, in the bar's coordinates", "without a caret position the list opens under its button like the others", "arrows light a type, Enter picks it; moving the caret or typing ends the list", "Escape dismisses the dropdown, keeps NOTE and puts the focus in the text box": scenarios "Where the list opens", "Keys in the open list")
- Method: test/page/runtimeEditPalette.test.ts (unit tests "Alert writes the head, opens the type list near the caret and picking changes the type", "dismissing the type list leaves NOTE, the focus in the text box and the editor open": scenarios "Alert outside an alert", "Choosing a type" and the Escape rows)
- Method: test/integration/realInput.test.ts (real-window scenario scenarioAlertDropdown: Alert outside an alert, choosing a type)
- Method: visual scenario palette-slash/v01-palette-popups-light-900 (choosing Warning rewrites the alert head)
- Criteria: The button runs the action without an argument and then opens the popover; the five options carry the values NOTE, TIP, IMPORTANT, WARNING and CAUTION; the alert head is the first line of the run of quoted lines around the caret and must match `> [!TYPE]` with one of the five types; with the caret in an alert and no argument the action returns no edit; the vertical offset of the list is the caret bottom minus the bar top plus 2 px; arrow keys with Alt, Cmd or Ctrl and Shift+Enter are not taken.
