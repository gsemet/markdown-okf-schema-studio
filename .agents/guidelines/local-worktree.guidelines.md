# Local worktree guidelines

How a change is worked on a developer machine: one worktree per change, and the shell and machine
habits that keep an unattended session working.

## One worktree per change

One worktree per change; each worktree gets its own dependencies from `just dev`, and they are
never staged (`<id>` is the change number and `<slug>` its short name):

```bash
git worktree add -b change-requests/<id>-<slug> ../<repo>.worktrees/<id> origin/main --no-track
(cd ../<repo>.worktrees/<id> && just dev)
```

`just dev` runs first in a new worktree or a clean checkout, before any build, check, test or gate.
It installs the worktree's own `node_modules` (`npm ci`) and Python environment (the `requirements`
group included), so `uv run --no-sync --group requirements okfreq` still runs CI's okfreq there. The
worktree does not symlink `node_modules`, because `npm ci` would replace the main checkout's
`node_modules` through the symlink.

## App-window tests

Two changes never run app-window tests locally at the same time; CI runs the full gate. On macOS
the machine stays awake during an unattended session, so the screen does not lock:

```bash
pgrep -x caffeinate >/dev/null || nohup caffeinate -dimsu -t 21600 >/dev/null 2>&1 &
```

`-d` keeps the display on (an idle display sleep is what locks the screen), `-i`/`-s` keep the
system awake, `-m` the disk, `-u` declares user activity; `-t 21600` stops it after 6 hours, and
the session restarts it if it has ended. It cannot unlock a screen that is already locked:
app-window tests then fail fast, the session reports it in its status file, and CI's on-demand
real-window job is the proof until the owner unlocks. When the session ends, `pkill -x caffeinate`
stops it, only if the session started it.

## Shell commands never wait for input

`rm`, `cp` and `mv` may be aliased to `-i`, so call them as `\rm`, `\cp`, `\mv` to bypass the
alias.
