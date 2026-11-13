<h1 align="center">Markdown OKF-Schema Studio 1.8.1</h1>

<p align="center">
  <b>The same extension, published a safer way.</b><br>
  <sub>2 changes since 1.8.0 · VS Code 1.95 or later · MIT</sub>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio">Install from the Marketplace</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio#readme">Read the guide</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/blob/v1.8.1/CHANGELOG.md">Full changelog</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0">1.0 showcase</a>
</p>

---

## 🔐 Published through Trusted Publishing

Nothing changes in the extension: 1.8.1 works exactly as 1.8.0. What changes is how it reaches the
VS Code Marketplace. The release is now published with the Marketplace's Trusted Publishing: the
GitHub release workflow proves who it is at the moment it publishes, and it no longer reads a
stored Marketplace token.

Once this release has proven the new way, the old token is deleted, and no long-lived secret can
publish the extension any more.

<details><summary><b>🛠 For contributors</b></summary>

- The release job publishes with `vsce publish --oidc` (Trusted Publishing from GitHub Actions)
  instead of the `VSCE_PAT` secret; the release workflow and its caller grant `id-token: write`.

</details>
