# Harness Pitfalls (learned the hard way)

Read this before driving VS Code. Each item cost time in the first campaign. `q doctor` checks the
ones that can be checked automatically (socket path, custom dialogs, spy, observer, native sheet,
stale bundle): run it after every launch.

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
- Two webviews can be visible at once (Open With editor plus side preview). `frames` lists them;
  pass `--which <index>` to `feval`/`box`/`clicksel`.

## Sessions

- **Parallel charters:** prefix every call with `QA_SESSION=<name>` instead of relying on
  `runs/current` (each `launch` rewrites it, so two agents would drive each other's window). Give
  each charter its own workspace copy (`setup-workspace.sh --clone <name>`, `launch --ws <name>`).
- `q use <name>` switches the current session; do not write `runs/current` by hand (zsh
  `noclobber` makes `>` fail and later commands then target a dead session and hang).
- VS Code can ignore SIGTERM (dirty buffers): `q stop` escalates to SIGKILL and prints
  "still running" if it failed. Check `pgrep -fl msq-` at the end of a campaign.
- Private vault content: when a screenshot shows the vault in the Explorer, crop it to the preview
  region (`sips -c <h> <w> --cropOffset <y> <x>`) or leave it out of `evidence/`.

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

- `rm` may be aliased to `rm -i` and zsh may have `noclobber`: use `command rm -f`, and write files
  with the editor tool rather than `>` redirection.
- `grep` may be wrapped by a token-saving proxy; use `rtk proxy grep` for raw output.

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
