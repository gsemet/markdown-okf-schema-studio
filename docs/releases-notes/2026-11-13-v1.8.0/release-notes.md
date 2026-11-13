<h1 align="center">Markdown OKF-Schema Studio 1.8.0</h1>

<p align="center">
  <b>Save from the preview, keep a GitHub alert's title, read a long heading on one line.</b><br>
  <sub>12 changes since 1.7.1 · VS Code 1.95 or later · MIT</sub>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio">Install from the Marketplace</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio#readme">Read the guide</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/blob/v1.8.0/CHANGELOG.md">Full changelog</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0">1.0 showcase</a>
</p>

---

## 💾 Save from the preview with <kbd>Cmd</kbd>+<kbd>S</kbd>

<kbd>Cmd</kbd>+<kbd>S</kbd> (<kbd>Ctrl</kbd>+<kbd>S</kbd> on Windows and Linux) now saves the
document while the focus is in the preview, with no detour through the source editor. It works
even while you are editing a block, a table cell or a frontmatter field: the text typed so far is
written first, the text box stays open with its caret, and a frontmatter field closes.

You can keep your hands where you are working and save as often as you like.

## 📣 GitHub alerts keep their title

A GitHub alert whose first line is a heading or a bold line now keeps its title ("Note", or the
text after the marker) and shows that heading or bold line in its body, as GitHub does:

```markdown
> [!NOTE]
> ## Before you migrate
> Back up the database first.
```

MyST admonitions and Quarto callouts still take their title from a leading heading or bold line.

The preview now shows the same alert as GitHub, so what you read is what your readers get.

## 📌 A long heading stays on one line in the sticky band

The sticky band at the top of the preview shows each heading level on one line, cut with an
ellipsis when it is too long. It no longer grows at a high zoom, and no longer covers the first
line of the section below.

![The sticky band of a page zoomed in: the long title of the document on one line, cut with an ellipsis, above the same title in full and the first section](sticky-heading-one-line.png)

The band tells you where you are without hiding what you are reading.

## 🛠 Smoother editing

- **Export keeps your edit in progress**: Export to HTML keeps the content of a table cell or a
  front matter field that is being edited, as last saved; the editor stays open and is not in the
  file.

<details><summary><b>🐞 All fixes</b></summary>

- A click on a card of a grid written inside a quote, whose content starts with a blank quoted
  line, opens the editor on the card instead of the line above.

</details>

<details><summary><b>🛠 For contributors</b></summary>

- `ci-integration` stops at once on a locked screen and names the cause and both ways out;
  `just preflight` says why the report and gallery stages did not run.
- The e2e report names each failed visual check (`<page>: <detail>`) instead of printing
  `[object Object]`.
- Each pull request with a `feat` or `fix` commit now adds its own line to the changelog.

</details>
