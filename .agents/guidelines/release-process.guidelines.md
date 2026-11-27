# Release process guidelines

The mechanics of a release (version commit, changelog heading, CI tag, Marketplace and Open VSX publication)
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
| Clips | The GIF and the MP4 of a feature clip, copied from `docs/demo-video/clips/<clip>/` into the folder (Git LFS stores one object for both copies) |

## The steps of a release

1. The owner says "release X". The version number is agreed with the owner.
2. The stack of the release lands on `main` first (or the version PR tops it: see "The version PR
   on top of a stack"). Every PR with a `feat` or `fix` commit adds one user-facing line to
   `CHANGELOG.md` `## Unreleased`, in that PR, appended at the end of the list and ending with its
   references, written as in "CHANGELOG line" of
   [pull-request.guidelines.md](pull-request.guidelines.md); a rebase conflict
   on that block keeps both lines. PRs that are only `test`, `ci`, `build`, `docs` or `chore` add
   no line and tick the template checkbox with "No user-facing change". A `feat` or `fix` PR that
   landed without its line is a gap of that PR: a fix PR adds the line before the version commit.
   The version commit only moves the lines under the version heading. Once the stack is merged
   (or, in the stacked way, from the dispatch of the branch heavy run), every other merge is held
   until the release is published, and no work on a new change starts until then.
3. The notes and the thread are drafted from `CHANGELOG.md` `## Unreleased` and the reports of the
   changes, in `docs/releases-notes/`. They go in the version PR, after the "Self-check" of
   "Release notes". A visible feature may get a feature
   clip ([feature-clip-process.guidelines.md](../../docs/demo-video/guidelines/feature-clip-process.guidelines.md)):
   the maintainer decides which feature gets one, and the clip is made in the change of the feature
   or right after it, before the version pull request, so it ships with the feature. Its GIF is the
   picture of that feature's highlight in `release-notes.md`, linked by file name, so the existing
   check of `scripts/release_notes.py` and the release's asset upload take it as they take a PNG. The
   release-note file in the repository keeps the GIF, never a video link.
4. The last merge of the stack started the heavy run on `main` HEAD. Wait for
   `integration`, every `acceptance` shard and `stress` to be green on that exact commit, and read
   the result of each job: a red `stress` does not turn this run red.

   ```bash
   gh run list --workflow ci.yml --branch main --limit 3
   gh run watch <run-id>
   gh run view <run-id> --json jobs --jq '.jobs[] | select(.name == "integration" or .name == "stress" or (.name | startswith("acceptance ("))) | "\(.name) \(.conclusion)"'
   ```

   Check that the run's `headSha` is the current `main` HEAD; a merge since then starts the step
   again. In the stacked way, the run is the one of the top branch: see "The version PR on top of a
   stack". A red job is fixed with a fix PR, which is merged, and the run of the new HEAD is
   awaited. A flake: re-run once (`gh run rerun <run-id> --failed`); if it fails again, treat it as
   red.
5. **Only then** the version commit: `just bump-version`, then `just changelog-refs` (adds the commit
   item to every line of `## Unreleased`), then the changelog heading, the version pull
   request (notes folder and version commit in one `chore: version X.Y.Z` commit, body following
   `.github/PULL_REQUEST_TEMPLATE.md`; see "How to Release" in CONTRIBUTING.md). `just check` fails
   without valid notes, so the PR cannot merge without them. The owner reviews the folder in the
   PR and merges it by rebase, the only merge method of the repository. The PR body also shows the
   notes and the thread themselves (see "The version PR body" below). The heavy run of the
   version push (CI rule 14) stays the final gate. When the version PR tops a ready stack, the
   version commit is made on the top branch: see "The version PR on top of a stack".
   The version commit carries no `Signed-off-by` trailer: amend it without `-s`.
   The SHA-1 of a line is known only once its commit is on `main`, and the release adds it in the
   version commit, so no follow-up commit on `main` is ever needed for it.
   If the local `just preflight` stops at `ci-integration` because the screen is locked, do not
   wait: dispatch `gh workflow run ci.yml --ref <branch> -f heavy=true` at once on the release branch
   and go on; its `integration` job and `acceptance` shards are the real-window proof.
6. The version push is monitored through the tag, the GitHub release with its notes and images,
   the Marketplace and Open VSX publications and Pages, recovering a red heavy job as in "After
   the merge" above. The version push dispatches a separate **Release VSIX** run (event
   `workflow_dispatch`, branch `main`, found with `gh run list --workflow release.yml --limit 3`);
   watch it with `gh run watch <run-id>`. Its Open VSX step must be green without a recovery
   dispatch; a recovery dispatch is still allowed, and its use is reported as a failure of the
   version-push path. After the release run, watch **both** registries for 10 to 15 minutes (poll
   about once a minute) until each serves the new version, and report each one's state (served,
   at which minute, or not served after 15 minutes). The checks of record, HTTP 200 each:
   - VS Code Marketplace:
     `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/GaetanSemet/vsextensions/markdown-okf-schema-studio/X.Y.Z/vspackage`
     (for example `curl -sS -o /dev/null -w '%{http_code}' -L <url>`). The listing page is not
     checked. The listing page can lag by several minutes (more than 3 seen in 1.7.1); it is not a
     gate.
   - Open VSX: `https://open-vsx.org/api/GaetanSemet/markdown-okf-schema-studio/X.Y.Z` (for
     example `curl -sS -o /dev/null -w '%{http_code}' <url>`). The extension page
     `https://open-vsx.org/extension/GaetanSemet/markdown-okf-schema-studio` is not a gate.

   A registry still not serving after 15 minutes: read the job log of its step. A red step is
   recovered as in "Recovery and Release Notes" of CONTRIBUTING.md; a green step whose version is
   not served yet is reported to the owner, not retried.
   The Marketplace publication uses the Marketplace Trusted Publishing policy "Release workflow"
   (no stored token). A failed OIDC exchange is recovered as in "Recovery and Release Notes" of
   CONTRIBUTING.md. The Open VSX publication uses the trusted publisher registered on
   open-vsx.org (no stored token). The owner deletes `VSCE_PAT` once a release published with
   `--oidc` has succeeded.
7. **Publish the clip** (owner only, for a release with a clip; after the GitHub release exists and
   the version is served):
   1. In the GitHub release editor, the owner drags `<clip>.mp4` (at most 10 MB) from the release
      folder into the release body at the clip's highlight, in place of its GIF line. GitHub plays
      only a video uploaded through its own interface, not a relative `.mp4` in the repository.
      `release-notes.md` in the repository is not changed: it keeps the GIF.
   2. The owner opens the published release page: the video plays at the highlight, and the
      highlight does not show both the video and the GIF.
   3. Post 1 of the announcement thread is posted with `<clip>.mp4` attached (its `Video:` line),
      with `poster.png` as the cover when X asks for one.

   The agent does not do this step.
8. The release is archived with a `04-report.md` in the release CR's folder, next to `01-intent.md`,
   `02-answers.md` and `03-change-spec.md` (a subagent cannot write some Markdown names, such as
   `report.md`, but a numbered name works): tag, release URL, CI runs (heavy run on `main`,
   version push), and the issues the release closed (from the PRs' closing references,
   `gh pr view <n> --json closingIssuesReferences`, and the `issue:` lines of the changes). A
   `retro.md` next to it lists what cost time in the release, its root cause and the process fix.
   For a release with a clip, `04-report.md` also records the clip's name and whether step 7 was
   done (the release body plays the MP4, post 1 carries it), as the owner reports it.
9. The agent that talks to the owner drafts "Released in
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
   Run `just changelog-refs origin/main --skip-missing` before the heading: the commits of the stack
   are not on `main` yet (and a rebase merge rewrites their SHA-1), so the stack's own lines ship
   without their commit item.
2. From here until the release is published, every other merge is held.
3. Dispatch the heavy run on the top branch:
   `gh workflow run ci.yml --ref <top-branch> -f heavy=true`. Find it with
   `gh run list --workflow ci.yml --branch <top-branch> --event workflow_dispatch --limit 3`. Then
   use the `gh run watch` and `gh run view ... --jq` commands of step 4, reading the result of each
   of `integration`, every `acceptance` shard and `stress`. The run's `headSha` must be the top
   branch's head; a push to any PR of the stack starts this step again. Red jobs and flakes are
   handled as in step 4.
4. Only then the version PR is marked ready. The owner merges the whole stack by rebase, bottom up,
   in order (`gh stack merge <version PR> --rebase`, see
   [stacked-prs.guidelines.md](stacked-prs.guidelines.md)).
5. The version push on `main` runs the heavy jobs again (CI rule 14). It stays the final gate and
   makes the tag. Steps 6 to 9 follow as usual.

## The version PR body

The owner reads the notes and the thread in the version PR page, not only in its diff. After the
sections of `.github/PULL_REQUEST_TEMPLATE.md`, the body carries, each part opened by a `---` rule
and a heading:

1. `---`, then `# 📰 Release notes (rendered)`, then the content of `release-notes.md`;
2. `---`, then `# 🐦 Announcement thread (rendered)`, then the content of `tweet.md`.

The committed files keep their relative image links (the release check requires them); only the
copy in the body points to the images at the PR head, and a `Video:` line of the thread links its MP4
the same way, so the owner can open it from the PR page (a GIF is already covered by the image
expression). The images are in Git LFS, so the links use
`media.githubusercontent.com` (a `raw.githubusercontent.com` link shows the LFS pointer, not the
picture). `body-sections.md` holds the template sections without the closing attribution line,
which ends the body after the thread:

```bash
dir=docs/releases-notes/<date>-vX.Y.Z
base="https://media.githubusercontent.com/media/gsemet/markdown-okf-schema-studio/$(git rev-parse HEAD)/$dir"
rewrite() { sed -E -e "s#(\]\(|src=\")([^/\":)]+\.(png|jpe?g|gif))#\1$base/\2#g" \
                     -e "s#^Image: ([^ /]+\.(png|jpe?g|gif))\$#Image: ![\1]($base/\1)#" \
                     -e "s#^Video: ([^ /]+\.mp4)\$#Video: [\1]($base/\1)#" "$1"; }
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

Write for a user of the extension, from the changelog lines. The notes show what the release
brings to the user in a few highlights, each with its picture; what the release is stays in the
folded sections.

### The kind

Decide the kind from what ships, before writing a line:

- **feature**: the user can do something they could not do before;
- **fix**: something that should have worked now works; nothing new;
- **restore**: it undoes a mistake of an earlier release (a revert, a behaviour put back);
- **breaking**: something the user relied on is removed or behaves differently and they must act;
- **internal**: nothing the user sees changes (tooling, tests, docs process).

The subtitle names the kind in its first words ("A bug-fix release: ...", "Restores ... that
1.12.0 broke", "A breaking release: ..."). Every highlight and line keeps that tone: a fix release
has no "you can now", a restore is never shown as new.

Several kinds: the subtitle names first the one that comes first in this order: breaking, feature,
restore, fix, internal. Each line keeps its own change's tone.

When the kind does not match the version agreed in step 1 of "The steps of a release" (a patch
whose content needs feature wording, a minor that ships only fixes), the notes take the tone of the
real kind and the version PR's body says the version is probably wrong and why. The owner decides;
the agent never changes the version itself.

### Writing

Write like a maintainer telling a colleague what changed. Use short, complete sentences, plain
verbs, and "you". Write for the user: no ticket numbers, no requirement IDs, no internal terms
(agent roles, change request numbers, rounds), no implementation.

The references at the end of a changelog line (commit, change request, pull request, issue) are
not copied into the notes.

- Each highlight is a heading that says the change in its kind's words, then at most two sentences,
  then the picture. Nothing comes under the picture, except the short Markdown example of a new
  syntax. The heading, by kind:
  - feature: what you can now do;
  - fix: "Fixed: <what works again>";
  - restore: what works again and, in one clause, that the earlier release broke it;
  - breaking: what changed and what you must do.
- Each smaller change and folded line is **one sentence** (no bold lead followed by a second
  sentence). A fix starts "Fixed:" and says what works now. A restore starts "Restored:" and owns
  the earlier release's mistake in one clause, with no apology and no blame. Say the consequence
  for the user, not the mechanism.
- **Bad news**: a removal, a change of behaviour the user relies on and a user-facing known issue
  each get a labelled line in the visible part, above the folded sections, starting `Removed:`,
  `Changed:` or `Known issue:`, one sentence, with what the user should do. Never only in a folded
  section, never inside a paragraph about something else, never softened ("streamlined",
  "simplified") when the truth is "removed".
- **Performance**: a performance gain the user can see is a highlight with figures (a time, a size,
  a count, before and after), estimated if need be and then said as an estimate; never only a
  folded line.
- Name a setting as a setting: "the setting `markdownOkfSchemaStudio.…`", with its default value and
  where to turn it on (the VS Code settings).
- The pictures follow "Images" below.

Never use: "Before:" or "Now:" labels; invented scenes; punchy fragments; praise words (seamless,
powerful, effortless, easily); a closing "why it matters" line. These constructions are banned too:

| Banned | Before | After |
| --- | --- | --- |
| A fix worded as a new ability | "You can now edit a block without losing your cursor." | "Fixed: the cursor stays in the block you are editing." |
| A restore shown as new | "New: paste whole blocks at once." | "Restored: pasting whole blocks, which 1.12.0 broke." |
| A closing "why it matters" line | "... This means you stay in the flow." | (line removed) |
| Mechanism instead of consequence | "The parser now debounces change events on the block node." | "Typing fast in a long block no longer freezes the editor." |
| Bad news softened or buried | "We streamlined the settings (the `legacy.view` option is gone) and ..." | "Removed: the setting `legacy.view`; the new view is the only one." |
| A sentence about a missing image | "No screenshot: this change has nothing to show." | (sentence removed) |
| Feature tone in a fix release | subtitle "Faster editing, smarter blocks" | subtitle "A bug-fix release: block editing works again" |

### Structure

In this order:

1. **Header**, centred:
   - `<h1 align="center">Markdown OKF-Schema Studio X.Y.Z</h1>` (the full version);
   - one bold line, the subtitle: the kind in its first words, then the two or three main changes in
     the kind's words, at most 16 words ("A bug-fix release: block editing works again");
   - one `<sub>` line: `N changes since X.Y'.Z' · VS Code 1.95 or later · MIT`, where N counts
     the commits of `vPREVIOUS..vX.Y.Z^` without merges and without the `chore: version` commits
     of unpublished versions (for 1.3.2: without the unpublished 1.3.0 and 1.3.1 version commits):
     `git rev-list --no-merges --grep='^chore: version' --invert-grep --count vPREVIOUS..vX.Y.Z^`.
2. **Links**, centred, one line:
   `[Install from VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio)`
   · `[Install from Open VSX](https://open-vsx.org/extension/GaetanSemet/markdown-okf-schema-studio)`
   · Read the guide · Full changelog (`blob/vX.Y.Z/CHANGELOG.md`) · 1.0 showcase. Then a `---`
   rule.
3. **Two to four highlight sections**, `## <emoji> <heading in the kind's words>`, each with at
   most two sentences, then one picture cropped on the change, following "Writing". A new syntax may
   add a short Markdown example under the picture.
4. **Smaller changes**: the smaller visible changes, one line per bullet, with a bold lead. Their
   heading is `## 🛠 Smoother editing` in a feature release; in a fix, restore or internal release
   it takes the kind's tone (`## 🛠 Other fixes` for a fix release). The `Removed:`, `Changed:` and
   `Known issue:` lines sit here or right above it, never only in a folded section.
5. **Folded sections**:
   - `<details><summary><b>🐞 All fixes</b></summary>` with the remaining fixes, one line each;
   - `<details><summary><b>🔎 Details</b></summary>` with how things work: keyboard, defaults,
     limits;
   - `<details><summary><b>🛠 For contributors</b></summary>` with the tooling changes and a known
     issue that only contributors meet (a user-facing known issue goes in the visible part).

Keyboard keys use `<kbd>`. Every changelog line of the release appears once, in a highlight, in
the smaller changes or in a folded section.

**Length**: a judgement, not a check. Subtitle at most 16 words; each smaller change or folded line
at most 20; each highlight's text at most 40 (heading included, picture excluded). The visible part
(above the first folded section, links and HTML tags not counted) at most 120 words for a fix,
restore or internal release and 250 for a feature or breaking one; a release of several kinds takes
the budget of the kind its subtitle names first. Over a budget, cut words, not facts: a fact that
does not fit moves to a folded line.

### Images

- Only a visible change (a fix too) gets a picture, one per change.
- Each still picture is cropped to the changed element: no toolbar, no empty margin, no unrelated
  content around it (for a change in a list, no floating toolbar or frontmatter table).
- A capture of a gesture (a drag, a hover) keeps the element and what the gesture acts on, not the
  blocks around it (the list and its handles, not the alerts below it).
- Size of a still picture: **900 to 1200 px wide, at most 600 px high**.
- When the change replaces a behaviour you can see, the picture puts the before and the after side
  by side in one image, and the text does not describe the before again.
- A joined before | after image crops both halves to the same region at the same scale.
- When the picture shows the whole change, the highlight has no sentence: its heading, then the
  picture.
- The alt text is the caption: one plain phrase on what the picture shows, and no caption line.
- No picture within these bounds: the notes say nothing about it (no "no screenshot" sentence), and
  the version PR's body names `no picture for <change>: <why>`.
- One exception: a feature clip's GIF is not cropped and is exempt from the sizes. It shows the
  whole filmed window, and the clip's one zoom on the result stands in for the crop. The other
  rules (the alt text, one picture per change) hold for it.

Images sit directly in the notes folder, next to `release-notes.md`, and the notes link them by file
name. The joined before | after image of a highlight is one file, made from the Verifier's before
and after captures of the merged changes, with any tool; the version PR says which. The captures are cropped as above (same region,
same scale for both halves) before they are joined. An image at an absolute URL or in a subfolder fails the check: a release must depend on no
branch. The release attaches them as assets and points the links to
`https://github.com/gsemet/markdown-okf-schema-studio/releases/download/vX.Y.Z/<file>`.

### Publishing

CI publishes the reviewed file as it is, with `scripts/release_notes.py --prepare`, before the
Marketplace and Open VSX publications. A typo found afterwards is fixed by editing the release on GitHub: the
published text may then differ from the file, and that is accepted.

### Self-check

Before the version PR is opened, and again before its body is regenerated after review remarks, the
agent answers each question yes or no and fixes each "no":

1. Does the subtitle name the release's kind in its first words?
2. Does the title carry the full version (`X.Y.Z`)?
3. Does every highlight and line keep the tone of the release's kind?
4. Does every fix start with "Fixed:" and say what works now?
5. Does every restore own, in one clause, the earlier release that broke it?
6. Is every removal, behaviour change and user-facing known issue on a `Removed:`, `Changed:` or
   `Known issue:` line in the visible part?
7. Is each smaller change and folded line one sentence, and is every budget of "Length" kept?
8. Does every line say the consequence for the user, with none of the banned constructions?
9. Does every picture show only the changed element, within the sizes of "Images" (a clip GIF
   excepted), its alt text saying what it shows, with no sentence about a missing picture?
10. Does the version match the kind, or does the version PR say it is probably wrong?

## Announcement thread

Three posts on X, in `tweet.md` of the notes folder, each under a `## 1/`, `## 2/`, `## 3/` heading,
followed by an `Image:` line with the file name of its picture when it has one. Only the owner posts
and uploads.

1. **The story** (may be long; X shows "Show more" past 280 characters). Written in the first
   person, as one would tell a colleague: start from a concrete moment of work with a coding agent
   that the release improves, then say what is different now. Name at most three changes, in
   plain words, not a feature list. One picture: the hero image. When the release has a feature
   clip, **its MP4 replaces the hero image** and is the thread's hook: post 1 carries a
   `Video: <clip>.mp4` line instead of its `Image:` line (X takes one video or up to four images per
   post, never both), and no other post changes. Step 7 of "The steps of a release" uploads it.
2. **The release notes**: one sentence that invites to read the details, and the GitHub release
   URL (`https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/vX.Y.Z`).
3. **The install link**: one sentence (install or update, free, MIT), and the Marketplace URL
   (`https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio`).

Tone: organic. No "excited to announce", "game changer", "supercharge" or other launch words, and
none of the banned forms of "Writing" in the release notes; at
most two emoji in the whole thread; no hashtag list (one is fine when it is the natural word).
Read each post aloud: it should sound like a person, not a press release.

## Hero image

A hero image is recommended for a minor or major release, not required: an existing capture is
enough for a small one. It serves post 1 of the announcement thread. The first highlight of the
notes takes a picture cropped within the bounds of "Images". When the release has a feature clip,
the hero image is still made for the release folder but is not posted in the thread: the clip's MP4
takes its place in post 1. A dedicated one is a simulated visual scenario, so it is reproducible
and checked:

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
