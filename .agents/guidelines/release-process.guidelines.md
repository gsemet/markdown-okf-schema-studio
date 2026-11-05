# Release process guidelines

The mechanics of a release (version commit, changelog heading, CI tag, Marketplace publication)
are in "How to Release" in [CONTRIBUTING.md](../../CONTRIBUTING.md). This guideline covers the
steps of a release and what the owner reviews in the version pull request: the release notes, the
announcement thread and the hero image, in `docs/releases-notes/<date>-vX.Y.Z/`. The merge of
that pull request publishes everything; after it the release is only monitored. The model is
release 1.2.0.

The goal: the owner says "release X", and the release is almost guaranteed before the version
commit exists. 1.3.0 and 1.3.1 were never tagged because the version push was the first real VS Code
run of their code. The real VS Code jobs stay on `main`, so the version commit is never stacked on
top of development: the development lands first, then the release runs on its own.

## Rules of a release

- **Merge rights**: the fix PRs of the release may be merged on the owner's standing permission for
  release work. The owner merges the version PR. Nothing else is merged, auto-merge is never
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
2. The stack of the release lands on `main` first, with the changelog lines in its PRs, so they are
   in `main` before the heavy run. Once the stack is merged, every other merge is held until the
   release is published, and no work on a new change starts until then.
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
   again. A red job is fixed with a fix PR, which is merged, and the run of the new HEAD is
   awaited. A flake: re-run once (`gh run rerun <run-id> --failed`); if it fails again, treat it as
   red.
5. **Only then** the version commit: `just bump-version`, the changelog heading, the version pull
   request (notes folder and version commit in one `chore: version X.Y.Z` commit, body following
   `.github/PULL_REQUEST_TEMPLATE.md`; see "How to Release" in CONTRIBUTING.md). `just check` fails
   without valid notes, so the PR cannot merge without them. The owner reviews the folder in the
   PR and merges it by rebase, the only merge method of the repository. The heavy run of the
   version push (CI rule 14) stays the final gate.
6. The version push is monitored through the tag, the GitHub release with its notes and images, the
   Marketplace publication and Pages, recovering a red heavy job as in "After the merge" above.
7. The release is archived with a `report.md`: tag, release URL, CI runs (heavy run on `main`,
   version push).

Between the notes review (step 5) and the publication, the owner is asked nothing, except a real
blocker: a product decision is needed, or a fix cannot be completed.

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
