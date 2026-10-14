# Dirty Snapshot Feasibility Gate

## Decision

**GO for Task 02.** An unsaved active Markdown buffer renders through the repository's authentic
Sphinx/MyST HTML configuration in isolated temporary directories. The source file and production
build tree remain unchanged. Obsolete work is canceled or discarded, Sphinx failures are visible
with source-file diagnostics, referenced local files refresh even when they are closed, and a
successful result remains visibly stale until the next valid build.

This decision covers the active dirty snapshot and isolated-build gate only. Source mapping,
scroll synchronization, and the later interaction gates remain separate tasks.

## Commands and Results

Commands were run from the standalone repository root with Node 24 selected by `fnm`.

| Command | Result |
| --- | --- |
| `fnm exec -- npm run compile` | Pass |
| `fnm exec -- npm run test:unit` | Pass; 21 tests |
| `fnm exec -- npm run test:integration` | Pass; trusted and untrusted VS Code hosts |
| `fnm exec -- npm run package` | Pass; 48-file VSIX |
| `just check-justfile` | Pass |
| `just book-check` | Pass; diagrams, glossary, bibliography, and animation checks |

The integration command invokes the real repository configuration. The Sphinx process shape is:

```text
uv run --no-sync -- sphinx-build -W --keep-going -b html \
  -c <workspace>/sphinx -d <temporary-doctree> <temporary-source> <temporary-output>
```

The implementation contains no `book-prepare` invocation and does not use `_build/livereload/`
or production doctrees and output directories.

## Integration Evidence

The trusted extension-host test:

- renders an unsaved marker from the active editor without saving the fixture;
- renders local MyST admonition, math, and image content through Sphinx;
- follows a second open Markdown file and then follows the original active editor again;
- delays an obsolete build by 500 ms and proves a newer request ID is the displayed result;
- injects an unknown MyST directive, reports a `preview.md:<line>` diagnostic, and retains the
  prior successful HTML with a visible `Preview is stale` marker;
- recovers after the invalid directive is removed;
- edits a closed referenced include on disk and observes a newer request ID with updated rendered
  content through the workspace-bounded dependency watcher;
- updates the Webview's bounded local resource root for each new temporary output directory.

The untrusted extension-host test verifies that invoking the contributed command does not spawn a
process. Unit coverage separately verifies missing-input diagnostics, recursive input staging,
workspace trust before staging, process termination on abort, queue disposal, and result cleanup.
The missing-input diagnostic includes the source Markdown file and line. A direct real-Sphinx probe
also verified present and missing local includes without invoking a book-wide preparation step.

## Latency

The trusted integration run measured the following on the development machine:

| Run | Initial | Normal edit | Obsolete delay |
| --- | ---: | ---: | ---: |
| Independent inspector probe | 641 ms | 520 ms | 500 ms |
| Final extension-host rerun | 787 ms | 515 ms | 500 ms |

The first two values include the 50 ms preview debounce, temporary staging, and a real Sphinx
process. They are representative measurements for this fixture, not a performance guarantee for
all chapters or machines. The obsolete-build value is the deliberately injected delay, not a
latency target.

## Dependency and Integrity Evidence

The snapshotter stages the active buffer and only local inputs it references, preserving workspace
relative paths. An open referenced Markdown document is staged from its unsaved text. Existing
images and recursive includes are copied into the temporary source tree; missing inputs produce a
source-file and line-aware diagnostic instead of triggering regeneration or a book-wide build.
Canonical dependency matching plus a workspace-bounded file watcher refreshes present referenced
files, including closed includes, and tracks newly created or deleted paths already represented by
the snapshot.

The tests compare SHA-256 hashes before and after rendering for the active fixture and a recursive
hash of the production `_build/` tree. Both hashes remain identical. The active document is never
saved. Every temporary source, output, and doctree root is under `os.tmpdir()`. The current
successful stage remains available for Webview resources and is removed when replaced or disposed;
failed, canceled, and superseded stages are cleaned up immediately.

## Scope Boundary

This gate proves authentic unsaved rendering and isolated build behavior. It does not claim that
the later source-mapping, bidirectional scrolling, interaction parity, or release gates have
passed.
