# Release process guidelines

The mechanics of a release (version commit, changelog heading, CI tag, Marketplace publication)
are in "How to Release" in [CONTRIBUTING.md](../../CONTRIBUTING.md). This guideline covers the
release driver's steps and what the owner reviews before the version pull request merges: the
release notes, the announcement thread and the hero image. The model is release 1.2.0.

A release is planned by the Foreman and run by the release driver, a special driver the Foreman
starts once the stack of the release is merged (role, merge rights and prompt: "Release driver" in
[change-requests-lifecycle.guidelines.md](change-requests-lifecycle.guidelines.md)). The goal: the
owner says "release X", and the release is almost guaranteed before the version commit exists.
1.3.0 and 1.3.1 were never tagged because the version push was the first real VS Code run of their
code. The real VS Code jobs stay on `main`, so the version commit is never stacked on top of
development: the development lands first, then the release runs on its own.

## The release change request

Every release has a change request folder, `.agents/changes/03-requests/<NNN>-release-<x>-<y>-<z>/`,
with the next free CR number. The release driver owns it; the Foreman plans the release and runs
the fixes it needs.

| File | Content |
| --- | --- |
| `00-request.md` | The owner's request, the scope (the CRs and PRs in the release), the decisions |
| `release-notes.md` | The GitHub release notes, with relative image links for the local review |
| `tweet.md` | The announcement thread, three posts |
| `images/` | Copies of the images the notes and the thread use |

## The release driver's steps

1. The owner says "release X". The main session and the owner agree on the version number, then
   the main session gives the release to the Foreman, starting one if none is running.
2. The Foreman plans the release: it brings the stack of the release to `main` first, with the
   changelog lines in its PRs, so they are in `main` before the heavy run. Once the stack is merged,
   it asks the main session to hold every other merge until the release is published, and starts
   the release driver.
3. The release driver opens the folder and drafts the notes and the thread from `CHANGELOG.md`
   `## Unreleased` and the CR reports. The owner reviews `release-notes.md` and `tweet.md` in
   Studio. This is the owner's only step after the version. The hero image waits for the version PR
   (step 5), in the release CR folder or on the `-assets` branch.
4. The release driver dispatches the heavy run on `main` HEAD and waits for `integration` and
   `stress` to be green on that exact commit:

   ```bash
   gh workflow run ci.yml --ref main -f heavy=true
   gh run list --workflow ci.yml --branch main --limit 3
   gh run watch <run-id>
   ```

   Check that the run's `headSha` is the current `main` HEAD; a merge since then starts the step
   again. A red job: the release driver tells the Foreman, which runs a fix CR; the release driver
   merges the fix PR and runs again on the new HEAD. A flake: re-run once
   (`gh run rerun <run-id> --failed`); if it fails again, treat it as red.
5. **Only then** the version commit: `just bump-version`, the changelog heading, the version pull
   request (hero image and version commit squashed into one `chore: version X.Y.Z` commit, body
   following `.github/PULL_REQUEST_TEMPLATE.md`), squash and merge (see "How to Release" in
   CONTRIBUTING.md). The heavy run of the version push (CI rule 14) stays the final gate.
6. It monitors the version push through the tag, the Marketplace publication and Pages, recovering
   a red heavy job as in [ci.guidelines.md](ci.guidelines.md).
7. It replaces the generated notes (see "Publishing") and archives the folder with a `report.md`:
   tag, release URL, CI runs (heavy run on `main`, version push).

Between the notes review (step 3) and the publication (step 7), the driver asks the owner nothing,
except a real blocker: the round limit is reached or a product decision is needed.

## Release notes

Write for a user of the extension, from the changelog lines: no CR numbers, no requirement IDs,
no internal terms (Foreman, driver, round). Structure, in this order:

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

Images are committed under `images/readme/` (Git LFS) in the version pull request, so they exist
at the tag. The published notes link them as
`https://media.githubusercontent.com/media/gsemet/markdown-okf-schema-studio/vX.Y.Z/images/readme/<file>`,
which resolves only once the tag exists. Before the version pull request merges, images may
come from a CR `-assets` branch at a raw URL. In the CR folder, `release-notes.md` links the
copies in `images/` instead, so the owner can review the page locally.

### Publishing

CI publishes the release with notes generated by `gh copilot`. Once the release exists, the release
driver replaces them with the reviewed notes:

```bash
sed 's#](images/#](https://media.githubusercontent.com/media/gsemet/markdown-okf-schema-studio/vX.Y.Z/images/readme/#g; s#src="images/#src="https://media.githubusercontent.com/media/gsemet/markdown-okf-schema-studio/vX.Y.Z/images/readme/#g' release-notes.md > release-notes.github.md
gh release edit vX.Y.Z --notes-file release-notes.github.md
```

## Announcement thread

Three posts on X, in `tweet.md`, each under a `## 1/`, `## 2/`, `## 3/` heading, followed by an
`Image:` line with the absolute path of its picture when it has one.

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

Each minor or major release has one hero image, used by post 1 and by the first highlight of the
notes. It is a simulated visual scenario, so it is reproducible and checked:

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
