# Stacked PR guidelines

When several changes are in flight at the same time (for example a night run), their PRs ship as
one GitHub stack from the start, instead of independent PRs rebased on `main` after each merge.
Disjoint code is no reason to skip the stack: every change touches the requirements bundle
(`tiers/log.md`, the generated indexes), so independent PRs conflict as soon as one merges.

## How a stack works

Details: [about stacked PRs](https://docs.github.com/en/pull-requests/get-started/about-stacked-prs),
[CLI reference](https://docs.github.com/en/pull-requests/reference/stacked-prs-cli-commands).

- The bottom PR targets `main`; each PR above targets the branch of the PR below it. Each PR shows
  only its own diff and runs the same CI.
- Merges go bottom-up. Merging a PR merges every PR below it; after a merge, GitHub retargets the
  remaining PRs and rebases them automatically.
- `main`'s rules (required checks, reviews, linear history) apply to every PR of the stack and
  cannot be bypassed. A stacked PR is merged with `gh stack merge` (or the web UI), not
  `gh pr merge`.
- Commands (extension `gh extension install github/gh-stack`, gh 2.90+):
  `gh stack link --base main <PR bottom> … <PR top>` links existing PRs, `gh stack rebase` and
  `gh stack push` restack after a change, `gh stack merge <PR> --rebase` merges up to that PR.

## Order of a stack

Proposing a smart order (bottom to top):

1. A PR that another one depends on sits below it.
2. Small, low-risk, independent fixes at the bottom, so they can merge first and alone.
3. PRs touching the same files stay adjacent, to resolve each conflict once.
4. Large features above the fixes; test-harness and e2e PRs at the top.
5. A PR that is red or likely to need rework goes to the top, so it never blocks the others.

## Pushing and restacking

One agent owns all the stacked branches (it restacks and pushes); the agents that built each branch
stop pushing once their PR is in the stack. Changing a lower PR means restacking everything above
it. That agent pushes with `--force-with-lease`, opens each PR against the branch below, links them
with `gh stack link --base main …` and watches CI.

When a rebase conflicts on generated blocks of the requirements bundle, rerun
`just requirements-update` instead of hand-merging them.

## No auto-merge

No agent enables auto-merge. A PR with auto-merge cannot be linked into a stack and may merge a
branch the stack still holds back: the agent that owns the stack reports it, and only the owner
disables it or merges.
