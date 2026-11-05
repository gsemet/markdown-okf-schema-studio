# Local worktree guidelines

How a change is worked on a developer machine: one worktree per change, and the shell and machine
habits that keep an unattended session working.

## One worktree per change

One worktree per change, dependencies symlinked, never staged:

```bash
git worktree add -b change-requests/NNN-<slug> ../<repo>.worktrees/NNN origin/main --no-track
ln -s "$PWD/node_modules" ../<repo>.worktrees/NNN/node_modules
(cd ../<repo>.worktrees/NNN && uv sync --group requirements)
```

The `uv sync` gives the worktree its own Python environment from the lock file, so
`uv run --no-sync --group requirements okfreq` runs CI's okfreq there, not a global one.

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
