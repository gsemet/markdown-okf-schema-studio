# Install and Open Studio

Install **Markdown OKF-Schema Studio** from the
[VS Code
Marketplace](https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio),
or open the Extensions view in VS Code, search for `Markdown OKF-Schema Studio`, and select
**Install**.

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

Studio also runs in the VS Code Agents window, the companion window for agent sessions. Open a
Markdown file there, then use **Open With...** and select **Markdown OKF-Schema Studio**.

- Files of the active agent session are editable: the Agents window adds the session's working
  folder to the workspace.
- Other files open read-only, with the Edit button greyed and its reason in the tooltip.
- Switching to another agent session keeps the Studio tab open. It turns read-only until a session
  that holds the file is active again, then becomes editable on the same tab.

A VS Code build that ignores the extension's declaration of Agents window support leaves Studio
disabled there. Enable it with this user setting, or under **Agent Customizations** >
**Extensions**:

```json
"extensions.supportAgentsWindow": { "GaetanSemet.markdown-okf-schema-studio": true }
```
