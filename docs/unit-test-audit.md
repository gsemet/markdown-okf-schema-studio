# Unit-test campaign audit

The 2026-10-04 audit reviewed all 23 original unit test files and their fixture helpers.
Integration, visual, and E2E campaigns were excluded from the review and execution.
The revised campaign has 25 unit files plus one real-Sphinx contract file.

## Campaign boundaries

| Command | Scope | External processes |
| --- | --- | --- |
| `npm run test:unit` | Pure logic, local filesystem, fake processes, fake-DOM runtime | None |
| `npm run test:contracts` | Sphinx HTML and source-diagnostic contract | Sphinx through `uv` |
| `npm test` | Compile, unit tests, Sphinx contracts | Sphinx through `uv` |

Run package commands through `fnm exec --` after compiling.
The standard extension check and release gate retain both non-browser campaigns.
The unit command does not require a trusted VS Code workspace or a configured PlantUML executable.

## Changes from the audit

- Queue tests use per-test fake clocks instead of polling the real event loop.
  Teardown disposes each queue even after assertion failures.
  Added cases cover debounce reset, pending cancellation, late completion, reuse, and disposal.
- Render-pipeline tests cover buffer identity, source diagnostics, trust gating, reduced mode,
  failure wrapping, and cancellation during a pending render.
  Each test restores its renderer override through test-context teardown.
- Frontmatter configuration now has default and independent-option coverage.
  Schema validation fixtures exercise enum, UUID-format, and constant violations separately.
  The reference fixture now genuinely exercises an extensionless reference fallback.
- Renderer feature assertions require the expected semantic element before checking its text.
  Finding the text elsewhere in the document can no longer hide a missing heading or code block.
- Properties-table fields use a factory that returns fresh defaults and arrays on each call.
  Field-type classification lives with the frontmatter tests rather than table markup tests.
- Pure Markdown-table operations live in their own unit file.
  Fake-DOM tests retain table-toolbar wiring and save-message assertions.
- Webview tests reject stale document versions, render requests, and invalid source lines.
  Frame flushing is bounded, and the script-injection test uses hostile input rather than
  checking for internal implementation tokens.
- Security fixtures no longer substitute a regular file when symlink creation fails.
  A failed fixture setup cannot masquerade as a successful security test.

## Coverage measurement

Node's native coverage was restricted to loaded compiled production modules under `out/src`.
Test helpers and dependencies were excluded from the percentages.

| Measurement | Baseline | Revised units |
| --- | --- | --- |
| Passing cases, including subtests | 195 | 209 |
| Loaded production line coverage | 92.48% | 93.38% |
| Loaded production branch coverage | 81.64% | 81.95% |
| Loaded production function coverage | 87.25% | 88.84% |
| Queue line coverage | 68.83% | 82.14% |
| Render-pipeline line coverage | 76.47% | 90.91% |

The baseline included two real-Sphinx cases; revised unit measurements exclude them.
The separate contract campaign passes both cases.
These are campaign measurements, not directly comparable whole-extension coverage scores.

Saved local reports are written under `out/reports/unit/`; they are ignored generated artifacts.
To reproduce the unit-only report from the extension directory:

```bash
fnm exec -- npm run compile
fnm exec -- node --test --experimental-test-coverage \
  --test-coverage-include='**/out/src/**' \
  out/test/security/*.test.js out/test/build/*.test.js \
  out/test/configuration/*.test.js out/test/frontmatter/*.test.js \
  out/test/mapping/*.test.js out/test/navigation/*.test.js \
  out/test/rendering/*.test.js out/test/state/*.test.js out/test/webview/*.test.js
```

## Balance and remaining gaps

Related assertions at different layers are intentional when they catch different failures.
For example, table logic tests protect edit invariants; fake-DOM tests protect toolbar wiring.
Resource-policy tests protect path decisions; sanitizer tests protect their application to HTML.
Schema tests protect classification and validation; table tests protect escaped display metadata.

Most filesystem tests already use private temporary roots and `finally` or teardown cleanup.
Process-spawner overrides are restored after each case; unit files execute in isolated Node workers.
Tests that mutate module-level hooks remain sequential within their file.
Do not enable same-file concurrency for those tests without replacing the shared hooks.

The coverage reporter omits production modules that the unit campaign never loads.
VS Code host orchestration, webview assembly, and the browser Mermaid entry point therefore remain
outside this measurement; their existing integration/browser tests were not audited here.
Generated webview script strings and CSS literals also inflate line coverage.
Runtime message assertions and semantic markup checks carry more evidence than those percentages.

Some defensive I/O, malformed-schema, and process-error branches remain uncovered.
Static CSS checks protect authored style contracts, not rendered layout or real browser geometry.
The campaign provides substantial unit-level coverage but does not establish complete UI coverage.
