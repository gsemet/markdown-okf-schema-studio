# Scenario Format

A scenario is a JSON file of steps run in one CDP connection by `q scenario FILE`. Actions use real
input; checks are oracles that print one `PASS`/`FAIL` line each. Use scenarios instead of chains
of single `click`/`key`/`feval` calls: each driver call costs a full agent turn, and the checks
replace most screenshots.

```bash
q scenario table-cell-edit                         # looks in ../scenarios/ when not a path
q scenario my.json --file synth/tables.md --var cell=alpha --keep-going
q check '{"check":"diff","file":"synth/tables.md","against":"disk"}'   # oracle only
```

Output: `..` notes for actions that report something, `PASS n check detail` /
`FAIL n check detail` (with the diff or console lines under a failure), then
`== name: P pass, F fail`. The full result goes to `runs/<session>/scenarios/<name>-<ts>.json`.
A failing **action** stops the scenario and captures a preview shot (`--keep-going` disables that);
a failing **check** does not stop it.

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
Preconditions (which file is open, preview visible) go in the scenario's first steps or in its name.

## Actions

Each action waits a default pause afterwards; `"wait": ms` overrides it. `"which": i` targets the
i-th visible webview (Open With editor plus side preview). `"optional": true` lets the scenario
continue when the action fails: the failure is noted as `optional step skipped` and is not counted
as a FAIL.

| Step | Effect |
| --- | --- |
| `{"open": "synth/x.md"}` | Focus group 1, Quick Open, Enter |
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
| `{"shot": "name", "clip": "preview", "onFail": true, "png": true, "px": 1000}` | Screenshot; `onFail` only when a check already failed |
| `{"eval": "<webview JS>", "max": 600}` | Print a value (diagnosis only; prefer a check) |
| `{"wait": 500}` | Pause |

## Checks

| Check | Passes when |
| --- | --- |
| `{"check": "diff", "file": "…", "against": "disk"\|"mark", "equal": true, "maxLines": 1, "contains": "…", "notContains": "…", "dirty": true, "show": true}` | Live buffer vs disk or mark meets every given condition; `maxLines` bounds removed and added lines separately |
| `{"check": "errors", "max": 0, "ignore": "regex"}` | Console errors and page errors since the scenario started ≤ max (needs the observer); Node `DeprecationWarning` lines are always ignored |
| `{"check": "navs", "max": 0}` | Full webview navigations since the start ≤ max (needs the observer) |
| `{"check": "notifs", "none": true, "contains": "…"}` | Toast state as requested |
| `{"check": "feval", "expr": "…", "equals": value}` | Webview expression equals the value (or is truthy without `equals`) |
| `{"check": "peval", "expr": "…", "equals": value}` | Same in the workbench page |
| `{"check": "focus", "selector": "textarea"}` | The webview's active element is in the selector |
| `{"check": "inViewport", "selector": "…", "text": "…"}` | Every match is fully inside the webview viewport (at least one match) |
| `{"check": "noOverlap", "a": "sel", "b": "sel"}` | No visible pair overlaps (ancestors are ignored) |
| `{"check": "noClip", "selector": "…"}` | No match has clipped content (scroll size > client size) |
| `{"check": "editor", "visible": "synth/x.md"}` or `{"active": "…"}` (or `null`) | A visible text editor shows the file / the active text editor is the file (undefined while the preview has focus) |

Every check accepts `"label"`, shown in its line. Put the finding ID in the label of a replay
scenario (`"label": "UX-12"`) so a failure names the regression.

## Writing good scenarios

- One journey per scenario, 5–25 steps, ending with checks: `diff`, `errors`, and the visible
  outcome. Finish with `{"shot": …, "onFail": true}` rather than an unconditional shot.
- Every confirmed finding gets a replay scenario under `scenarios/` named after its ID
  (`ux-12-cell-edit-minimal-diff.json`). Replays are how the next campaign re-checks fixes
  without exploring again, and they are the first draft of the product test.
- Prefer selectors and text over coordinates: coordinates break when the layout changes.
