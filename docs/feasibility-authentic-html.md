# Authentic HTML Feasibility and Security Gate

## Decision

**GO for Task 01.** The active Markdown file renders through the repository's authentic Sphinx/MyST
HTML pipeline and loads in a constrained VS Code Webview. The untrusted-workspace path returns
before process creation. Tasks 02 and 03 may proceed only after this status is accepted; this
record does not implement or unblock those tasks itself.

The independent inspector initially returned the coder baseline for rework after observing that
versioned Sphinx asset URLs were treated as filenames, MyST includes were omitted from staging,
and hostile-content coverage missed nested SVG, EOF CSS imports, and whitespace-obscured refresh
metadata. Those defects were repaired and revalidated. The trusted test now proves stylesheet
survival and renders an unsaved editor marker while leaving the fixture on disk unchanged.

## Scope Tested

The integration fixture contains a MyST note admonition, inline and block math, and a local image.
The trusted extension host opens that file, invokes the contributed command, renders it with Sphinx,
and verifies the resulting HTML contains:

- the admonition and math output;
- the local image's `Local preview image` text;
- Sphinx `_static` theme assets, including surviving `rel="stylesheet"` CSS links;
- a Webview Content Security Policy and nonce;
- no wildcard or `unsafe-inline` CSP source;
- a marker added only to the dirty editor buffer, while the fixture file remains unchanged.

The trusted test also records the production `_build/` directory before and after rendering and
requires it to remain unchanged.

## Commands and Evidence

All package commands run with Node 24 selected by `fnm` and the nested Artifactory `.npmrc`.
The integration host uses the installed macOS VS Code executable when available.

| Check | Result | Evidence |
| --- | --- | --- |
| `npm ci` | Pass; 317 packages, 0 vulnerabilities | ignored `node_modules/` |
| `npm run compile` | Pass | ignored `out/` |
| `npm run test:unit` | Pass; 11 tests | `test/security/` |
| `npm run test:integration` | Pass; untrusted and trusted hosts | `test/integration/` |
| `just check-justfile` | Pass | Root `justfile` |
| `just package` | Pass; VSIX created | ignored `out/reports/package/*.vsix` |
| `just install-vsix` | Pass; default profile installed locally | VS Code CLI |

The post-sanitization inspection retained 9 local CSS links and 12 local JavaScript links, with
zero missing local resources. The only blocked stylesheet was the intentionally external Google
Fonts URL. The lockfile contains 0 public registry URLs and 0 credential markers.

The first packaging attempt exposed a missing repository URL for the README's local evidence link.
The manifest now declares the repository URL; the successful packaging check is the result after
that manifest correction.

## Renderer Boundary

The extension stages the active unsaved document and explicitly referenced assets, including
recursive MyST includes, into temporary source/output/doctree directories. It invokes Sphinx with
the repository configuration using the
following shape:

```text
uv run --no-sync -- sphinx-build -W --keep-going -b html \
  -c <workspace>/sphinx -d <temporary-doctree> <temporary-source> <temporary-output>
```

The preview never calls `book-prepare`, never writes publication output, and does not use the
production `_build/` directory. Sphinx remains the only Markdown/MyST renderer in this path.

## Workspace Trust Gate

The command checks `vscode.workspace.isTrusted` before staging files or spawning `uv`, Sphinx,
Python, `just`, a server, or any other process. The untrusted integration scenario launches a
fresh VS Code host without the test helper's trust-disabling flag, opens the fixture, invokes the
real contributed command, and instruments the Sphinx process spawner. The measured spawn count is
zero.

The trusted scenario uses an isolated extension host and confirms authentic Sphinx output rather
than a mocked HTML response.

## Webview Policy

The Webview receives a nonce-bearing CSP with these deliberate allowances:

- `default-src 'none'` disables unspecified resource classes.
- `img-src`, `style-src`, `font-src`, and `media-src` allow only the VS Code Webview origin. These
  classes are needed for Sphinx theme CSS, local images, fonts, and media.
- `script-src` allows the same Webview origin plus the generated nonce. Sphinx JavaScript is
  retained only when it is a staged local resource and receives the nonce.
- `connect-src 'none'`, `frame-src 'none'`, `object-src 'none'`, `worker-src 'none'`,
  `base-uri 'none'`, and `form-action 'none'` remove unrelated network, embedding, worker, base,
  and form capabilities.

The policy contains no wildcard source, `unsafe-inline`, or `unsafe-eval`. Existing CSP metadata is
removed before the canonical policy is inserted.

Resource validation is centralized. Requests are repeatedly URL-decoded, restricted to relative
paths, checked lexically and by real path, and rejected when they escape a staged root through a
symlink. Navigation permits anchors and `http:`, `https:`, and `mailto:` links only, preserving
query and fragment suffixes. Local resources are rewritten to `webview.asWebviewUri(...)`.

The focused hostile-resource tests cover:

- raw HTML active elements, inline scripts, event attributes, and inline styles;
- active SVG content including scripts and `foreignObject`;
- `srcset` candidates;
- CSS `url()` and `@import` values;
- fonts, media, and local stylesheet resources;
- `javascript:`, `data:`, `file:`, and `vscode:` schemes;
- ordinary and encoded traversal;
- symlink escapes and unrelated workspace-file probes.

Blocked or removed inputs produce structured security diagnostics rather than silently becoming
unbounded Webview access.

## Local Installation Evidence

The build recipe writes the ignored artifact at
`out/reports/package/markdown-okf-schema-studio.vsix`. The install recipe
uses `code --install-extension <vsix> --force`, accepts a positional profile argument for a named
profile, and reports the manual **Install from VSIX...** action when the `code` CLI is unavailable.
It does not publish the extension.

The default-profile install succeeded. The named-profile forwarding was also exercised; the local
VS Code CLI rejected the test name because that profile does not exist on this machine. Users must
provide an existing profile name.

After installation, the current VS Code window must be reloaded manually. The extension is
installed into the selected VS Code profile, not into a workspace, and files under `src/` do not
auto-activate it. F5 uses the root `.vscode/launch.json` configuration to open this workspace as
an Extension Development Host.

## Limitations

Task 01 deliberately does not implement dirty-snapshot lifecycle, source mapping, scroll sync,
continuous reload, fixed-file views, or interaction parity. Those behaviors remain behind the
status gate for later tasks.

The feasibility result is therefore limited to authentic active-file HTML rendering, the required
asset classes, Workspace Trust enforcement, and the restrictive resource policy described above.
