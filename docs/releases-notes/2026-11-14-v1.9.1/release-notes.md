<h1 align="center">Markdown OKF-Schema Studio 1.9.1</h1>

<p align="center">
  <b>The same extension, on both registries at the same moment.</b><br>
  <sub>9 changes since 1.9.0 · VS Code 1.95 or later · MIT</sub>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio">Install from VS Code Marketplace</a> ·
  <a href="https://open-vsx.org/extension/GaetanSemet/markdown-okf-schema-studio">Install from Open VSX</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio#readme">Read the guide</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/blob/v1.9.1/CHANGELOG.md">Full changelog</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0">1.0 showcase</a>
</p>

---

## 📦 Published to Open VSX with every release

Nothing changes in the extension: 1.9.1 works exactly as 1.9.0. What changes is how it gets out.
1.9.0 reached Open VSX only after a second, manual run of the release. From 1.9.1, the release
publishes to the VS Code Marketplace and to Open VSX in the same run, so VSCodium, Cursor and the
other editors that use Open VSX get the update when VS Code does.

If you installed the extension from Open VSX, you no longer wait for a late copy of a release.

<details><summary><b>🛠 For contributors</b></summary>

- The version push now dispatches the release workflow, instead of calling it as a reusable
  workflow, so the Open VSX trusted publisher sees the release workflow itself.
- `just bump-version` creates the version commit without a `Signed-off-by` trailer, as the commit
  guideline asks.
- The real VS Code integration tests check the real window size before emulating a viewport, give
  the virtual screen of CI room for the largest viewport, and wait for the window and the webview
  to have the focus before they open a block editor.
- The stress run of the real VS Code tests runs 12 rounds by default instead of 20, and its launch
  deadline is computed from the work it does (2 minutes plus 6 seconds per scenario run, capped at
  24 minutes) instead of a fixed 26 minutes that a default run came close to.
- Known issue: the `toc` step of the integration tests, which runs after the `readme-html` step,
  sometimes loses the first click on the Edit toggle in CI. It is a test flake, not a product bug,
  and is not fixed yet; the test now logs what it sees when it happens, and a `toc-loop` job of
  the CI can repeat the two steps to reproduce it.

</details>
