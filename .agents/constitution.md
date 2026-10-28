# Constitution

The rules every change to this project follows, whoever makes it (a person, an agent or a
sub-agent). They rank above `AGENTS.md`, the guidelines and the skills. Each rule links to the
guideline that gives the details. A rule changes only by a pull request the maintainer approves.

`AGENTS.md` covers how to set up, build and run the project; this file covers what a change must
respect.

## 1. Product contract: requirements anchored to the code

- The requirements in `requirements/` (okfreq, StRS and SwRS) describe what the extension does
  today, checked against the source and the tests. Never the desired state.
- The anchor is the marker pair: `@implements_req <SwRS-ID>` at the code that produces the
  behaviour, `@tests_req <SwRS-ID>` in the test that checks it. When marked code or tests move, the
  markers move in the same commit.
- A known bug is specified as it behaves ("Known issue: …") and its fix goes to the backlog. The
  fix changes the code, the test and the SwRS in the same change.
- Every feature or fix updates its SwRS or creates one with `okfreq new`. IDs are never reused or
  hand-allocated; generated fields and index blocks are never hand-edited.

Details: [requirements/guidelines/requirements.guidelines.md](../requirements/guidelines/requirements.guidelines.md).

## 2. Architecture

- `src/` is layered; a layer imports only the layers below it, and only `src/host-vscode/` imports
  `vscode`. Never add a dependency-cruiser exception to make a new import pass: move the code or
  put the access behind a port. The exception list only shrinks.
- The file-size ratchet holds: at most 800 lines per file in `src/` and 1 500 in `test/`; the
  baseline of larger files only shrinks.

Details: "Architecture" in [CONTRIBUTING.md](../CONTRIBUTING.md).

## 3. Tests

- A behaviour change comes with a test that fails on the previous code.
- Never change an existing assertion's intent to make a change pass; say why when an assertion
  changes.

## 4. Delivery

- Stage explicit paths only. History is linear: rebase, never merge commits; force-push only with
  `--force-with-lease`, after a rebase.
- Commit messages follow
  [git-commit-message.guidelines.md](guidelines/git-commit-message.guidelines.md) (Conventional
  Commits, allowed scopes, `Assisted-by:` attribution, never a copied attribution).
- Pull requests follow `.github/PULL_REQUEST_TEMPLATE.md`, written for a reader outside the team.
  Only the maintainer decides a merge.
- A change is complete only when `just preflight` passes.

Details: [change-requests-lifecycle.guidelines.md](guidelines/change-requests-lifecycle.guidelines.md),
[ci.guidelines.md](guidelines/ci.guidelines.md).

## 5. Dependencies

- Dependencies come from the official PyPI and npm registries and are pinned by the lock files.
- An agent adds, upgrades or installs a dependency only when its task allows it.

## 6. The writing skill

- `skills/writing-for-markdown-okf-schema-studio/` is part of the product: a change to a rendered
  syntax updates it in the same pull request, and it stays self-contained (no link into the
  repository) and minimal. A test renders its examples, so it cannot drift.

Details: [writing-skill-maintenance.guideline.md](guidelines/writing-skill-maintenance.guideline.md).

## 7. Repository hygiene

- Repository content (code, comments, docs, commits, PRs) is in English.
- No reference from maintained source or tests back to the white-paper repository.
- Never commit `node_modules/`, `out/` or Python virtual-environment files.
