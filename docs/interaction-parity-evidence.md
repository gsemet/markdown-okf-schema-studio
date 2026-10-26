# Task 06 Interaction and Accessibility Evidence

## Decision

**GO for the Task 06 development gate; NO RELEASE claim.** The implementation provides
independent MyST-only interaction settings, bounded two-way source mapping, safe local navigation,
keyboard reveal, semantic output, visible focus, theme/high-contrast CSS hooks, reduced-motion
rules, and native Webview find configuration. The stock Markdown preview and `markdown.*` settings
are not contributed to or modified.

The real VS Code/Electron browser probe now exercises the missing interaction evidence against
authentic sanitized Sphinx output: native workspace trust, rendered-text clipboard copy, the
native Webview find widget, and coexistence with the stock Markdown preview. The semantic
accessibility proxy passes. Actual VoiceOver or other assistive-technology speech output was not
executed, so this document does not claim that behavior passed. Task 06's testing strategy permits
documented manual checks when automation is unavailable; the automated semantic and keyboard
evidence supports this development-gate decision without inferring spoken output. VoiceOver
remains a manual Task 07 release-validation item.

This is not a release claim for fixed-file preview, native source/version diff editor integration,
or rendered-block editing. Fenced `diff` and `patch` blocks are visualization-only rendered code,
not live comparisons. Current-window visual installation and assistive-technology checks remain
release evidence work rather than development-host proof.

## Environment

Recorded on 2026-09-25 from the standalone Studio repository:

| Tool | Version |
| --- | --- |
| VS Code | 1.139.0 (arm64) |
| Node | v24.21.0 via `fnm` |
| npm | 11.19.0 |
| Python | 3.12.12 via `uv` |
| Sphinx | 9.1.0 |
| Extension package | 0.1.0 |
| Browser automation | Python Playwright with Chromium attached to Electron through CDP |
| Clipboard check | macOS `pbpaste` |
| Coder revision under review | `7f645e2` |

## Automated Evidence

Commands were run from the standalone repository root unless noted.

| Check | Result | Evidence |
| --- | --- | --- |
| `fnm exec -- npm ci` | Pass; 317 packages, 0 vulnerabilities | Nested Artifactory `.npmrc`; Node 24 |
| `fnm exec -- npm run check-types` | Pass | Strict TypeScript check |
| `fnm exec -- npm run test:unit` | Pass; 39 tests | Compile, build queue, settings, mapping, navigation, security, state, and Webview runtime |
| `fnm exec -- npm run test:integration` | Pass | Untrusted and trusted isolated VS Code hosts; dirty snapshots, lifecycle, serializer, source mapping, features, workspace disposal, and stock coexistence |
| `fnm exec -- npm run package` | Pass | `out/reports/package/markdown-okf-schema-studio.vsix` |
| `just package` | Pass | `out/reports/package/markdown-okf-schema-studio.vsix` |
| `just check-justfile` | Pass | Repository root |
| `just book-check` | Not rerun | No shared Sphinx/build surface changed during this inspection; prior task evidence remains recorded separately |
| `fnm exec -- npm run test:browser` | Pass | Real isolated VS Code/Electron/CDP session; native trust, rendered-text clipboard, native Webview find, stock preview coexistence, semantic accessibility proxy, and reduced-motion behavior |

Focused assertions include:

- all four settings are under `sphinxMystLiveview.preview`; no `markdown.*` setting is added;
- scroll directions are independently disabled and source marking is opt-in (the double-click
  reveal setting was removed; a single click reveals the source);
- click and keyboard mapping messages carry document/version/request identity;
- hidden or zero-geometry blocks do not enter interpolation; image load, decode, resize, and rapid
  source-scroll stabilization remain active;
- deferred relative links are inert (`href="#"`) and host-routed, while staged Sphinx HTML links
  remain native Webview links;
- the output has a named `main` landmark, mapped blocks can receive keyboard focus, missing image
  alt text becomes decorative `alt=""`, and focus/forced-colors/reduced-motion CSS is present;
- hostile HTML, scripts, event attributes, schemes, CSS URLs/imports, traversal, and resource-root
  checks remain covered by the existing security suite; and
- stale document/version/request messages remain rejected by the host and Webview runtime.

## Browser Evidence

The probe was run from the standalone repository root with:

```bash
fnm exec -- npm run test:browser
```

The machine-readable result was:

```json
{
  "accessibility": {
   "heading_count": 1,
   "main_label": "Sphinx MyST preview content",
   "mapped_focusable_count": 5,
   "semantic_main": true,
   "status_live": true
  },
  "assistive_tree_proxy": "pass",
  "clipboard_rendered_text": "pass",
  "limitation": "This probe verifies Chromium semantics and CDP-visible native find, not VoiceOver speech output.",
  "native_webview_find": "pass",
  "reduced_motion_scroll_behavior": "auto",
  "stock_preview_coexistence": "pass",
  "vscode_cdp": "pass",
  "workspace_trust": "pass"
}
```

The stock frame URL is intentionally omitted because it contains a per-run Webview identifier.
The probe asserts that a native stock Markdown Webview and the MyST Webview are both present and
render the fixture text.

## Manual / Accessibility Checklist

The isolated extension-host and fake-DOM tests do not emulate a real screen reader. The browser
probe verifies Chromium semantics and native VS Code Webview UI where stated, but it does not
verify spoken output.

| Check | Automated proxy | Current-window status |
| --- | --- | --- |
| Select and copy rendered text | Chromium selected authentic rendered text; `pbpaste` contained the fixture heading | Automated browser pass |
| Webview find | `Meta+F` opened the native visible find input and accepted the fixture heading | Automated browser pass |
| Browser/Webview zoom | Webview output remains native HTML and responsive runtime behavior is covered by focused tests | Actual VS Code Webview zoom remains manual |
| Keyboard focus and reveal | Five mapped blocks expose `tabindex="0"`; host/runtime tests cover mapped reveal messages | Semantic/host evidence pass; current-window walkthrough remains manual |
| Screen-reader landmark/status | Chromium `main` `aria-label`, one heading, and live status markup assertions pass | VoiceOver/assistive-technology speech output **not executed** |
| Theme change | Chromium `themeChanged` updates the theme attribute; host path is covered | Runtime pass; live VS Code theme session pending |
| High contrast | Chromium `forced-colors: active` produces a 2px solid focus outline | Browser pass; live VS Code high-contrast session pending |
| Reduced motion | Chromium `prefers-reduced-motion` produces `scrollBehavior: auto` | Browser pass |
| Stock Markdown preview | Native stock preview action opens a stock Webview before the MyST preview; both render the fixture | Automated browser and extension-host pass |
| Missing/deleted/failing source | Existing lifecycle and workspace-disposal hosts pass explicit status/recovery cases | Automated pass |

## Assistive-Technology Protocol

This protocol is recorded for the manual release check. It was **not executed** during this Task 06
run, and its result must not be reported as pass until a person performs it.

1. Launch the extension in a trusted workspace and open `test/integration/fixtures/preview.md`.
2. Open the Sphinx MyST preview beside the source editor and wait for the rendered heading and
  status message.
3. Enable macOS VoiceOver with `Command-F5`, move focus into the Webview, and navigate by landmark,
  heading, and interactive element.
4. Confirm that VoiceOver announces the `Sphinx MyST preview content` main landmark, the rendered
  heading, the polite status region when its text changes, and the mapped source-line controls.
5. Activate a mapped control with VoiceOver's standard interaction command and confirm that the
  source editor reveals the corresponding line without leaving the workspace.
6. Record the macOS version, VS Code version, VoiceOver result, and any announcement or focus
  defect. A missing or ambiguous announcement is a failure, not an inferred pass from the
  Chromium accessibility tree.

## Scope Boundary

The implementation covers one side preview of the active Markdown document. It does not add a
fixed-file preview, native source/version diff editor integration, or editing inside rendered
blocks. Fenced `diff` and `patch` blocks remain visualization-only. The stock Markdown preview
remains a separate VS Code feature and its settings and commands are untouched.

## Gate Outcome

Task 06 interaction rework is complete and the focused unit, extension-host, packaging, security,
repository, and real Chromium checks above pass. Task 06 is **ACCEPTED / GO** as a development
gate. The documented VoiceOver/assistive-technology protocol was not executed and remains explicit
manual release evidence; no spoken-output or final-release claim is made here. Task 07 remains
unreached and was not started.
