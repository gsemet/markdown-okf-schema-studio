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
**Markdown OKF-Schema Studio: Open Preview to Side** from the Command Palette.

| Editor title action | Source and preview |
| --- | --- |
| [![Open Preview to Side action in the VS Code editor title](../../images/readme/open-preview-to-side.png)](../../images/readme/open-preview-to-side.png) | [![Markdown source beside the Studio preview](../../images/readme/preview-beside-editor.png)](../../images/readme/preview-beside-editor.png) |

Every image in this guide opens at full size when selected.

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
