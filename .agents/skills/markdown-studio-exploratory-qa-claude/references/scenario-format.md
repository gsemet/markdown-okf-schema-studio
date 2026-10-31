# Scenario Format

A scenario is a JSON file of steps run in one CDP connection by `q scenario FILE`. Actions use real
input; checks are oracles that print one `PASS`/`FAIL` line each. Use scenarios instead of chains
of single `click`/`key`/`feval` calls: each driver call costs a full agent turn, and the checks
replace most screenshots.

```bash
q scenario table-cell-edit                         # looks in ../scenarios/ when not a path
q scenario my.json --file synth/tables.md --var cell=alpha --var 'typed=3. Quoted' --keep-going
q check '{"check":"diff","file":"synth/tables.md","against":"disk"}'   # oracle only
```

`--var` repeats; a value keeps its spaces and any further `=` when the whole pair is quoted as one
shell word (`--var 't=3. Quoted'`, or `--var='t=a=b'`).

Output: `..` notes for actions that report something, `PASS n check detail` /
`FAIL n check detail` (with the diff or console lines under a failure), then
`== name: P pass, F fail`. The full result goes to `runs/<session>/scenarios/<name>-<ts>.json`.
A failing **action** stops the scenario and captures a preview shot; a failing **check** does not
stop it. Pass `--keep-going` to run every step anyway (each failing action is counted as a FAIL),
for example to collect all checks of a replay whose setup step is flaky.

## File

```json
{
  "name": "table-cell-edit",
  "file": "synth/tables.md",
  "vars": {"cell": "beta", "typed": " X"},
  "steps": [ {"mark": true}, {"editMode": true}, {"check": "diff", "against": "mark"} ]
}
```

`${name}` in any string is replaced by `vars`, `file`, `--file`, or `--var name=value`. Write
scenarios against `${file}` so one scenario replays on several fixtures and real chapters.
Preconditions (which file is open, preview visible) go in the scenario's first steps; one that
cannot be automated (a settings file in the clone) goes in a `comment` step at the top. A replay
ships with its fixture: a scenario on a new `synth/` file adds that file to `assets/synth/` in the
same change, or the next campaign's fresh clone cannot run it.

## Actions

Each action waits a default pause afterwards; `"wait": ms` overrides it. `"which": i` (alias
`"frame"`) targets the i-th visible webview as `q frames` numbers them, or `"left"`/`"right"`; an
index that is not visible fails the step instead of falling back to the first webview.
`"optional": true` lets the scenario continue when the action fails: the failure is noted as
`optional step skipped` and is not counted as a FAIL. A step with no known action or check key
fails the scenario (a typo must not pass silently); a `comment` key next to an action is ignored.

| Step | Effect |
| --- | --- |
| `{"comment": "text"}` | Nothing: a note for the reader |
| `{"open": "synth/x.md", "wait": 2500}` | Focus group 1, Quick Open, Enter; give it about 2500 ms before a `palette` step. A missing file fails later, as "quick pick row not found" or a missing preview |
| `{"palette": "Command title"}` | Run a command by name |
| `{"pick": "label part"}` | Click the quick-pick row whose label contains the text |
| `{"key": "Meta+Enter"}` or `{"key": ["End", "Enter"], "gap": 120}` | Key presses |
| `{"type": "text", "delay": 35}` | Per-character typing (real key events) |
| `{"insert": "text"}` | Paste-like insertion in one event |
| `{"click": [x, y], "right": true, "count": 2}` | Mouse click in window coordinates |
| `{"clicksel": "td", "text": "beta", "exact": true, "nth": 0, "dx": 4, "dy": 6, "dbl": true}` | Scroll the preview element into view and really click it |
| `{"wheel": [x, y, dy], "steps": 5}` | Mouse wheel |
| `{"drag": [x1, y1, x2, y2]}` | Mouse drag |
| `{"waitFor": "<webview JS>", "timeout": 5000, "label": "…"}` | Wait until the expression is truthy (`D`, `W`, `box(el)` available) |
| `{"waitForPage": "<workbench JS>"}` | Same, in the workbench page |
| `{"editMode": true}` | Switch preview edit mode with the toolbar button |
| `{"mark": true}` or `{"mark": "synth/x.md"}` | Save the live buffer as the baseline for `diff` `against: mark` |
| `{"shot": "name", "clip": "preview", "onFail": true, "png": true, "px": 1000, "annotate": ["sel"], "note": ["text"], "color": ["red"]}` (or `"annotate": [{"at": "sel", "note": "text", "color": "green"}]`) | Screenshot; `onFail` only when a check already failed; `annotate`/`note`/`color` outline elements (lists pair by position) |
| `{"eval": "<webview JS>", "max": 600}` | Print a value (diagnosis only; prefer a check) |
| `{"peval": "<workbench JS>", "max": 600}` | Same, in the workbench page |
| `{"wait": 500}` | Pause |

## Checks

| Check | Passes when |
| --- | --- |
| `{"check": "diff", "file": "…", "against": "disk"\|"mark", "equal": true, "maxLines": 1, "contains": "…", "notContains": "…", "dirty": true, "show": true}` | Live buffer vs disk or mark meets every given condition; `maxLines` applies per side (removed ≤ n and added ≤ n): a radio click shows -2 +2, so it needs `maxLines: 2` |
| `{"check": "errors", "max": 0, "ignore": "regex"}` | Console errors and page errors since the scenario started ≤ max (needs the observer); Node `DeprecationWarning` lines are always ignored |
| `{"check": "navs", "max": 0}` | Full webview navigations since the start ≤ max (needs the observer) |
| `{"check": "notifs", "none": true, "contains": "…"}` | Toast state as requested |
| `{"check": "feval", "expr": "…", "equals": value}` | Webview expression equals the value (or is truthy without `equals`) |
| `{"check": "peval", "expr": "…", "equals": value}` | Same in the workbench page |
| `{"check": "focus", "selector": "textarea"}` | The webview's active element is in the selector |
| `{"check": "inViewport", "selector": "…", "text": "…"}` | Every match is fully inside the webview viewport (at least one match) |
| `{"check": "noOverlap", "a": "sel", "b": "sel"}` | No visible pair overlaps (ancestors are ignored) |
| `{"check": "noClip", "selector": "…"}` | No match has clipped content (scroll size > client size) |
| `{"check": "editor", "visible": "synth/x.md"}` or `{"active": "…"}` (or `null`) | A visible text editor shows the file / the active text editor is the file (undefined while the preview has focus). The file is a workspace path (`book/chapters/08-x.md`), a shorter suffix on a `/` boundary (`chapters/08-x.md`) or an absolute path (when the window's folder is a sub-folder of the QA workspace, also the path
relative to that folder, alone or behind the folder's own name); the detail prints paths relative to the window's folder |

Every check accepts `"label"`, shown in its line. Put the finding ID in the label of a replay
scenario (`"label": "UX-12"`) so a failure names the regression.

## JavaScript in steps and checks

`eval`, `peval`, `waitFor`, `waitForPage` and the `feval`/`peval` checks take one expression
(`D.querySelector('p').textContent`). Statements also work: when the text is not an expression but
is a valid function body (`const p = D.querySelector('p'); return p && p.textContent`), it runs in
an async function, so its value is what it `return`s (no `return`: `undefined`). In the webview,
`D` and `W` are the preview's document and window: `document` there is the outer webview frame.
One trailing `;` is ignored and dropped (`document.title;` is still an expression, in both places). In the workbench page
(`peval`, `waitForPage`, the `peval` check) text that already compiles as a script is sent
unchanged, so `a; b` returns the value of `b`; only text that needs `return` is wrapped. A bare top-level `await x` also works there (its value is returned); for several statements use `return await x`.

## Editing and selection habits

- In the inline editor, Meta+Enter commits; Escape cancels the edit (and drops typed text).
- Undo after an edit made in the side preview: `{"key": ["Meta+1", "Meta+z"]}`. Meta+z with focus
  still in the preview does not reach the source. In the Open With editor alone, Meta+z works in
  the webview (campaign 215 re-check of UX-03).
- A click on the radio option that is already selected changes nothing and looks like a refused
  write: read the selection first and click an option that is not selected, for example

  ```json
  {"eval": "[...D.querySelectorAll('[role=radio]')].map((e) => e.ariaChecked[0]).join('')"}
  ```
- `clicksel` scrolls its element into view, and that scroll can close an open editor and moves
  every box: locate (`q box`) again after each editor change.
- In a narrow pane the toolbar collapses and its buttons are 0×0. `clicksel` now fails on an empty
  box instead of clicking beside it; click `button[aria-label='Show view controls']` first
  (`"optional": true`).

## Writing good scenarios

- One journey per scenario, 5–25 steps, ending with checks: `diff`, `errors`, and the visible
  outcome. Finish with `{"shot": …, "onFail": true}` rather than an unconditional shot.
- Every confirmed finding gets a replay scenario under `scenarios/` named after its ID
  (`ux-12-cell-edit-minimal-diff.json`). Replays are how the next campaign re-checks fixes
  without exploring again, and they are the first draft of the product test.
- Prefer selectors and text over coordinates: coordinates break when the layout changes.
