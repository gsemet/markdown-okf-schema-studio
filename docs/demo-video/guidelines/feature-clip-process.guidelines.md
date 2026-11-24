# Feature clip process

How to make, check and publish a feature clip of Markdown OKF-Schema Studio: a video of a few
seconds that shows one feature, the action and then its result. It is written for an agent that
makes the clip with the maintainer, who decides. It follows the same method as
[short-demo-process.guidelines.md](short-demo-process.guidelines.md), whose identity table stays the
source of the colours, type, caption pill, cursor and zoom rules that clips reuse; this guideline
holds what a clip does differently, with the reason for each rule.

A feature clip has no title or end card, plays 5 to 12 seconds, starts on the action and loops. It
comes in three files: an MP4 for X and the published GitHub release, a WebM for the published docs
site, and a light GIF for the release-note file in the repository and the feature's docs page. The
README is not changed: it keeps its presentation video.

The first rule of the short-demo process holds: **the maintainer always has an up-to-date
storyboard**, here `clip.md` (section 2).

## Where things live

```text
docs/demo-video/
├── guidelines/feature-clip-process.guidelines.md   this file
├── clip-kit/                                       the shared kit (Node.js and ffmpeg only)
└── clips/<clip>/
    ├── clip.md                 the live storyboard: every on-screen text and time
    ├── scenario.mjs            the actions, the stage, the settings, the expected result
    ├── stage/                  the demo document and the files the take copies to its workspace
    ├── <clip>.mp4, .webm, .gif outputs, Git LFS
    ├── poster.png              frame 0 (the X poster, the site poster)
    ├── contact-sheet.png, first-last.png, frames/*.png, check.json   evidence
```

`.gitattributes` sends `*.mp4`, `*.webm`, `*.gif` and `*.png` to Git LFS, and `.vscodeignore` keeps
`docs/demo-video/**` out of the VSIX. The kit adds no dependency to the extension and is not part of
`just check`, `just preflight` or CI.

## 1. The kit and a take

```bash
just clip <name> doctor                 # what is missing, and how to get it
just clip <name> all --vsix <path>      # setup, take, render, check
just clip <name> render                 # after a text or time change in clip.md: no new take
just clip <name> check
```

The kit runs the same from PowerShell, Git Bash and a macOS shell: it needs Node.js and `ffmpeg`
only, no Python and no symbolic link.

- **`setup`** builds a throwaway `--user-data-dir` and `--extensions-dir` in the scratch folder,
  never the maintainer's profile. The profile holds the short-demo settings (theme, hidden chrome,
  a very high `workbench.hover.delay`, a transparent sash hover, `editor.occurrencesHighlight` off,
  `comments.authorName` set, `files.autoSave` afterDelay), the clip's own settings from
  `scenario.mjs`, `files.eol: "\n"`, and `"editor.pasteAs.showPasteSelector": "never"` so no
  paste-options widget shows after a paste. The workspace is neutral and holds the clip's `stage/`.
  The extension comes from `--vsix <path>`, or from the Marketplace without it. A clip of a feature
  not yet released uses the VSIX packaged from the branch (`just package` writes
  `out/reports/package/markdown-okf-schema-studio.vsix`).
- **`take`** deletes the previous take and `clip.mp4` first, so a failed take can never be rendered
  as if it were new. It opens the window, sets the layout up before the screencast starts (what
  happens there is not in the clip), starts the screencast, runs `scenario.run(t)`, stops, and runs
  `scenario.verify(t)`: a failed check fails the take.
- **`scenario.mjs`** exports `stage` (files copied to the workspace), `settings` (added to the
  profile), `setup(t)` (the layout, off camera), `run(t)` (the filmed action) and `verify(t)` (the
  expected result, read from disk). The helpers `t` gives: `moveTo(x, y, dur)` (eased, logged),
  `click()`, `selectText(frame, from, to)` (a mouse drag from the left edge of the first character
  of `from` to the right edge of the last character of `to`, located with a DOM `Range`,
  non-breaking spaces normalised), `press(chord, badgeId)` (the key chord through CDP,
  `ControlOrMeta` for the platform modifier, logged with the badge id), `zoom(id, rect)`,
  `unzoom(id)`, `mark(id, rect)`, `unmark(id)`, `sleep(ms)`, `frameOf()` (the preview frame) and
  `workspaceFile(name)` (read a workspace file from disk).
- **Pacing**: cursor moves of 600 to 900 ms, eased; 400 ms pause before a click or a chord; zoom in
  and out over 600 ms (20 frames at 30 fps), at most 2x.
- **VS Code**: the kit downloads a pinned version (`DEFAULT_CODE_VERSION` in `lib/platform.mjs`)
  with `@vscode/test-electron` into the scratch folder, so two takes of the same clip film the same
  VS Code. Move the constant by hand when a clip is remade on a newer one. `DEMO_CODE` overrides the
  executable with a local install. The version used is written in `check.json`.
- **Remotion** stays out of `package.json`: `setup` installs `remotion@4.0.539 @remotion/cli@4.0.539
  react@19 react-dom@19` into `<scratch>/remotion/` when they are absent, and `render` copies the
  composition there.
- **`doctor`** checks Node.js 24, `ffmpeg` and `ffprobe` on `PATH` (or `FFMPEG` / `FFPROBE`) with
  the `libx264`, `libvpx-vp9` and `gif` encoders, the repository's `node_modules` (`just dev`), a
  writable scratch folder, the Remotion install, the VS Code download and the display. The display
  rule: the primary display's work area must hold the window (1280x720 logical pixels) at a device
  scale of 2, 1.75 or 1.5, so a work area of at least 1920x1080 physical pixels. When none fits,
  `doctor`, `setup` and `take` fail and name the display they need and the one they measured.

**A trial first.** The first take of a new kit or a new host proves four things before the full
clip is judged: (a) the preview webview is in the screencast frames; (b) the selection is made the
way the clip shows it, a CDP mouse drag in Studio's reading mode, and the page's `getSelection()`
holds the expected text; (c) the chord reaches the page (the scenario's check passes); (d) at least
30 frames per second after retiming (`prepare` prints it). If (b) fails, stop and report: a
selection made by script (`Selection.addRange`) is not what the clip shows. If (a) fails, a
`Page.captureScreenshot` loop replaces the screencast; if (c) fails, `Input.dispatchKeyEvent` with
its `commands` field (`copy`, `paste`) replaces the plain key press; if either still fails, stop and
report. Never an OS-level screen capture or OS-level input.

A take opens a real VS Code window: it does not run while another change runs app-window tests on
the same machine ([local-worktree.guidelines.md](../../../.agents/guidelines/local-worktree.guidelines.md)),
and the screen stays unlocked. It overwrites the system clipboard.

## 2. The live storyboard: `clip.md`

The short-demo rule holds without exception: **one file, the clip reads every on-screen text and
time from it, every change lands in it in the same step, re-read before each render**. Its contract:

- front matter `title`, `status`, `date`; one table `| Field | Content |`;
- fields: `Length` (seconds, 5 to 12), `Caption` (one line; `**bold**` takes the accent colour),
  `Badge <id>` (the keycap text of each `press(…, id)`, for example `Badge copy | Ctrl+C`), `Zoom`
  (the id of the one zoom and its hold, for example `result, hold to 7.6 s`), `Logo` (`top right`
  by default), `Mark <id>` (optional, `-` for none: a brief orange outline, during the zoom, around
  what the feature changed);
- badges show the keys of the platform the clip is filmed on: `Ctrl+C` on Windows and Linux, `⌘C`
  on macOS. `clip.md` holds one text per badge, and `storyboard.mjs` refuses a badge that names the
  other platform's modifier;
- `storyboard.mjs` refuses a `clip.md` with no caption, a length outside 5 to 12 s, more than one
  zoom, more than one mark, a badge id the take did not log, or a playback rate outside 0.77 to 1.3
  of the filmed length (the short-demo pace rule).

## 3. Outputs and how the GIF stays light

Every output comes from one Remotion master (`--codec=h264 --pixel-format=yuv420p --crf=18
--muted`), 1920x1080, 30 fps. Then ffmpeg:

| File | Settings | Budget (`check` fails above it) |
| --- | --- | --- |
| `<clip>.mp4` | the master remuxed with `-movflags +faststart`, no audio stream, H.264 `yuv420p` (what X takes and what the GitHub release editor plays) | 10 MB; over it, the master is re-encoded at `-crf 20`, then 22, reported in `check.json`; still over: `check` fails |
| `<clip>.webm` | VP9: `-c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p -an`, 1920x1080, 30 fps | 3 MB |
| `<clip>.gif` | one filter graph: `fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`, `-loop 0` | 3 MB |
| `poster.png` | frame 0, 1920x1080 | - |

Why the GIF stays light:

- **Its own palette, built from the clip** (`palettegen`), not the default 256-colour web palette:
  VS Code and the cream page are a few flat colours, so 128 colours are enough and keep the LZW
  stream short. `stats_mode=diff` weighs the palette towards what moves (the selection, the pasted
  text), so the moving parts get the exact colours.
- **Ordered dithering** (`bayer`, scale 5) instead of error diffusion: error diffusion sprinkles
  noise on flat areas, which changes pixels from frame to frame and defeats the frame-difference
  compression.
- **Only changed rectangles re-encoded** (`diff_mode=rectangle`): a screen clip changes a small area
  per frame, except during the zoom.
- **12 fps**: enough for a cursor and a paste; 30 fps in the MP4 and WebM.
- **960 px wide** (half the master): the width of a GitHub release body and of a docs page column.
  Text stays readable because the take films a window at 1280x720 logical pixels and the clip zooms
  on the result.
- **A ladder when over budget**, stopping at the first step that fits, reported in `check.json`:
  10 fps, then 800 px wide, then 96 colours. None fits: `check` fails, and the clip is shortened
  (back to `clip.md`), never shipped heavier.

A clip's GIF is **not cropped** for the release notes: it shows the whole filmed window, and the
clip's one zoom on the result stands in for the crop.

## 4. In a docs page and in a release

- **A docs page** embeds a clip as its GIF with a plain Markdown image,
  `![alt](../demo-video/clips/<clip>/<clip>.gif)`, under the entry of the feature. Studio and GitHub
  show the GIF; the site build turns that image into a looping `<video>` of the WebM when the WebM
  is beside the GIF. Studio does not render `<video>`.
- **A release** may carry the clip of a visible feature: its GIF is the picture of the feature's
  highlight in `release-notes.md`, its MP4 replaces the hero image in post 1 of the announcement
  thread, and the owner uploads the MP4 into the GitHub release body. The steps are in
  [release-process.guidelines.md](../../../.agents/guidelines/release-process.guidelines.md).

## 5. Windows and macOS

The traps of the short-demo guideline all still hold. These are added, each with its rule:

| Trap | Rule |
| --- | --- |
| VS Code is installed in different places | The kit downloads the pinned `DEFAULT_CODE_VERSION` with `@vscode/test-electron` into the scratch folder; `DEMO_CODE` overrides it |
| The VS Code CLI, `npm` and `npx` are `.cmd` files on Windows | Spawn them with `shell: true` on Windows only, with every argument quoted |
| macOS's temporary folder is long and the debugging port fails | Scratch: `CLIP_SCRATCH`, else `/private/tmp/okfclip` on macOS, else `<os.tmpdir()>/okfclip` |
| `file://${path}` is wrong with a drive letter | `pathToFileURL(path).href` for every URI in `storage.json` |
| `Meta+…` chords do nothing on Windows | `ControlOrMeta` in every chord; the scenario never names `Meta` or `Control` for the platform modifier |
| Killing VS Code leaves its helpers running on Windows | `taskkill /PID <pid> /T /F` on Windows; `process.kill` on macOS |
| A pasted file gets CRLF on Windows and the check fails | `files.eol: "\n"` in the profile |
| A window at device scale 2 is larger than a 1080p screen | The kit sizes the window so its physical size fits the primary display's work area, at scale 2 when it fits, else the largest of 1.75 and 1.5 that fits, and writes the scale and the measured work area in `check.json`; no scale fits: `doctor`, `setup` and `take` fail and name the display needed; the master is 1920x1080 whatever the scale |
| A backslash path in the ffmpeg concat list | Forward slashes and `-safe 0` |
| `ln -s` needs developer mode on Windows | No link: `render` copies the composition into the scratch Remotion folder |
| Python is `python3` on macOS and absent or `py` on Windows | The kit is Node.js only |

`CLIP_DISPLAY_OVERRIDE=<width>x<height>` replaces the measured work area, to prove the small-display
failure on a large screen.

## 6. Self-check, review and commit

- Run `check` and read the evidence files, then look at every frame of the contact sheet and the
  three named frames: wrong framing, a missed selection, the result not visible at the zoom, a
  tooltip, a personal name or path, a dirty tab. Say what was not checked: motion, rhythm and the
  loop as watched are the maintainer's to judge. The loop seam is a number (SSIM) that does not
  prove the fade-out reads well.
- The `check` step fails unless every line holds: MP4 duration 5 to 12 s equal to `clip.md`'s
  `Length` within one frame, 1920x1080, 30 fps, `h264` `yuv420p`, no audio, `faststart`, at most
  10 MB; WebM `vp9`, same size, fps and duration, at most 3 MB; GIF at 960 px (or the ladder's
  width), 12 fps (or the ladder's), at most 3 MB, a NETSCAPE2.0 loop extension with a count of 0;
  SSIM between frame 0 and the last frame of the MP4 at least 0.98 and below 1.0 (the last frame
  is never a copy of frame 0); no paste-options widget; the scenario's `verify` passed; at least 30
  frames per second after retiming; the playback rate inside 0.77 to 1.3. It writes every measured
  value, the VS Code and extension versions, the device scale, the display work area and the
  platform in `check.json`, with no absolute path and no user name.
- The maintainer watches the MP4 (on a phone) and the GIF. A caption, a badge or a time: edit
  `clip.md`, `just clip <name> render` then `check`, about two minutes. A new action or a changed
  document: a new take.
- The outputs, the poster and the evidence files are committed together with `clip.md`, so the
  storyboard, the clip and its pictures always match.
- No personal data in any frame; the version shown is the one the clip says (the Marketplace
  version, or the branch's VSIX for a feature not yet released).
- A pasted or produced result that differs from the scenario's expected value is not "fixed" in the
  scenario: it is a finding against the feature, reported with what was produced, and the clip waits.
- The host and default matrix of a clip lists one line per cell (host, VS Code, the setting's value
  when the clip films a configured value of an off-by-default setting, expected, proof), and says
  plainly which cell was not proved (a host the agent had no access to).
