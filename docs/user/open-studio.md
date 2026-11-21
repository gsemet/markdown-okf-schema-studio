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
no file on either side (a staged change) it shows the working-tree file, without scroll sync.

| Editor title action | Source and preview |
| --- | --- |
| [![Open Preview to Side action in the VS Code editor title](../../images/readme/open-preview-to-side.png)](../../images/readme/open-preview-to-side.png) | [![Markdown source beside the Studio preview](../../images/readme/preview-beside-editor.png)](../../images/readme/preview-beside-editor.png) |

Every image in this guide opens at full size when selected.

## Open at a line

A search result, a **Go to Line** in Quick Open (`file.md:40`) or a link that opens a Markdown file
at a line opens Studio at that line, and an arrow in the margin marks it. The arrow disappears on
your next click, keystroke or scroll. A file that is already shown in Studio is revealed at the
line, in the group where it is, instead of opening a second tab.

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
