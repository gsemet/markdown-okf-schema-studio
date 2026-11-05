# Owner review guidelines

What the owner reads, and how it is written for them. These rules hold whoever writes the
document or runs the session.

## Which documents follow the writing skill

Which documents follow `skills/writing-for-markdown-okf-schema-studio/SKILL.md`:

| Document | Writing skill |
| --- | --- |
| `01-intent.md`, `03-change-spec.md`, QA sheets and campaign `00-index.md`, archive `report.md` | ✅ yes |
| `ORCHESTRATOR.md` (generated), `STATUS.md` header (four fixed lines) | ⚠️ a little, no format change to `STATUS.md` |
| `task.md`, `rules.md`, `work/` reports and verdicts, SwRS and StRS, PR bodies, GitHub issues | ❌ no: plain GFM |

The "yes" documents are read by the owner in the Studio, so they use its MyST features (alerts,
tables, diagrams). Working files, PR bodies and GitHub issues stay plain GFM because GitHub does not
render MyST; requirements follow the okfreq format.

## Name things with their link

A status report to the owner names a PR, change request, run or file with its link.

## Demo tour

Once the stack top has green heavy CI, the agent talking to the owner installs the VSIX built from
the top branch, writes one `.agents/changes/demo/tour.md` (git-ignored, inside the trusted
workspace so edit mode works) with a section per change that exercises it, then guides the owner
one step at a time (what to do, what they should see), waiting for their reply between steps. Warn
before any VS Code reload.
