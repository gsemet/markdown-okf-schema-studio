# Find and Replace in the Preview

`Cmd+F` (macOS) or `Ctrl+F` with the focus in the preview opens a find bar under the toolbar
(a key binding of the extension, also listed in the command palette as **Find in Preview**). It
searches the text you read: paragraphs, headings, tables, admonitions, list items, link labels and
code blocks, including sections you folded. It never searches the hidden Markdown source.

## Find

- **Open and close:** `Cmd/Ctrl+F` opens the bar with the field focused; a selection of one line
  becomes the query. `Escape` closes it and gives the focus back to where it was.
- **Matches:** every match is highlighted, the current one more strongly, and the bar shows
  `3 of 12`. `Enter` and `Shift+Enter`, `F3` and `Shift+F3`, or the arrow buttons move to the next and
  previous match and wrap around at the ends. A match inside a folded section unfolds the section.
- **Options:** `Match case` (`Alt+C`), `Match whole word` (`Alt+W`) and `Use regular expression`
  (`Alt+R`). An invalid regular expression shows the reason in place of the count.
- **Tab order:** the toolbar, then the bar, then the page content. The bar follows the preview
  theme (Dark, White, Cream) and VS Code's high-contrast themes.
- **Text editor:** `Cmd/Ctrl+F` in the text editor is VS Code's own find. The bar only takes the
  key while the focus is in the preview page, and it leaves the key to the text box of an open
  block editor.

## Replace

The arrow at the left of the bar opens the replace field.

- **Replace:** `Enter` in the replace field, or the Replace button, replaces the current match and
  moves to the next one. **Replace all** (`Cmd/Ctrl+Alt+Enter` in either field) replaces every match
  in one undo step.
- **Regular expressions:** with the option on, the replacement reads `$1` to `$99`, `$&` (the
  match), `$<name>` and `$$`.
- **Lossless:** only the matched span of the Markdown source changes. The rest of the file is left
  as it is, and the edit goes through the text editor, so `Undo` restores it.
- **Matches that cannot be replaced:** a match whose rendered text does not map one-to-one to the
  source, such as text inside a formula, a link label that repeats its target, generated text like
  an admonition title, the front matter or an included file, is skipped. The bar tells you how many:
  `3 matches cannot be replaced from the preview`. Edit those in the text editor.
- **Read-only previews:** in Restricted Mode, or while a block editor is open, the replace field is
  disabled and the reason is shown. Finding still works.
