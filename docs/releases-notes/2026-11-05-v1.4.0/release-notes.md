<h1 align="center">Markdown OKF-Schema Studio 1.4</h1>

<p align="center">
  <b>Follow a long table row by row, keep the focus in a new preview, see Studio in one minute.</b><br>
  <sub>12 changes since 1.3.2 · VS Code 1.95 or later · MIT</sub>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio">Install from the Marketplace</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio#readme">Read the guide</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/blob/v1.4.0/CHANGELOG.md">Full changelog</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0">1.0 showcase</a>
</p>

---

## 🎨 Follow a long table row by row

Tables are easier to read: the heading and the even rows have a soft tint, and the row under the
pointer is highlighted. The colours follow the theme, in the Cream and Dark themes as in your own
VS Code theme. Nothing changes in the Markdown.

| Cream | Dark |
| --- | --- |
| ![A table in the Cream theme with a tinted heading, tinted even rows and the row under the pointer highlighted](hover-cream.png) | ![The same table in the Dark theme](hover-dark.png) |
| The pointer is on the second row | The tints follow the theme |

A wide comparison table from an agent no longer makes you lose your line halfway across.

## 🎬 See Studio in one minute

The project now has a short demo video: a post-mortem read, edited and reviewed in the page.

https://github.com/user-attachments/assets/770e80d6-4530-4704-b588-e940ba189330

It is also at the top of the README, so you can show the editor to a colleague in one link.

## 🛠 Smoother editing

- **A preview keeps the focus**: a preview opened right after another one closed keeps the focus,
  and an editor just opened in it no longer closes by itself about a second later.

<details><summary><b>🛠 For contributors</b></summary>

- The real VS Code jobs now run on every push to `main`, and a release waits for them to be green
  before its version commit.
- The checks stay stable on Windows and on busy machines.
- The process and the kit for short demo videos are in `docs/demo-video/`.

</details>
