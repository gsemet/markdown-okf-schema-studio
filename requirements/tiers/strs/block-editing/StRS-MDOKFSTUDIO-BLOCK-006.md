---
type: StRS
id: StRS-MDOKFSTUDIO-BLOCK-006
uuid: d99196e1-1961-40f8-8615-1af198db156d
title: Typed text is saved, survives updates and is never lost on leaving
description: While a writer types in a block editor, the Studio SHALL write the
  text into the document shortly after the last keystroke, keep the editor, its
  text and its caret whatever else changes in the preview, apply Done, Ctrl or
  Cmd+Enter or leaving the text box as keeping the text and Cancel or Escape as
  restoring the block, and save and close every open editor before the preview
  switches to another document.
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I type in the preview and my Markdown file follows, so a
  closed window or a crash loses almost nothing; I keep typing while a render, a
  theme change, a change elsewhere in the file or a reload happens; I follow a
  link to another file, go Back or let the preview follow another tab with my
  last words saved first; I end an edit with Done or by clicking away to keep
  it, and with Cancel or Escape to throw it away, and I keep my place on the
  screen when I open an editor, save it and close it.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-033
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-042
- SwRS-MDOKFSTUDIO-BLOCK-047
- SwRS-MDOKFSTUDIO-BLOCK-053
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-BLOCK-148
- SwRS-MDOKFSTUDIO-BLOCK-169
- SwRS-MDOKFSTUDIO-BLOCK-191
- SwRS-MDOKFSTUDIO-BLOCK-193
- SwRS-MDOKFSTUDIO-BLOCK-205
- SwRS-MDOKFSTUDIO-BLOCK-216
- SwRS-MDOKFSTUDIO-BLOCK-228
- SwRS-MDOKFSTUDIO-BLOCK-244
- SwRS-MDOKFSTUDIO-BLOCK-245
- SwRS-MDOKFSTUDIO-BLOCK-256
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-064
- SwRS-MDOKFSTUDIO-TRUST-065
default_owner_email: gaetan@xeberon.net
---

## Typed text is saved, survives updates and is never lost on leaving

### Normative behavior

While a writer types in a block editor, the Studio SHALL write the text into the document shortly after the last keystroke, keep the editor, its text and its caret whatever else changes in the preview, apply Done, Ctrl or Cmd+Enter or leaving the text box as keeping the text and Cancel or Escape as restoring the block, and save and close every open editor before the preview switches to another document.

### Preserved stakeholder intent

Writers expect typing in the preview to be as safe as typing in the text editor.

Writers expect one clear way to keep an edit and one to drop it, with no stray changes left in the file.

Writers expect the preview to stay still while they type, and to be told when a change elsewhere in the file overlaps their block.

Writers expect navigation never to throw away their last words, and expect the page not to jump while they edit.

As a writer, I type in the preview and my Markdown file follows, so a closed window or a crash loses almost nothing; I keep typing while a render, a theme change, a change elsewhere in the file or a reload happens; I follow a link to another file, go Back or let the preview follow another tab with my last words saved first; I end an edit with Done or by clicking away to keep it, and with Cancel or Escape to throw it away, and I keep my place on the screen when I open an editor, save it and close it.

### Rationale and constraints

- The text is saved after a short pause in typing, and only what changed is written.
- The preview does not render again while the editor is open.
- Moving the focus into the palette, the link panel, the figure form or a native dialog is not leaving the editor.
- An editor whose text is unchanged closes without a message.
- Changes to the preview wait until the editor closes, then the newest one is shown; the Refresh command forces one refresh over an open editor.
- A change elsewhere in the file before the block moves the edit with it; a change inside the block ends the edit with an error and keeps the text.
- The page also sends a pending autosave at once when the window is hidden or closed.
- A save refused during the switch shows a warning that names the block and says the text was not saved; the open editors are saved before the page hides or leaves the document (see SwRS-MDOKFSTUDIO-BLOCK-205).
- Opening the editor with its edition palette does not move the text I clicked, and closing it does not move the page.
- After a save the edited block is shown at the same place on the screen.
