<h1 align="center">Markdown OKF-Schema Studio 1.7.1</h1>

<p align="center">
  <b>Browse the requirements as a map, read the whole site in one cream look, share a page with a picture card.</b><br>
  <sub>27 changes since 1.7.0 · VS Code 1.95 or later · MIT</sub>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio">Install from the Marketplace</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio#readme">Read the guide</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/blob/v1.7.1/CHANGELOG.md">Full changelog</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0">1.0 showcase</a>
</p>

---

This release is about the
[published site](https://gsemet.github.io/markdown-okf-schema-studio/). The extension itself
works as in 1.7.0.

## 🗺️ Browse the requirements as a map

The [Requirements](https://gsemet.github.io/markdown-okf-schema-studio/requirements/) page is now
a viewer you move through one level at a time: the 16 areas of Studio, the use cases of an area,
one use case, and one behaviour with its rule, scenarios, source files and tests. Search works on
every page, and the pages read without JavaScript.

Almost every use case now has its main paths written down step by step, and the viewer draws them as a
map: each circle is a state the user reaches, each label is the behaviour that takes them on, with
the number of tests that check it. Play path walks you through one path.

![The map of the use case "A writer edits a table cell in place and never loses the text": two paths of states, each step labelled with its behaviour and its number of tests, and the other outcomes on dashed lines](requirements-viewer-map.png)

The figures of the page are right again: the old page counted every requirement as "unknown", and
the old `requirements.html` link still works.

You can see what Studio promises, and how each promise is tested, without reading the code.

## 🎨 One cream look, and a picture when you share a page

Every page of the site, and the requirements viewer, now has the look of the extension's Cream
theme: the same colours, fonts and header everywhere, with no dark mode.

A link to the home, Contributing, How we ship, Gallery or requirements pages, shared on X or any
site that reads Open Graph, now shows a large picture card. The gallery card shows the live number
of captures.

![The share card of the screenshot gallery: "542 screenshots" in cream, with three captures of the extension in VS Code](share-card-gallery.png)

A shared link now says what it leads to before anyone clicks it.

<details><summary><b>🐞 All fixes</b></summary>

- On the site, the requirements breadcrumb shows the full current page on its own row, and wide
  code blocks and tables scroll inside themselves instead of widening the page on a small screen.
- Without JavaScript, the requirements viewer hides its search and play buttons, which need it.
- The requirements viewer passes the accessibility checks.

</details>

<details><summary><b>🛠 For contributors</b></summary>

- A check, run by `just requirements-lint`, fails when the main paths of a use case cite a
  behaviour that does not exist, is not active, or belongs to another use case.

</details>
