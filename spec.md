# Spec: x-okf-link hardening (follow-up to 55e9184 / 8e1b66f)

## Goals

Remove synchronous filesystem walks and repeated schema compilation from the extension host,
fix lost frontmatter refreshes, tighten link containment, and reduce webview reloads.

## Requirements

### R1 — Filename-stem index (performance)
- `resolveFilenameStem` must not recursively walk the filesystem per link.
- Provide a `MarkdownStemIndex` (in `src/frontmatter/stemIndex.ts`) mapping stem → real paths,
  built once per root set, excluding `node_modules`, `.git`, `_build`, `.venv`, `out`, `dist`,
  `output`, and any hidden directory (`.`-prefixed).
- Index is invalidated per root on `.md` create/delete/rename (extension wires a
  `FileSystemWatcher('**/*.md')`); `fileLinks` accepts an optional index via
  `FileLinkInspectionOptions.stemIndex`; without one, a module-level cached index is used.
- Ambiguity / not-found / escape semantics (E10/W15) unchanged.

### R2 — Separate timers (correctness)
- `ActivePreview.frontmatterTimer` split into `frontmatterRefreshTimer` and `linkEnrichmentTimer`.
- `refreshFrontmatter` and `handleFrontmatterSave` analyze with `inspectLinks: false`, then
  schedule a debounced (150 ms) link-enrichment pass that updates the table only if the
  document version is unchanged.
- Dispose clears both timers.

### R3 — Ajv caching (performance)
- One shared Ajv instance (formats + `x-okf-link` keyword) used by `okfFrontmatter` and `fileLinks`.
- Compiled validators cached in a `WeakMap<object, ValidateFunction>` keyed by schema object;
  branch validators in `valueMatchesSchema` cached the same way (by expanded-branch identity
  keyed from the original branch object + root).

### R4 — Containment (security)
- `document-relative` targets must resolve inside the navigation roots (workspace folders, or
  the document directory in standalone mode). Setting
  `markdownOkfSchemaStudio.frontmatter.allowOutsideWorkspaceLinks` (boolean, default `false`)
  restores the old behaviour.
- Detected project root (`gitRoot`) is ignored when it is not inside a workspace root
  (explicit `projectRoot` setting still wins).
- Link tooltips show a workspace-relative path, never an absolute one.

### R5 — Click path reuse
- On `okf-link:` click, reuse `preview.frontmatter.linkResults` when it was computed with
  links resolved for the current document version; otherwise re-analyze.
- Target file read for marker lookup uses `vscode.workspace.fs.readFile` (async).

### R6 — Rendering cost
- List preview capped at 50 items with `+ N more` (constant `MAX_LIST_ITEMS`).
- Sticky-heading convergence loop capped at 3 passes.
- `formatListValue` must not fall back to matching links by `arrayIndex` alone.

### R7 — Schema traversal
- `oneOf`: annotations collected only when exactly one branch matches.
- Traverse `if`/`then`/`else` (then when `if` matches, else otherwise), `patternProperties`,
  and `additionalProperties` (for keys not covered by `properties`/`patternProperties`).

### R8 — Hygiene
- Remove `valueIdentity` field. Fix `justfile` indentation of `implementation-loop.svg`.
  Trailing newline in `fileLinks.ts`.

## Out of scope
- Replacing full-HTML reassignment with postMessage patching (tracked separately; large change).

## Acceptance
- `npm test` and `npm run test:integration` pass from the repository root.
- New unit tests: stem index exclusions + invalidation, document-relative escape blocked /
  allowed by setting, oneOf exactly-one, if/then/else + patternProperties traversal,
  list cap, validator cache reuse (same function instance), separate timers (integration or unit).
- `just install-vsix` succeeds.
