# Slash Menu

In a block text box (a paragraph editor, an insertion point, Start writing, a table cell), type `/`
at the start of a line or after a space to open a command menu at the caret. It lists the same
commands as the edition palette for the palette mode you chose (Strict, GFM or MyST), grouped by
category, each with its icon and shortcut. Keep typing to filter: `/h2`, `/table`, `/note`,
`/todo`, `/code`, `/image`, `/link`, `/math`, `/bullet`, `/numbered`, `/toc`. Names and short aliases
match, best match first; in MyST mode the MyST command wins over its GitHub twin (`/note` finds the
admonition). Bulleted and Numbered list exist only in this menu (the palette has no list button).
If the only matches are loose ones (letters inside a word), Enter and Tab stay plain keys unless you
moved the highlight, so a literal ` /ock` followed by Enter is never swallowed.

- **Up / Down** move through the list, **Enter** or **Tab** apply, a click applies too.
- **Escape** closes the menu and keeps what you typed; so does **Backspace** past the `/`.
- `//`, `/` followed by a space, a `/` inside a word or URL (`a/b`, `http://`), inside inline code
  or inside a fenced code block never open it.
- Choosing a command removes the `/query` and runs the command like its palette button: the same
  Markdown, the same caret, and for pickers (table size, link, image, colour, references) the same
  picker. Plain commands are one undo step that brings the `/query` back.
- The menu stays inside the window (it opens above the caret near the bottom), shows "No command"
  when nothing matches, and closes when you leave the text box or scroll the caret out of view.

[![The slash menu filtered by /tab in a GFM paragraph editor](../../images/readme/slash-menu.png)](../../images/readme/slash-menu.png)
