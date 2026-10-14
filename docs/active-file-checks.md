# Task 07 Active-File Checks

Validation date: 2026-09-25.

## Automated Active-File Matrix

The focused campaign exercised the active document through the real Sphinx HTML builder in
temporary source, doctree, and output roots. The tests do not call `book-prepare` and a search of
the extension source and tests found no reference to that recipe or production `_build` paths.

| Check | Evidence | Result |
| --- | --- | --- |
| Unsaved active buffer | `trusted-suite.ts`, `dirtySnapshots.test.ts`, `projectFeatures.test.ts` |
|  |  | Pass |
| Source and production output integrity | Trusted host hash and content assertions | Pass |
| Missing include/input | Feature and rendering tests | Pass with source file and line diagnostic |
| Stale last-good output | Lifecycle failure and recovery assertions | Pass |
| Editor switch and identity | Lifecycle and source-mapping host tests | Pass |
| Reload and serializer | `serializer.test.ts` and lifecycle suite | Pass |
| Missing/deleted active source | Serializer and workspace-disposal suites | Pass |
| Theme refresh | Lifecycle theme-change request and bounded rerender | Pass |
| Links and hostile navigation | Navigation and HTML policy unit tests | Pass |
| Keyboard/source reveal | Mapped focusability and host-approved reveal tests |
|  |  | Automated proxy pass |
| Native Webview find | Feature `findWidgetEnabled` assertion and browser probe | Pass |
| Rendered-text clipboard | Chromium/CDP browser probe with `pbpaste` | Pass |
| Semantic accessibility | `main`, heading, live status, focusable mapping assertions | Pass |
| VoiceOver speech | macOS VoiceOver service and spoken output | Not executed |
| Current installed VSIX window | Real chapter after profile installation and reload | Unverified |

## Dirty Buffer and Integrity

The trusted host edits an open Markdown `TextDocument` without saving it, renders a marker that is
absent from the fixture on disk, and verifies that the source file remains byte-for-byte unchanged.
It also compares the production `_build` directory before and after the preview. The dirty snapshot
suite covers newest-version wins, cancellation, closed dependency refresh, failure diagnostics,
stale last-good output, recovery, and temporary-root cleanup.

The observed final extension-host timings were 654 ms for the initial render, 616 ms for a normal
edit refresh, and 500 ms for an intentionally delayed obsolete build. These are fixture and machine
measurements, not performance guarantees for every chapter.

## Missing Input

The missing-input fixture references an unavailable local Markdown input. Sphinx failure is exposed
as a diagnostic containing the active source filename and line, for example
`missing-input.md:5: Referenced input is unavailable`. The failed active document does not display
the previous document's HTML, and the tested failure path does not invoke a book-wide build.

## Long-File Mapping

The focused Sphinx mapping test suite passes all four tests. Preview-mode HTML carries real positive
one-based source lines for mappable blocks, preserves the active document identity, and omits
fabricated locations for generated or originless content. The Webview runtime tests cover top,
middle, and end interpolation, inserted content, layout changes, rapid alternating scroll, image
load stabilization, resize, stale versions, click reveal, double-click policy, and echo suppression.

## Interaction and Failure Checks

The trusted extension host covers:

- active editor changes to another Markdown file and to a non-Markdown file;
- theme changes, explicit refresh, invalid directive failure, stale last-good content, and recovery;
- serializer restoration, source deletion, workspace-folder removal, panel disposal, and cleanup;
- local dependency edits and renames within the workspace-bounded staging policy; and
- stock Markdown preview commands, native text diff registration, unchanged `markdown.*` settings,
  and simultaneous stock/MyST preview panels.

The browser probe covers authentic rendered text selection and copy, native Webview find, a named
landmark, a live status region, mapped focusable blocks, workspace trust, stock-preview coexistence,
and reduced-motion scroll behavior. The semantic proxy does not replace a human screen-reader
walkthrough.

## Current-Window Attempt

After `just install-vsix`, an existing VS Code window was reloaded. A representative Markdown
document was opened, the stock preview was invoked, and the source editor was used to invoke the
Studio preview command. The editor state and active workspace were visible through `code --status`,
but display capture failed and System Events exposed zero Code windows. No rendered current-window
result is claimed.

The exact limitation and the final decision are recorded in
[`release-evidence.md`](release-evidence.md).
