<h1 align="center">Markdown OKF-Schema Studio 1.9.0</h1>

<p align="center">
  <b>Reach every button in a compact square toolbar, keep a grid whole inside an alert, land on the card you click.</b><br>
  <sub>8 changes since 1.8.1 · VS Code 1.95 or later · MIT</sub>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio">Install from VS Code Marketplace</a> ·
  <a href="https://open-vsx.org/extension/GaetanSemet/markdown-okf-schema-studio">Install from Open VSX</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio#readme">Read the guide</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/blob/v1.9.0/CHANGELOG.md">Full changelog</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0">1.0 showcase</a>
</p>

---

## 🧭 The floating toolbar is four buttons wide

The floating toolbar now lays out its sixteen buttons on four rows of four, grouped by what they
do:

- Refresh, Edit, Export and the chevron that folds the toolbar;
- Anchor, Theme, Back and Next;
- Width, Fold, Zoom out and Zoom in;
- Table of contents, Side-by-side, Diff and Comments.

It keeps the same width as before, so it covers no more of the page, and it is one row shorter.

![The Cream theme with the floating toolbar open in the top right corner: four rows of four buttons next to a heading, a wide table and a diagram](floating-toolbar-four-by-four.png)

Each row is one kind of action, so your hand finds the button without reading the icons.

## 🧩 A grid stays whole inside a GitHub alert

A grid of cards written inside a GitHub alert now stays inside it, with all its cards, and the
text after the alert is no longer swallowed into a code block:

```markdown
> [!TIP]
> ::::{grid} 2
> :::{card} Plan
> Write the steps first.
> :::
> :::{card} Review
> Read the diff side by side.
> :::
> ::::

The next paragraph stays a paragraph.
```

No new picture for this one: the alert simply looks as you wrote it.

You can put a set of options or next steps inside a callout and trust the page to show it whole.

## 🛠 Smoother editing

- **Also on Open VSX**: the extension is now published on
  [Open VSX](https://open-vsx.org/extension/GaetanSemet/markdown-okf-schema-studio) too, so
  VSCodium, Cursor and the other editors that use that registry can install and update it.

<details><summary><b>🐞 All fixes</b></summary>

- A click on a card of a grid written in a list item, whose content starts with a blank line, opens
  the editor on the card instead of the line above.
- A click on a card of a grid written in a list item whose marker is followed by a tab, or whose
  cards are indented with a tab, opens the editor on the card instead of the line above.

</details>

<details><summary><b>🛠 For contributors</b></summary>

- `just dev` is the first command in a new worktree or a clean checkout; the docs say so.
- The release workflow publishes to Open VSX with trusted publishing, after the Marketplace, with
  no stored token.

</details>
