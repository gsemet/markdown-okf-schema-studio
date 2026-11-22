<h1 align="center">Markdown OKF-Schema Studio 1.12</h1>

<p align="center">
  <b>Preview the real file next to a diff, reach blank lines inside lists and quotes, read the content of a dropdown.</b><br>
  <sub>34 changes since 1.11.0 · VS Code 1.95 or later · MIT</sub>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio">Install from VS Code Marketplace</a> ·
  <a href="https://open-vsx.org/extension/GaetanSemet/markdown-okf-schema-studio">Install from Open VSX</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio#readme">Read the guide</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/blob/v1.12.0/CHANGELOG.md">Full changelog</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0">1.0 showcase</a>
</p>

---

## 🔍 Preview the real file next to a diff

The side preview now works next to a text diff: the book button is in the diff's title bar, and the preview follows the diff you open. Hover a green change bar to see the changed lines, and click it to open the diff of that block in place.

![A green change bar with its tooltip, "Changed line 7 since last commit", next to a changed heading, paragraph and bullets](change-bar-tooltip.png)

## ⬜ Reach blank lines inside lists and quotes

In edit mode, blank lines between list items, inside a list item, and inside quotes, alerts, admonitions, panels and cards show as a blank-lines block you can select, type in or remove.

![Quote, alert and admonition, each with a dashed Blank lines block between its first and last line](blank-lines-in-containers.png)

## ▸ Read the content of a dropdown

A MyST dropdown written as a `:::{dropdown} Title` directive shows its body in the side preview, closed unless it has `:open:`.

![Three dropdowns shown empty as Details, then the same dropdowns with their titles and the body of the open one](dropdown-before-after.png)

## 🛠 Smoother editing

- **A jump to a line shows an arrow.** A search result, Quick Open `file.md:40`, Go to Line, Problems or a link marks the target line in the side preview; the arrow stays through scrolls and cursor moves.
- **The line marker is exact in tables, tabs and front matter.** It marks the table row, shows a hidden tab first and marks the line inside it, and marks the property row of the front matter.
- **Requirement pages on the website** find a requirement from its full ID, such as `StRS-MDOKFSTUDIO-BLOCK-003`, its short ID or a bare number.

<details><summary><b>🐞 All fixes</b></summary>

- Copy, cut and paste on a list followed by blank lines no longer fail with "The preview is out of date".
- A review comments file whose thread date names a day that does not exist, such as 2026-02-30, is refused like any other bad date.

</details>

<details><summary><b>🔎 Details</b></summary>

- The side preview does not follow the multi-file diff editor or the merge editor, because VS Code gives them no tab input to follow.
- With scroll sync on, a jump scrolls the preview only when the target line is off screen.
- A removed-lines marker in the change bar column has its own tooltip, and a click on it opens the diff of its block.

</details>

<details><summary><b>🛠 For contributors</b></summary>

- `just dev` sets `core.longpaths` in the repository on Windows, so a checkout or a new worktree does not fail with "Filename too long".
- `just mutation-core` runs a local mutation campaign on `src/core`; it takes hours and is not part of `just check`.

</details>
