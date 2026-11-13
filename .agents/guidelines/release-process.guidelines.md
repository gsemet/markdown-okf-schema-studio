# Release process guidelines

The mechanics of a release (version commit, changelog heading, CI tag, Marketplace publication)
are in "How to Release" in [CONTRIBUTING.md](../../CONTRIBUTING.md). This guideline covers the
steps of a release and what the owner reviews in the version pull request: the release notes, the
announcement thread and the hero image, in `docs/releases-notes/<date>-vX.Y.Z/`. The merge of
that pull request publishes everything; after it the release is only monitored. The model is
release 1.2.0.

The goal: the owner says "release X", and the release is almost guaranteed before the version
commit exists. 1.3.0 and 1.3.1 were never tagged because the version push was the first real VS Code
run of their code. So the version commit lands only after a green heavy run of the exact code it
releases. That happens in one of two ways:

- the default: the stack lands on `main` first, then the heavy run of `main` HEAD;
- the version PR on top of a ready stack, with the heavy run dispatched on the top branch (see "The
  version PR on top of a stack" below).

## Rules of a release

- **Merge rights**: the fix PRs of the release may be merged on the owner's standing permission for
  release work. The owner merges the version PR and, when it tops a
  stack, the whole stack with it. Nothing else is merged, auto-merge is never
  enabled, and no PR outside the release is touched.
- **Nothing is asked of the owner** between the notes review and the publication, except a real
  blocker: a product decision is needed, or a fix cannot be completed. The release then stops with
  the question and its recommended answer.
- **After the merge** the run is monitored. On a red job the failed jobs are re-run once; if a job
  fails again, the release stops and calls the owner with its diagnosis.

## The release folder

What the owner reviews is committed with the version, in `docs/releases-notes/YYYY-MM-DD-vX.Y.Z/`,
named by the date of the pull request (the date may differ from the tag's; nothing checks it):

| File | Content |
| --- | --- |
| `release-notes.md` | The GitHub release notes, with relative image links |
| `tweet.md` | The announcement thread, three posts |
| Images | The images of the notes and the thread, directly in the folder |

## The steps of a release

1. The owner says "release X". The version number is agreed with the owner.
2. The stack of the release lands on `main` first (or the version PR tops it: see "The version PR
   on top of a stack"). Every PR with a `feat` or `fix` commit adds one user-facing line to
   `CHANGELOG.md` `## Unreleased`, in that PR, appended at the end of the list; a rebase conflict
   on that block keeps both lines. PRs that are only `test`, `ci`, `build`, `docs` or `chore` add
   no line and tick the template checkbox with "No user-facing change". A `feat` or `fix` PR that
   landed without its line is a gap of that PR: a fix PR adds the line before the version commit.
   The version commit only moves the lines under the version heading. Once the stack is merged
   (or, in the stacked way, from the dispatch of the branch heavy run), every other merge is held
   until the release is published, and no work on a new change starts until then.
3. The notes and the thread are drafted from `CHANGELOG.md` `## Unreleased` and the reports of the
   changes, in `docs/releases-notes/`. They go in the version PR.
4. The last merge of the stack started the heavy run on `main` HEAD. Wait for
   `integration` and `stress` to be green on that exact commit, and read the result of each job:
   a red `stress` does not turn this run red.

   ```bash
   gh run list --workflow ci.yml --branch main --limit 3
   gh run watch <run-id>
   gh run view <run-id> --json jobs --jq '.jobs[] | select(.name == "integration" or .name == "stress") | "\(.name) \(.conclusion)"'
   ```

   Check that the run's `headSha` is the current `main` HEAD; a merge since then starts the step
   again. In the stacked way, the run is the one of the top branch: see "The version PR on top of a
   stack". A red job is fixed with a fix PR, which is merged, and the run of the new HEAD is
   awaited. A flake: re-run once (`gh run rerun <run-id> --failed`); if it fails again, treat it as
   red.
5. **Only then** the version commit: `just bump-version`, the changelog heading, the version pull
   request (notes folder and version commit in one `chore: version X.Y.Z` commit, body following
   `.github/PULL_REQUEST_TEMPLATE.md`; see "How to Release" in CONTRIBUTING.md). `just check` fails
   without valid notes, so the PR cannot merge without them. The owner reviews the folder in the
   PR and merges it by rebase, the only merge method of the repository. The PR body also shows the
   notes and the thread themselves (see "The version PR body" below). The heavy run of the
   version push (CI rule 14) stays the final gate. When the version PR tops a ready stack, the
   version commit is made on the top branch: see "The version PR on top of a stack".
   If the local `just preflight` stops at `ci-integration` because the screen is locked, do not
   wait: dispatch `gh workflow run ci.yml --ref <branch> -f heavy=true` at once on the release branch
   and go on; its `integration` job is the real-window proof.
6. The version push is monitored through the tag, the GitHub release with its notes and images, the
   Marketplace publication and Pages, recovering a red heavy job as in "After the merge" above.
   The Marketplace check that counts is an HTTP 200 on
   `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/GaetanSemet/vsextensions/markdown-okf-schema-studio/X.Y.Z/vspackage`
   (for example `curl -sS -o /dev/null -w '%{http_code}' -L <url>`). The listing page is not
   checked. The listing page can lag by several minutes (more than 3 seen in 1.7.1); it is not a
   gate.
   The publication uses the Marketplace Trusted Publishing policy "Release workflow" (no stored
   token). A failed OIDC exchange is recovered as in "Recovery and Release Notes" of
   CONTRIBUTING.md. The owner deletes `VSCE_PAT` once a release published with `--oidc` has
   succeeded.
7. The release is archived with a `04-report.md` in the release CR's folder, next to `01-intent.md`,
   `02-answers.md` and `03-change-spec.md` (a subagent cannot write some Markdown names, such as
   `report.md`, but a numbered name works): tag, release URL, CI runs (heavy run on `main`,
   version push), and the issues the release closed (from the PRs' closing references,
   `gh pr view <n> --json closingIssuesReferences`, and the `issue:` lines of the changes). A
   `retro.md` next to it lists what cost time in the release, its root cause and the process fix.
8. The agent that talks to the owner drafts "Released in
   https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/vX.Y.Z" for each listed issue,
   gets one owner approval for the whole list, posts each with `gh issue comment`, and reads the
   comments back. This comes after the publication, so it does not break the rule that nothing is
   asked of the owner between the notes review and the publication. No issue closed by this
   release: write that line in `04-report.md`; the step ends, no approval is asked.

Between the notes review (step 5) and the publication, the owner is asked nothing, except a real
blocker: a product decision is needed, or a fix cannot be completed.

## The version PR on top of a stack

The version PR may be the top PR of a stack that is ready to merge:

1. The stack's bottom is based on the current `origin/main` HEAD. Every PR below the version PR is
   ready (CI green, review done). The version commit (`just bump-version`, changelog heading, notes
   folder) is made on the top branch, so Commitizen sees the commits of the stack.
2. From here until the release is published, every other merge is held.
3. Dispatch the heavy run on the top branch:
   `gh workflow run ci.yml --ref <top-branch> -f heavy=true`. Find it with
   `gh run list --workflow ci.yml --branch <top-branch> --event workflow_dispatch --limit 3`. Then
   use the `gh run watch` and `gh run view ... --jq` commands of step 4, reading the result of each
   of `integration` and `stress`. The run's `headSha` must be the top branch's head; a push to any
   PR of the stack starts this step again. Red jobs and flakes are handled as in step 4.
4. Only then the version PR is marked ready. The owner merges the whole stack by rebase, bottom up,
   in order (`gh stack merge <version PR> --rebase`, see
   [stacked-prs.guidelines.md](stacked-prs.guidelines.md)).
5. The version push on `main` runs the heavy jobs again (CI rule 14). It stays the final gate and
   makes the tag. Steps 6 to 8 follow as usual.

## The version PR body

The owner reads the notes and the thread in the version PR page, not only in its diff. After the
sections of `.github/PULL_REQUEST_TEMPLATE.md`, the body carries, each part opened by a `---` rule
and a heading:

1. `---`, then `# 📰 Release notes (rendered)`, then the content of `release-notes.md`;
2. `---`, then `# 🐦 Announcement thread (rendered)`, then the content of `tweet.md`.

The committed files keep their relative image links (the release check requires them); only the
copy in the body points to the images at the PR head. The images are in Git LFS, so the links use
`media.githubusercontent.com` (a `raw.githubusercontent.com` link shows the LFS pointer, not the
picture). `body-sections.md` holds the template sections without the closing attribution line,
which ends the body after the thread:

```bash
dir=docs/releases-notes/<date>-vX.Y.Z
base="https://media.githubusercontent.com/media/gsemet/markdown-okf-schema-studio/$(git rev-parse HEAD)/$dir"
rewrite() { sed -E -e "s#(\]\(|src=\")([^/\":)]+\.(png|jpe?g|gif))#\1$base/\2#g" \
                     -e "s#^Image: ([^ /]+\.(png|jpe?g|gif))\$#Image: ![\1]($base/\1)#" "$1"; }
{ cat body-sections.md
  printf '\n---\n\n# 📰 Release notes (rendered)\n\n'; rewrite "$dir/release-notes.md"
  printf '\n---\n\n# 🐦 Announcement thread (rendered)\n\n'; rewrite "$dir/tweet.md"
  printf '\n---\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n'
} > pr-body.md
gh pr edit <n> --body-file pr-body.md
```

The owner gives remarks on the delivered files, `release-notes.md` and `tweet.md`, as review
comments in the PR diff (or edits them directly). The agent running the release applies them in
the files, amends the version commit, and regenerates the body from the files at the new head, so
the body never differs from what is committed.

## Release notes

Write for a user of the extension, from the changelog lines: no CR numbers, no requirement IDs,
no internal terms (agent roles, change request numbers, rounds). Structure, in this order:

1. **Header**, centred:
   - `<h1 align="center">Markdown OKF-Schema Studio X.Y</h1>`;
   - one bold line naming the two or three headline changes, as verbs
     ("Decide in the page, review as a side-by-side diff, drop files as links.");
   - one `<sub>` line: `N changes since X.Y'.Z' · VS Code 1.95 or later · MIT`, where N counts
     the commits of `vPREVIOUS..vX.Y.Z^` without merges and without the `chore: version` commits
     of unpublished versions (for 1.3.2: without the unpublished 1.3.0 and 1.3.1 version commits):
     `git rev-list --no-merges --grep='^chore: version' --invert-grep --count vPREVIOUS..vX.Y.Z^`.
2. **Links**, centred, one line: Install from the Marketplace · Read the guide · Full changelog
   (`blob/vX.Y.Z/CHANGELOG.md`) · 1.0 showcase. Then a `---` rule.
3. **Two to four highlight sections**, `## <emoji> <what the reader can now do>`. Each one says
   what changes for the reader in a short paragraph; adds a short Markdown example when the
   feature is a syntax; shows one picture, or a light and dark pair in a two-column table with a
   caption row; and ends with one sentence on why it matters.
4. **`## 🛠 Smoother editing`**: the smaller visible changes, one bullet each, with a bold lead.
5. **Folded sections**: `<details><summary><b>🐞 All fixes</b></summary>` with the remaining
   fixes, one line each, and `<details><summary><b>🛠 For contributors</b></summary>` with the
   tooling changes and any known issue.

Keyboard keys use `<kbd>`. Every changelog line of the release appears once, in a highlight, in
"Smoother editing" or in "All fixes".

### Images

Images sit directly in the notes folder, next to `release-notes.md`, and the notes link them by file
name. An image at an absolute URL or in a subfolder fails the check: a release must depend on no
branch. The release attaches them as assets and points the links to
`https://github.com/gsemet/markdown-okf-schema-studio/releases/download/vX.Y.Z/<file>`.

### Publishing

CI publishes the reviewed file as it is, with `scripts/release_notes.py --prepare`, before the
Marketplace publication. A typo found afterwards is fixed by editing the release on GitHub: the
published text may then differ from the file, and that is accepted.

## Announcement thread

Three posts on X, in `tweet.md` of the notes folder, each under a `## 1/`, `## 2/`, `## 3/` heading,
followed by an `Image:` line with the file name of its picture when it has one. Only the owner posts.

1. **The story** (may be long; X shows "Show more" past 280 characters). Written in the first
   person, as one would tell a colleague: start from a concrete moment of work with a coding agent
   that the release improves, then say what is different now. Name at most three changes, in
   plain words, not a feature list. One picture: the hero image.
2. **The release notes**: one sentence that invites to read the details, and the GitHub release
   URL (`https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/vX.Y.Z`).
3. **The install link**: one sentence (install or update, free, MIT), and the Marketplace URL
   (`https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio`).

Tone: organic. No "excited to announce", "game changer", "supercharge" or other launch words; at
most two emoji in the whole thread; no hashtag list (one is fine when it is the natural word).
Read each post aloud: it should sound like a person, not a press release.

## Hero image

A hero image is recommended for a minor or major release, not required: an existing capture is
enough for a small one. It serves post 1 and the first highlight of the notes. A dedicated one is a
simulated visual scenario, so it is reproducible and checked:

- fixture `test/visual/fixtures/<NN>-release-<x>-<y>-showcase.md`, scenario
  `rendering-core/v<NN>-release-<x>-<y>-showcase-cream-1200` in
  `test/visual/releaseShowcaseScenarios.ts`, with assertions on what the picture must show;
- an entry in `README_BY_ID` (`test/visual/scenarioIds.ts`), so
  `uv run --group docs python scripts/generate-readme-images.py --visual-only` writes
  `images/readme/release-<x>-<y>-showcase.png` after `just visual`.

What the picture shows:

- a document an agent would really write (a plan, a design note, a review), with real sentences:
  never "A paragraph before the admonition" or lorem ipsum;
- the headline change of the release in action (an open form, a list at the caret, a rendered
  block), with one or two rendered blocks around it that show the page is beautiful;
- the Cream theme at 1200 px, toolbar collapsed, cropped to a landscape frame between 16:9 and
  4:3, readable at the size of a post in a timeline.
