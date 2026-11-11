# Pull request guidelines

How a pull request is written and delivered. The template is `.github/PULL_REQUEST_TEMPLATE.md`
(rule 10 of [ci.guidelines.md](ci.guidelines.md)); this guideline covers what goes in it. These
rules hold whoever opens the pull request.

## PR body for an external reader

The PR is read by people outside the agent session: reviewers, stakeholders, future maintainers.
They do not know the backlog, the CR numbers or the plan files, and `.agents/changes/` is not
even in git.

- Explain the change from the reader's side: what was wrong or missing, what the PR changes, what
  they will notice. Name features by what they do ("incoming-changes bars", "Restricted Mode
  window"), not by internal ids.
- No internal references in the body text: no CR numbers (`CR 043`), backlog or plan ids (`P9`,
  `T2`, `B5`, `F`), task or round numbers, scenario ids, agent roles, or paths under
  `.agents/changes/`. Define any project term the reader needs on first use.
- If a reference helps the maintainers, put it in one last section, "Internal references", just
  before the Claude Code line.
- The title follows the same rule: a Conventional Commit subject that says what changes.
- Update the body whenever the scope changes (re-scope, dropped item, follow-up); it describes
  the PR as it is now, not its history.
- Add a "Deliverables" section right after Summary: what the reader gets, shown with one or
  more small visuals, each placed next to the one or two sentences it supports. Use one, sometimes several, rarely every kind.
  Keep only the calls, files, props and boundaries the reviewer needs, with real names checked
  against the code:
  - a Mermaid `flowchart` of the modules or layers that change, arrows for the calls or allowed
    imports (about 10 nodes at most);
  - a Mermaid `sequenceDiagram` of one real flow (an edit, a message, a write), before and after
    when the order is the fix;
  - a before/after tree or table (files moved or split, sizes, settings);
  - screenshots before/after for UI changes
  - a short code sketch (5 to 15 lines) of the new interface, message or registration that a
    contributor will reuse, with `...` for the rest.
  A one-line fix may skip the section; a structural change never does.
- Impacts holds the evidence of the change: the before/after the Verifier produced (screenshots,
  see "Screenshots in the PR"), or one line "No visual change" with the reason. Impacts never stays
  at the template's comment; the Verifier fails a body whose Impacts has neither.
- A decision an agent took without the user is listed in the PR body under "Autonomous decisions".

## Draft until mergeable

A pull request is a draft until it is mergeable.

- Open it with `gh pr create --draft`.
- Mark it ready with `gh pr ready <n>` only when CI is green at its head, the review is approved,
  the Verifier's verdict at that head is `Verdict: VERIFIED` and `ready` is reported.
- When a CR goes back for a new round, put it back to draft with `gh pr ready <n> --undo`.
- In a stack, each PR turns ready on its own, as soon as it is mergeable, without waiting for the
  rest of the stack.
- The release version PR and its fix PRs follow
  [release-process.guidelines.md](release-process.guidelines.md).

## GitHub issues

When a change comes from a GitHub issue, the issue number is on the `issue:` line of the change's
intent.

- The Summary of the PR body ends with `Fixes #N`, one line per issue. This is a closing keyword,
  not an internal reference. GitHub closes the issue when the PR merges; never run `gh issue close`.
- Only the agent that talks to the owner posts on an issue, and only text the owner approved:
  `gh issue comment <n> --body-file <file>`.
- The plan and the demo attach with `gh issue artifact create <n> <file> --type plan` and
  `--type embedded_html`. File names have no colon.
- After posting, read back the comment URL and the artifact list.

## Merging

Only the owner merges a pull request; no agent enables auto-merge. The one exception is the fix PRs
of a release, which may be merged on the owner's standing permission (see
[release-process.guidelines.md](release-process.guidelines.md)).

## Screenshots in the PR

The Verifier takes them (before on a detached worktree of the base, after at the pushed head) from
the e2e/visual run, light and dark when themes matter, and leaves them in
`work/verifier/evidence/`; the agent that opens the PR pushes them as follows. Push them as raw
blobs to a side branch (bypasses Git LFS) and link the raw URLs (`<id>` is the change number and
`<slug>` its short name):

```bash
tree=$(for f in shots/*.png; do
  printf '100644 blob %s\t%s\n' "$(git hash-object -w --no-filters "$f")" "$(basename "$f")"
done | git mktree)
commit=$(git commit-tree "$tree" -m "change <id> screenshots")
git push origin "${commit}:refs/heads/change-requests/<id>-<slug>-assets"  # braces: zsh reads $commit:r as a modifier
# URL: https://raw.githubusercontent.com/<owner>/<repo>/${commit}/<name>.png
```

The screenshot branch is named after the change branch, with `-assets` added: the change branch
`change-requests/042-docs-stacked-prs` has the screenshot branch
`change-requests/042-docs-stacked-prs-assets`. Keep it after merge: the PR body points at it.
Landing removes the change branch only. Older PRs use `pr-assets/<n>` branches: keep them, their PR
bodies point at them.

Whoever opens the PR puts the links in Impacts with `gh pr edit <n> --body-file <file>`, then runs
the verification step again if the body check had failed.
