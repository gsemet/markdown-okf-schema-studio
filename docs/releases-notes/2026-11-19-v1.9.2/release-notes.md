<h1 align="center">Markdown OKF-Schema Studio 1.9.2</h1>

<p align="center">
  <b>Edit long documents full of tables without the lag.</b><br>
  <sub>50 changes since 1.9.1 · VS Code 1.95 or later · MIT</sub>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio">Install from VS Code Marketplace</a> ·
  <a href="https://open-vsx.org/extension/GaetanSemet/markdown-okf-schema-studio">Install from Open VSX</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio#readme">Read the guide</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/blob/v1.9.2/CHANGELOG.md">Full changelog</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0">1.0 showcase</a>
</p>

---

## ⚡ Edit mode keeps up on long documents

On a long document with many tables, edit mode used to lag: hovering the floating toolbar,
opening a block editor and typing all took visible time. The page was laid out again once per
table, per row handle or per key release. Edit mode now does that work once for the whole page:
placing the row and column handles, flagging the tables that scroll sideways and revealing the
caret while you type no longer repeat a layout for each table, handle or key, and opening an
editor on a paragraph no longer measures every table again.

Nothing looks different; the page simply answers faster when the document is big.

<details><summary><b>🐞 All fixes</b></summary>

- The install docs name Windsurf next to VSCodium and Cursor, give VS Code 1.95 as the minimum,
  and say the Agents window is a VS Code feature.

</details>

<details><summary><b>🛠 For contributors</b></summary>

- The requirements site draws the use case diagram of a stakeholder requirement as an inline SVG
  at build time, with no script; a diagram Mermaid cannot draw fails the build.
- `just check` gates the requirement markers: each marker sits on the code or the test it names.
- The requirements of the palette, theme, layout, block editing, table editing, toolbar,
  lifecycle, rendering core, code blocks, GFM and MyST areas are gardened, with use case diagrams
  and markers on the code and tests that carry them.
- `src` is type-checked against the minimum supported `@types/vscode`.
- Several real VS Code integration steps are steadier: hovers, list options and the Edit toggle
  click are retried or logged, and the side bar is closed before the preview opens.

</details>
