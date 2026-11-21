# Install and Open Studio

Install **Markdown OKF-Schema Studio** in VS Code from the
[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio).
VSCodium, Cursor and other compatible editors install it from [Open VSX](https://open-vsx.org/extension/GaetanSemet/markdown-okf-schema-studio).
In any of them you can also open the Extensions view, search for `Markdown OKF-Schema Studio`, and
select **Install**.

Studio needs VS Code 1.95 or later, or an editor built on it. It is expected to work in VSCodium,
Cursor and Windsurf, installed from Open VSX: their current builds are based on newer VS Code
versions.

## Open Studio

Use **Open With...** on a Markdown tab and select **Markdown OKF-Schema Studio**.

[![Studio opened as the custom editor for a Markdown file](../../images/readme/open-with-editor.png)](../../images/readme/open-with-editor.png)

For a side-by-side source and preview, select the book icon in the editor title bar or run
**Markdown OKF-Schema Studio: Open Preview to Side** from the Command Palette. The button and the command
also work from a text diff (a Git diff, a file compare, the search and replace preview): the preview shows
the real file of the diff, whichever side holds the cursor, and opens no extra editor. With a diff that has
no file on either side (a staged change) it shows the working-tree file, without scroll sync. The button, the
command and the following do not apply to the multi-file diff editor or the merge editor: open the file in a
normal text editor or in the single-file diff instead.

| Editor title action | Source and preview |
| --- | --- |
| [![Open Preview to Side action in the VS Code editor title](../../images/readme/open-preview-to-side.png)](../../images/readme/open-preview-to-side.png) | [![Markdown source beside the Studio preview](../../images/readme/preview-beside-editor.png)](../../images/readme/preview-beside-editor.png) |

Every image in this guide opens at full size when selected.

## Open at a line

A search result, a **Go to Line** in Quick Open (`file.md:40`) or a link that opens a Markdown file
at a line opens Studio at that line, and an arrow in the margin marks it. The arrow disappears on
your next click in the page, when you start an edit, or when another line is asked; scrolling keeps
it. In a table the arrow marks the row of the line, in a tab that is not shown Studio shows the tab
first, and in the front matter it marks the property row (a collapsed properties table opens first).
A file that is already shown in Studio is revealed at the line, in the group where it is, instead of
opening a second tab.

### With the side preview open

When the side preview is open next to a text editor, a jump keeps the text editor (see below), takes
it to the line, and the side preview shows the same arrow on that line. It switches to the file first
when the jump goes to another Markdown file. The arrow stays while you scroll or move the cursor, and
goes when you type in that file or when the preview switches to another file. Moving the cursor with
the arrow keys or a click never draws it.

With **Scroll preview with editor** on, the editor leads: the preview scrolls only when the line is
not already on screen. With it off, the preview scrolls the line to the reading line. A link or
Back and Next followed in the side preview mark their target line the same way. A Studio tab beside
the text editor marks nothing on a jump.

Which moves count as a jump depends on the kind VS Code gives them. The real-window trial J1
recorded these kinds in VS Code on Linux:

| Move | Recorded by J1 | Marks the side preview |
| --- | --- | --- |
| Search click (`vscode.open` with a selection) | a command move with one selection | yes |
| `cursorDown`, `cursorBottom`, Select All (`selectAll`) | no selection change | no |
| A selection set through the API (as VSCodeVim does) | no selection change | no |
| Go Back | no selection change | no |
| Quick Open `file.md:40`, Go to Line, Problems, a link | not driven (reached by the same open with a selection) | yes, as the search click |
| Go to Symbol, Find next (F3), Go to next problem (F8) | not driven | yes if VS Code reports them as a command, not verified |
| A click, Page Down, typing, undo, Ctrl+D, Format Document | not driven | no, by design (not a command move) |

Only the first four rows were recorded; the others follow from the design.

Two settings under **Opening Files** (see [Settings](settings.md)) decide what opens in Studio:

- `open.searchResultsInStudio` (default on): a search result or a jump to a line opens Studio.
- `open.markdownFilesInStudio` (default off): every Markdown file you open opens in Studio, from
  the Explorer, Quick Open or a link. It replaces the `workbench.editorAssociations` entry for
  `*.md` that older versions asked for: the first time, Studio moves that entry to this setting.

To read the raw text on purpose, run **Markdown OKF-Schema Studio: Open as Text** (or **Reopen
Editor With... > Text Editor**). That text editor stays text. A diff stays a text diff, and its side preview shows the real file.

Studio shows the text editor for a moment before it replaces it, so a first opening can flash the
raw text. See [Known Limitations](../known-limitations.md#opening-files) for what is not covered.

## In the Agents window

The Agents window is a VS Code feature. Other editors, such as VSCodium, Cursor and Windsurf, have
no Agents window, and Studio works there in the normal editor.

Studio also runs in the VS Code Agents window, the companion window for agent sessions. Open a
Markdown file there, then use **Open With...** and select **Markdown OKF-Schema Studio**.

- Files of the active agent session are editable: the Agents window adds the session's working
  folder to the workspace.
- Other files are editable too. Their reads are limited to the file's own folder: includes and
  images come from there, and schema files are not looked up.
- Switching to another agent session keeps the Studio tab open. It keeps editing, with reads
  limited to the file's folder, until a session that holds the file is active again, then reads
  the whole working folder on the same tab.

A VS Code build that ignores the extension's declaration of Agents window support leaves Studio
disabled there. Enable it with this user setting, or under **Agent Customizations** >
**Extensions**:

```json
"extensions.supportAgentsWindow": { "GaetanSemet.markdown-okf-schema-studio": true }
```
