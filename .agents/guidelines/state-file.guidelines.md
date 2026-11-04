# `STATE.md` guidelines

Each change request folder holds a `STATE.md`: a four-line header, then free notes. The header is
rewritten at every transition and at every CI watch slice.
Everything else reads it; nobody keeps a CR's state in memory only.

**One writer**: exactly one agent writes a CR's header at a time. That is the main session for
steps 1–4, the CR driver for steps 5–10 (in stack mode: until its branch joins the stack), the
stack driver once the branch is in the stack, and the orchestrator for step 11. Every other agent
reports the line it wants changed to the writer, through its parent. The writer re-reads the file
right before rewriting it, always sets `updated:`, and reads it back after writing. No other
checklist is kept in `STATE.md`; `ORCHESTRATOR.md` shows the step.

```text
driver: <agent id | none> · updated: <HH:MM>
status: <working | wait-ci | ready | blocked | landed> · step: <1–11 name> · round: <n>/<limit>
head: <sha> · PR: <#n | —> · run: <id> <pass | fail | pending>
next: <next action> · question: <question for the user, or —>
```

`driver:` is a lock: a CR has at most one live driver. A new orchestrator reads it before starting
a driver and messages the existing one instead of starting a second.
