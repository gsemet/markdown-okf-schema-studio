# Task 07 Security Evidence

Validation date: 2026-09-25.

## Task 01 Probe Coverage

The 39-test unit campaign includes the Task 01 hostile-resource, trust, CSP, and staging suites.
The following probes passed:

| Probe | Result |
| --- | --- |
| Workspace Trust before staging or process creation | Pass; untrusted host spawn count is zero |
| Restrictive CSP with nonce-bearing scripts | Pass; no wildcard, `unsafe-inline`, or |
|  | `unsafe-eval` |
| Existing weaker CSP and refresh metadata removal | Pass |
| Bounded output and explicit source resource roots | Pass |
| Raw HTML, active HTML elements, inline scripts, and event attributes |
|  | Pass; removed or diagnosed |
| Active SVG content, nested scripts, and `foreignObject` | Pass; removed or diagnosed |
| `srcset` candidates | Pass; only validated local candidates survive |
| CSS `url()` and `@import` | Pass; unsafe URLs are blocked while local assets survive |
| Fonts and media | Pass through the explicit resource policy |
| `javascript:`, `data:`, `file:`, and `vscode:` schemes | Pass; blocked |
| Relative traversal and encoded traversal | Pass; blocked after repeated decoding and |
|  | canonicalization |
| Symlink escape and unrelated workspace-file probes | Pass; blocked by real-path root checks |
| Deferred local navigation and external HTTPS/mail links | Pass; host-routed or allowlisted |
| Staged active document and referenced inputs only | Pass; no broad workspace staging |

The focused test files are under `test/security/` and the trusted
and untrusted integration suites under `test/integration/`. The machine-readable unit transcript is
preserved at `out/reports/unit/tests-unit.xml`.

## Effective Webview Policy

The tested policy uses `default-src 'none'`, a Webview-origin allowlist for local images, styles,
fonts, and media, a Webview-origin plus nonce for scripts, and `connect-src`, `frame-src`,
`object-src`, `worker-src`, `base-uri`, and `form-action` restrictions. Existing CSP metadata is
removed before the canonical policy is inserted. Local resources are rewritten only after path,
scheme, canonical-root, and symlink validation.

## Package Supply Chain





`npm ci` ran with Node v24.21.0 and installed 317 packages with zero reported vulnerabilities. The
lock audit at `out/reports/security/` found 325 resolved package entries, zero credential
URLs, and zero raw public-registry matches. Funding and homepage URLs were not classified as package
registries.

## Isolation

The extension process path invokes the repository Sphinx configuration through an isolated temporary
stage. The preview source and test search contain no `book-prepare` call and no production
`_build/html` or `_build/livereload` dependency. The preview does not write active source files,
generated navigation, bibliography output, or production build output.
