# Source Mapping Feasibility Gate

## Decision

**GO for Task 03 after independent inspector repair.** Preview HTML carries real, one-based source
positions for visible blocks from the active Markdown document. The editor and preview use the same
document identity, staged-source origin map, ordered block metadata, and document version/request
identity. Mapping is deliberately preview-only; ordinary Sphinx output remains unchanged.

The initial inspector verdict was `REWORK`: an old Webview stage could send a message after the
active editor changed, and the host-side scroll suppression controller was not on the production
path. The repair adds active panel/stage identity checks, wires suppression into editor reveal,
and adds an extension-host transition regression.

This gate proves stable block/line synchronization rather than pixel equality. The preview uses
proportional interpolation between mapped blocks, preserves the leading viewport position during
layout changes, and clamps targets to the available scroll range. No fabricated source locations
are emitted for generated, included, hidden, invalid, or stale content.

## Mapping Contract

The preview Sphinx extension emits `data-sphinx-*` attributes only when `SPHINX_PREVIEW_MODE=1`
or the equivalent Sphinx config flag is active and the builder is HTML. Each mapped element carries
the active document identity, the original source file, a positive one-based source line, and an
ordered block ID. The extension receives staged-to-original `sourceOrigins` from the isolated
build, so a staged path is never treated as an editor path by accident.

The existing draft banner records its inserted line count in the Sphinx environment. Mapping
subtracts that count only for the active staged source. The fixture's four-line banner therefore
leaves original body mappings at their original lines; the measured source-line drift is zero.

The webview parser keeps DOM order for active-document blocks and rejects mismatched document IDs,
other source files, non-positive lines, malformed lines, and originless blocks. The host accepts
messages only when the message belongs to the active panel, the active document matches the current
stage, and document identity, document version, and build request ID all match that stage.
Preview-to-editor reveals are limited to the active original file.

## Fixtures and Coverage

| Fixture | Evidence |
| --- | --- |
| `sphinx/tests/fixtures/sphinx-preview-mapping/` | Heading, paragraph, list, note, figure, code, visible and hidden `{only}`, include, and a generated draft banner. |
| `test/integration/fixtures/preview.md` | Real project Sphinx configuration, admonition, math, figure, dirty-buffer render, and active-document identity. |
| `test/mapping/sourceMapping.test.ts` | Active-file filtering, DOM-order preservation, Windows path normalization, and document identity. |
| `test/page/runtime.test.ts` | Top/middle/end interpolation, bounded source targets, stale versions, alternating scroll, echo suppression, and execution of the generated runtime against a fake DOM. |

The source fixture proves that included content still renders but has no active-document mapping.
The visible HTML-only block is mapped, while the LaTeX-only block is absent from HTML. The HTML
integration test proves that real Sphinx output contains the source metadata and the injected
nonce-bearing synchronization runtime. The trusted extension-host test also exercises
editor-to-preview dispatch, preview-scroll reveal, click reveal, double-click reveal, stale request
rejection, and rejection of an old-stage reveal during an active-document switch.

## Synchronization Behavior

The scroll anchoring rules are specified in [scroll-anchoring.md](scroll-anchoring.md).

- Editor-to-preview uses the first visible editor line as a source-line anchor and draws it on the
  preview's reading line, below the sticky heading band.
- Preview-to-editor reports the fractional source line under the reading line, using per-line
  positions inside long paragraphs, and reveals the active editor only after identity/version/request
  validation.
- Each render receives the stored anchor and applies it before the first paint, without a
  preview-ready scroll round trip.
- The webview ignores its own programmatic scrolls. The host suppresses editor echoes with a guard
  keyed by document, so re-renders do not reset it. The webview coalesces rapid source-scroll
  messages on the next animation frame.
- Image `load`/`decode`, body `ResizeObserver`, window resize, and visual-viewport resize all
  remeasure the mapped layout and reapply the stored source-line anchor.
- Preview scroll events are sampled with `requestAnimationFrame`, preventing repeated messages from
  producing an editor-preview feedback loop.

## Commands and Results

Python checks were run from the repository root; Node checks were run from
the standalone repository root with Node 24 selected by `fnm`.

| Command | Result |
| --- | --- |
| `uv run --no-sync --group docs pytest sphinx/tests/test_sphinx_preview_mapping.py` | Pass; 4 tests. |
| `fnm exec -- npm run compile` | Pass; TypeScript compiles. |
| `fnm exec -- npm run test:unit` | Pass; 29 tests, including generated-runtime execution. |
| `fnm exec -- npm run test:integration` | Pass; trusted and untrusted VS Code extension hosts, including the real Sphinx mapping check and active-editor transition regression. |
| `just check-justfile` | Pass. |
| `just book-check` | Pass; diagrams, glossary, bibliography, and animation checks. |
| `uv run pytest` | The four Task 03 mapping tests pass; the repository run has 9 unrelated failures in `src/sphinx_animation/` and 11 passes overall. |

The final extension-host campaign measured approximately 728 ms initial render, 624 ms normal
edit render, and a deliberate 500 ms obsolete-build delay. Those
values include staging and a real Sphinx process and are not synchronization latency guarantees.

## Unmappable and Non-HTML Cases

The following remain intentionally non-navigable:

- generated draft-banner nodes and nodes whose source line becomes less than one after compensation;
- included or generated blocks whose origin is not the active original Markdown file;
- malformed, zero, negative, or missing source lines;
- blocks from a different document identity or a different source file;
- normal HTML builds without preview mode and non-HTML builders such as `singlehtml`.

For these cases the preview remains rendered, but no source target is fabricated. A click on an
unmapped block is inert because the runtime selects only elements with validated mapping attributes.

## Gate Outcome

The exact fixture checks show zero source-line drift after banner compensation. Unit interpolation
checks remain bounded at the top, middle, and end of a long ordered block sequence. The executable
runtime harness covers source scroll, preview scroll, rapid replacement, image load, window resize,
visual-viewport resize, body resize observation, click/double-click reveal, and stale document
rejection. The focused pytest, TypeScript unit, repository, and isolated extension-host checks pass.
The full repository pytest run remains red only in unrelated animation tests. Task 03 is therefore
**GO**; later tasks remain outside this change.
