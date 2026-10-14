# Task 07 Release Evidence

## Decision

The evidence-backed decision for the first active-file release is `NO RELEASE`.

The focused automated campaign passes, including the five hard safety gates, authentic Sphinx
rendering, dirty-buffer staging, source mapping, lifecycle behavior, stock-preview coexistence,
browser interaction, packaging, and the nested Artifactory install. Release remains blocked because
the installed VSIX could not be observed in the already-open VS Code window and actual VoiceOver
speech output could not be executed. Those missing observations are not inferred from process
exit codes, persisted editor state, or Chromium accessibility semantics.

Validation date: 2026-09-25.

## Environment

| Item | Recorded value |
| --- | --- |
| Operating system | macOS 26.6.2, build 25G83, arm64 |
| VS Code | 1.139.0, commit `2242ebbb54efeeb0129e08e919e7e8d43033cd83` |
| Extension | `GaetanSemet.markdown-okf-schema-studio` 0.1.0 |
| Node selected by nested `.nvmrc` | v24.21.0 via `fnm exec` |
| Shell `fnm current` | v25.4.0; not used by the nested package commands |
| npm | 11.19.0 |
| Python | 3.12.12 via `uv` |
| Sphinx | 9.1.0 |
| pytest | 9.1.0 |
| fnm | 1.38.1 |
| uv | 0.12.15 |
| just | 1.58.0 |

## Canonical Campaign

The reproducible entry point is `just release-check`. It runs each command
as a separate fail-fast stage and preserves its output under `out/reports/task-07/` so an individual
failure remains visible and reviewable:

```text
just release-check
```

| Command | Result | Evidence or artifact |
| --- | --- | --- |
| `fnm exec -- npm ci` | Pass; 317 packages, 0 vulnerabilities | `out/reports/task-07/npm-ci.log` |
| `fnm exec -- npm run compile` | Pass | `out/reports/task-07/compile.log` |
| `fnm exec -- npm run check-types` | Pass | `out/reports/task-07/check-types.log` |
| `fnm exec -- npm run test:unit` | Pass; 39 tests | `out/reports/task-07/test-unit.log` |
| `fnm exec -- npm run test:integration` | Pass; trusted and untrusted hosts |
|  |  | `out/reports/task-07/test-integration.log` |
| `fnm exec -- npm run test:browser` | Pass; Chromium and CDP checks |
|  |  | `out/reports/task-07/test-browser.log`, `browser-report.json` |
| `fnm exec -- npm run package` | Pass; standalone VSIX |
|  |  | `out/reports/package/markdown-okf-schema-studio.vsix` |
| `uv run --no-sync --group docs pytest sphinx/tests/test_sphinx_preview_mapping.py` | Pass; 4 tests |
|  |  | `out/reports/task-07/test-sphinx-mapping.log` |
| `just check-justfile` | Pass | `out/reports/task-07/check-justfile.log` |
| `just book-check` | Pass | `out/reports/task-07/book-check.log` |
| `just release-check` | Pass; all stages completed |
|  |  | Root justfile release recipe |

The focused repository checks were also run:

| Command | Result | Reason or artifact |
| --- | --- | --- |
| `just preflight` | Not run | No shared Sphinx/build behavior changed in Task 07 |

`just preflight` was not required for this task because only extension evidence, documentation, and
an extension-only just recipe changed. No chapter, Sphinx configuration, build hook, generated book
asset, or production output was changed by Task 07. The existing dirty worktree also contains
unrelated book edits that predate this task. The normal-build isolation check remains covered by
the focused mapping test's no-preview HTML comparison and the source/dependency search recorded
in `security-evidence.md`.

## Hard Gates

| Gate | Automated result | Release interpretation |
| --- | --- | --- |
| Authentic MyST/Sphinx HTML | Pass | Trusted host and feature tests use the real HTML builder |
| Active dirty buffer and source integrity | Pass | Unsaved text renders; source and production |
|  |  | tree stay unchanged |
| Stable active-file mapping | Pass | Four Sphinx tests and Webview/runtime mapping tests pass |
| Workspace Trust before process creation | Pass | Untrusted host records zero process spawns |
| Restricted resources and navigation | Pass | CSP, roots, schemes, traversal, symlink, and |
|  |  | hostile content pass |

All five hard gates pass in the isolated automated campaign. The separate current-window install
criterion and the manual assistive-technology criterion remain unverified, so the release decision
is still `NO RELEASE`.

## Stock Preview

Before installation, the real Chromium probe opened the stock Markdown preview first and then the
MyST development preview. It reported `stock_preview_coexistence: pass`, native Webview find,
rendered-text clipboard copy, native text diff registration, and unchanged stock settings and
commands. The isolated integration suite repeats the stock command, setting, rendered-diff, and
coexistence assertions. This is automated development-host evidence, not installed-VSIX evidence.

After installing the VSIX, the current-window exercise opened a representative Markdown document,
invoked the built-in Markdown preview command, re-focused the source editor, invoked the Studio
preview command, and reloaded the window. The preview content could not be observed through the
available macOS automation. Therefore this is an attempted current-window check, not a passing
post-install stock/Studio observation.

## Current-Window Installation

The following commands were run from the repository root:

```text
just package
just install-vsix
code --list-extensions --show-versions
code --reuse-window test/visual/fixtures/01-handbook-overview.md
```

The build produced the ignored artifact at
`out/reports/package/markdown-okf-schema-studio.vsix`. The install recipe reported a successful
default-profile installation, and `code --list-extensions --show-versions` reported
`GaetanSemet.markdown-okf-schema-studio@0.1.0`. `code --status` showed the live
window as `01-introduction.md` in the Agentic Coding White Paper workspace. `Developer: Reload
Window` was sent to the frontmost Code process before the command exercise.

The current-window observation was blocked by the environment:

- `screencapture -x .../current-window-after-install.png` failed with `could not create image from
  display`.
- macOS `System Events` reported zero accessible Code windows, so the Webview DOM and visible panel
  state could not be inspected.
- The workspace state database retained the chapter in editor history but did not expose a
  persisted `markdown-okf-schema-studio.preview` panel that could serve as visual evidence.
- No direct installed-extension Sphinx result was present in the recent VS Code logs.

The keyboard actions were attempted, but without an observable Webview result they cannot establish
that the installed VSIX rendered the real chapter in the current window. This is a release blocker.

## VoiceOver

The browser artifact proves the semantic accessibility proxy, a named `main` landmark, a live
status region, mapped focusable elements, rendered-text selection/copy, native find, and reduced
motion behavior. It explicitly states that it does not prove VoiceOver speech output.

The macOS VoiceOver protocol was attempted with Command-F5. The command
`launchctl print gui/$(id -u)/com.apple.VoiceOver` reported `state = not running`, and the agent has
no audio channel through which it can verify
spoken landmark, heading, status, or source-control announcements. VoiceOver speech output is
therefore **not executed**, not passed by inference, and is a release blocker.

## Preserved Artifacts

The ignored local evidence directory is `out/reports/task-07/`. The corrected aggregate recipe creates the
logs and reports below on every run; the VSIX itself remains an ignored package artifact.

- `npm-lock-audit.json` records 325 resolved package tarballs, one Artifactory host, zero
  non-Artifactory resolved URLs, zero credential URLs, and zero raw public-registry matches.
- `npm-registry.txt` records the effective Artifactory registry, `noproxy`, and `strict-ssl` values.
- `npm-ci.log`, `compile.log`, `check-types.log`, `test-unit.log`, `test-integration.log`,
  `test-browser.log`, and `package.log` preserve each focused stage.
- `test-sphinx-mapping.log`, `check-justfile.log`, and `book-check.log` preserve the standalone
  gates run by the aggregate campaign.
- `browser-report.json` records the Chromium/CDP accessibility and stock-preview results.

No screenshot artifact was produced because the display capture failed as described above.

## Scope Boundary

This evidence does not claim full P01-P24 parity. Fixed-file preview, native source/version diff
editor integration, rendered-block editing, book-wide preview, and marketplace publication remain
outside the first release. Fenced `diff` and `patch` blocks are visualization-only in the active
preview. The stock Markdown preview remains a separate VS Code feature.

NO RELEASE
