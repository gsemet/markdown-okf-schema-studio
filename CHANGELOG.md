# Changelog

## Unreleased

- Changed the inline block editor: `Revert` is now `Cancel`, Escape cancels (in blocks and table
  cells) instead of keeping the text, Cmd/Ctrl+Enter still finishes, the status line shares one row
  with the Done and Cancel buttons, and the editor text is one size smaller.
- Fixed frontmatter values ending in `...` or `---` closing the block early, which dropped keys and
  made properties-table edits corrupt the file. Edits that would lose or duplicate a key are now
  refused.
- Fixed GitHub alerts (`> [!NOTE]`) rendering as plain blockquotes in CRLF documents.
- Fixed schema fields named like `Object.prototype` members (`constructor`, `toString`) being
  treated as present.

## 0.1.0 - 2026-09-25

- Completed the focused Task 07 validation campaign for the active-file Sphinx/MyST preview.
- Added the reproducible `just release-check` campaign recipe.
- Recorded the automated hard-gate, stock-preview, security, package, and accessibility evidence.
- Release decision: `NO RELEASE` because current-window rendering and VoiceOver speech output remain
  unverified in the available macOS automation environment.
