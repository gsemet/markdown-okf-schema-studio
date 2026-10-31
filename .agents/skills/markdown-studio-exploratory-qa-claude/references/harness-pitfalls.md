# Harness Pitfalls (learned the hard way)

Read this before driving VS Code. Each item cost time in the first campaign. `q doctor` checks the
ones that can be checked automatically (socket path, custom dialogs, spy, observer, native sheet,
stale bundle, window count): run it after every launch. It waits up to 3 s for an observer started
just before it.

## Launching

- **IPC socket path limit (macOS, 103 chars).** A `--user-data-dir` under a long path makes VS Code
  fail with `listen EINVAL … main.sock`. The driver puts the profile in `$TMPDIR/msq-*`; keep it.
- **Electron has no `Browser.setWindowBounds`.** The window stays at its default size (1440×900 on
  the first campaign). For narrow layouts, drag the editor sash with `drag`, or use
  `Emulation.setDeviceMetricsOverride` inside a single `run` script (the override is dropped when
  the CDP session closes).
- **Native dialogs and menus are invisible to CDP screenshots.** A "Save changes?" sheet blocks the
  window silently. The driver writes `window.dialogStyle: custom` and `window.menuStyle: custom`
  into fresh profiles; for an old profile, set them and restart. `scripts/sheet.applescript read`
  lists a pending native sheet; `osascript scripts/sheet.applescript "Cancel"` dismisses it.
- Save or revert dirty buffers before **Close All Editors**, or a dialog appears.
- **Restricted Mode needs an untrusted folder.** `--untrusted` only turns workspace trust on
  (`security.workspace.trust.enabled`); a QA workspace under an already trusted parent inherits the
  trust and opens normally. Use `q launch --untrusted --workspace <dir outside the trusted parent>`,
  for example a copy in `$TMPDIR/msq-untrusted-<name>`.
- **The Agents window is not supported.** `code --agents` opens it as a second CDP page
  (`sessions.html`); `q` always targets the first workbench page, and the isolated profile is not
  signed in. Do not drive it, and do not shoot it: it lists the user's real folders.

## Reaching the webview

- **Playwright does not attach webview iframes that existed before it connected.** `page.frames()`
  shows the webview frame with an empty URL. The driver bypasses Playwright for webview content:
  it connects to the `iframe` CDP target from `/json/list` and evaluates inside
  `#active-frame.contentDocument`. Use `box`, `clicksel`, `feval`, and the `wv()` helper in `run`
  scripts; they return main-window coordinates for real mouse clicks.
- Only **visible** webviews are targeted. When the preview is hidden behind another tab, commands
  fail with "No VISIBLE webview found"; reveal it first.
- In `run` scripts, do not spread a `box()` result and then add a `y` key: `box()` already uses
  `x/y/w/h`. A first probe clicked at `scrollY` instead of the element and produced false
  "wrong block opened" findings.

## Input

- **Quick picks close between driver invocations** (the reconnect steals focus). Multi-step
  palette flows must run inside one `seq` command, for example
  `q seq "key:Meta+Shift+P" "type:View: Reopen Editor With..." "wait:800" "key:Enter" "wait:1200" "pick:OKF-Schema Studio"`.
- **Cmd+P with focus in the preview opens the file in the preview's group** and hides the preview.
  Press `Meta+1` (focus the first group) before `open`.
- The palette remembers recent commands: "Reopen Editor with Text Editor" may come first; check
  `rows` before pressing Enter.
- `keyboard.type` delivers real per-character key events (autosave paths); `insert` pastes in one
  event. Prefer `type` for editing scenarios.
- **Quick Open needs time.** Give the `open` step about `"wait": 2500` before a palette step. A
  file that does not exist in the workspace fails later as "quick pick row not found" or a missing
  preview: check the path first (`ls` in the clone).
- **The palette-mode `<select>` is native**: arrow keys and Enter do not change it through CDP.
  Focus it, type the first letter of the option, then Enter.
- **Narrow pane:** the preview toolbar collapses; its buttons (Comments, theme toggle, Back) are
  0×0 until `button[aria-label='Show view controls']` is clicked. `clicksel` fails on an empty box.
- **`clicksel` scrolls the element into view**, which can close an open inline editor and moves
  every box (it hid finding QA215-04 at first). Locate again after every editor change.
- **Latency probe:** after "Open Preview to Side" and the edit-mode toggle, focus stays in the
  preview and `latency-probe.mjs` reports 5000 ms per key. Run
  `q scenario open-side-preview-edit --file <doc>` first: it ends with focus in the source.

## Observing

- The spy extension (`scripts/spy`) writes `runs/<name>/spy/state.json` (documents with full text,
  versions, dirty flags, tabs, visible ranges) and `events.jsonl` (every document change with its
  range). `q spy` summarises; `q spy --text <file-suffix>` prints the live buffer. Diff it against
  the file on disk after every editing scenario.
- `q run observe.mjs` (in the background) logs console errors, page errors, and webview frame
  navigations to `runs/<name>/console.log`; count `[nav]` lines to measure full reloads.
- Screenshots are taken by CDP from the workbench page and include webview content.

## Measuring

- **CDP screenshots do not show sub-frame states.** A 30-frame filmstrip during typing produced
  two distinct images: the compositor coalesces frames. Measure flicker and jumps with the DOM
  sampler (`scripts/flicker-probe.mjs`, thousands of samples per second through raw CDP) and
  report histograms, not screenshots.
- `scripts/latency-probe.mjs` types a unique token and reports per-key latency until the preview
  shows it; compare a large chapter with a small fixture.
- **Two webviews visible at once** (Open With editor plus side preview): `q frames` prints each
  visible webview with an index (`[0]`, `[1]`, in DOM order, hidden ones after). Pass `--frame <n>`
  (alias `--which`, or `left`/`right`) to `box`, `clicksel`, `feval`, `shot --clip preview` and
  `--annotate`, or `"which"`/`"frame"` in a scenario step. Campaign 215 saw only one webview
  listed in this layout and could not drive the Open With webview; a re-check (CR 216) listed and
  drove both. The driver now also matches a frame to its CDP target by webview id, and an index
  that is not visible is an error instead of a silent fall-back to webview 0. Check `q frames`
  before driving this layout.
- **"Reopen Editor With…" leaves three editors open**: the text tab, the custom editor and the side
  preview. Go to Line and other text commands then reach the text tab, not the editor you see.
  With focus in the custom editor, Quick Open and the palette can stop reaching the workbench
  (seen once in CR 216): run Open With journeys last, then relaunch with a fresh clone.
- **Undo with the side preview open:** Meta+z with focus in the Open With webview did not undo
  while the side preview was also open; with Open With alone it undoes a paragraph commit and a
  radio click (campaign 215 re-check, not a product defect). Undo after a side-preview edit with
  Meta+1 then Meta+z.

## Sessions

- **Parallel charters:** prefix every call with `QA_SESSION=<name>` (or `export QA_SESSION=<name>`)
  instead of relying on `runs/current` (each `launch` rewrites it, so two agents would drive each
  other's window). Give each charter its own workspace copy (`setup-workspace.sh --clone <name>`,
  `launch --ws <name>`). `--clone` first refreshes `ws/synth` from `assets/synth`, so new fixtures
  reach a workspace built earlier.
- **Count windows with `q sessions`**, not `pgrep -fl msq-`: one VS Code window has about seven
  `msq-` processes (helpers, renderers). `q sessions` lists one line per window (main process per
  `--user-data-dir`) with its session, and the total against the 2–3 budget.
- **After a navigation, relaunch.** A scenario that follows a link leaves the window on another
  document, maybe dirty; "Open Preview to Side" does not reset it and Back hides in the collapsed
  toolbar. Stop, clone again (`setup-workspace.sh --clone <name>`) and launch.
- `q use <name>` switches the current session; do not write `runs/current` by hand (zsh
  `noclobber` makes `>` fail and later commands then target a dead session and hang).
- VS Code can ignore SIGTERM (dirty buffers): `q stop` escalates to SIGKILL and prints
  "still running" if it failed. Run `q stop` as its own command: chained with `pkill` it was
  denied by the auto-mode permission check. Check `q sessions` at the end of a campaign.
- **Private content in shots.** Before saving a shot to `evidence/`, look for real folder names,
  user paths and vault content. Never shoot a window outside the QA workspace (recent-folder lists,
  the welcome page, the Agents window). When a shot shows the vault in the Explorer, crop it to the
  preview region (`sips -c <h> <w> --cropOffset <y> <x>`) or leave it out of `evidence/`.
- **The smoke shot is clipped to the preview**: it shows a rendered preview, not the workbench.

## Lessons of campaign 210

- **The no-op sweep followed links.** Clicking a link-only paragraph (a block whose only content
  is a link) follows the link, so the preview left the document and the sweeps of two chapters did
  not reach their tables and fields. The closing `*Next: [Chapter N](…)*` line of every chapter is
  such a block, and its text is not equal to its link text, so a text comparison misses it.
  `noop-sweep.mjs` now checks the click point itself (`elementFromPoint(...).closest('a[href]')`),
  picks another point of the block when the first one is on a link, and skips the block when none
  is free (reported as "link-only skipped"; `--follow-links` includes them). It records the shown
  document id (`data-sphinx-preview-document-id`) and compares it after each click, because the
  target document is also a mapped Markdown document. On a change it clicks the preview's Back
  button (`[data-sphinx-preview-back]`, which sits in the toolbar's collapsed rows: it expands them
  first and waits for the button to be enabled), waits for the original id, re-enables edit mode,
  and stops the whole sweep with an error if the id never returns. Test link-only blocks with a
  dedicated scenario (`synth/linkonly.md`), not the sweep.
  `--limit N` bounds every kind with or without `--from`; split a long chapter with
  `--from`/`--limit`.
- **`--var nth=3` arrived as the string `"3"`.** Variables are strings, and a step field written
  as `"nth": "${nth}"` stayed a string. `clicksel` already applied `Number()`, but other numeric
  step fields did not. `engine.mjs` `substitute()` now turns a field that is exactly one
  placeholder into a number when the field is a known numeric one (`nth`, `which`, `count`,
  `delay`, `gap`, `wait`, `timeout`, `dx`, `dy`, `steps`, `px`, `max`, `maxLines`) and the value is
  an integer. Text fields (`text`, `type`, `insert`) keep strings, so `--var cell=3` still types
  "3". Other fields: write the number in the scenario, or build the selector with
  `td:nth-child(${n})`.

## Shell

- `rm` may be aliased to `rm -i` and zsh may have `noclobber`: use `command rm -f` (or `\rm -f`)
  before rewriting a scenario file, `>|` to overwrite on purpose, or the editor tool.
- `env QA_SESSION=x $Q …` with the command stored in a variable fails: `export QA_SESSION=x` once.
- `grep` may be wrapped by a token-saving proxy; use `rtk proxy grep` for raw output.
- `sed -i ''` may behave as GNU sed (a `sed` from Homebrew first in `PATH`): edit files with the
  editor tool, or check `sed --version` first.
- `QA_CHANGES_ROOT` only tells `coverage-map.py` and `new-features.py` where `.agents/changes` is.
  `launch`, `scenario` and `setup-workspace.sh` ignore it; they use `QA_ROOT` and `--ws`.

## Cost

What made the first campaign expensive, and the cheaper habit:

| Habit | Instead |
| --- | --- |
| One driver call per click, key, or `feval` | One `q scenario` with its checks |
| Full-window PNG screenshots read after each action | Checks first; `--clip preview` JPEG only on a failure or for a visual judgement |
| `q spy --text` of a 100 KB chapter | `q spy --diff FILE --against mark`, or `--text FILE --lines 120-160` |
| Unbounded `feval` / `box` output | Outputs are capped at 2000 chars; `--full` only when needed |
| Exploring, writing sheets, and synthesis in one thread | Foreman, QA Drivers, and one sub-agent per charter (references/charters.md) |
| Re-exploring old findings | Run their replay scenarios |
