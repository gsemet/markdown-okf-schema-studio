# Active-File Sphinx Feature Contract

## Decision

Task 04 is a rendering `GO`. The active citation-free fixture renders through the repository's
configured Sphinx HTML builder, and the extension-host test verifies the resulting sanitized
Webview HTML. A missing local include produces a source-file and line diagnostic while the last
successful feature render remains visibly stale. No Markdown fallback is used.

## Constructs Checked

The fixture at `sphinx/tests/fixtures/sphinx-features/feature-contract.md` checks exactly:

- `h1` and `h2` headings;
- a MyST `note` admonition;
- inline and display math;
- a MyST `code-block` directive with a Python class and rendered code;
- an external HTTPS link;
- a MyST `figure` directive with a staged local image;
- an unsaved active-buffer marker, without a citation or bibliography dependency.

The rendering unit test checks the raw Sphinx HTML and the staged `_images/local-image.png` file.
The extension-host test checks the DOM after Webview resource rewriting, including the heading,
admonition, math nodes, code directive, external link, local image, restrictive CSP, and absence
of raw Markdown directive syntax.

## Failure Contract

`missing-input.md` references `does-not-exist.md`. The build reports an actionable diagnostic at
the active file and line, for example `missing-input.md:5: Referenced input is unavailable`.
The extension retains the previous feature HTML and inserts `data-sphinx-preview-status="stale"`
with the diagnostic. It does not display the failed source as Markdown and does not replace the
last-good document with another file.

## Boundary

This contract covers the configured Sphinx `html` builder only. It does not claim parity for PDF,
RevealJS, Confluence, `singlehtml`, or the whole-book navigation and bibliography pipeline.
Unknown directives, raw HTML, third-party Markdown-It extensions, citations, and unavailable
inputs are not part of the supported feature fixture; unavailable inputs are tested only for the
diagnostic and stale-output behavior described above.

The preview does not invoke `just book-prepare`, regenerate `refs.bib`, rebuild navigation, or
run a book-wide build. The active file and its directly referenced local image are staged outside
the worktree.

## Evidence

The focused evidence commands for this task are:

```text
fnm exec -- npm run compile
fnm exec -- npm run test:unit
fnm exec -- npm run test:integration
just check-justfile
just book-check
```

Observed results: `npm run compile` passed; `npm run test:unit` passed with 31 tests; and
`npm run test:integration` passed in both untrusted and trusted extension hosts. `just
check-justfile` passed. `just book-check` passed with synchronized diagrams, glossary,
bibliography, and animation posters. No full book build or `book-prepare` was run.
