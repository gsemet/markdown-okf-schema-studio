---
name: markdown-studio-exploratory-qa
description: This skill runs exploratory QA campaigns for Markdown OKF-Schema Studio when requested.
metadata:
  owner: "Gaetan Semet <gaetan.semet@ampere.cars>"
  skill-id: 85fd65a4-1e19-44f0-94e9-679120fe02a0
  keywords: [markdown, okf, schema, studio, exploratory, usability, qa]
  recommended-models: ["GPT-5.6 Luna (copilot)"]
---

# Markdown Studio Exploratory QA

## Purpose

Run one explicitly requested exploratory QA campaign against the actual Markdown OKF-Schema
Studio extension in an isolated VS Code instance. Complement automated E2E assertions with
goal-based, human-style inspection of discoverability, consistency, feedback, visual clarity,
recovery, workflow friction, and observed accessibility concerns.

Accept an optional human-language goal alongside all four bundled journeys. Every invocation
dispatches the four differentiated persona/condition assignments; a custom goal adds an
observation target and never removes an assignment. Example requests:

- "Review first-time editing in Markdown Studio."
- "Explore OKF metadata authoring."
- "Run the full usability campaign, including my goal: recover after a render error."

Do not run a campaign for a generic code review or silently repeat one. Stop after the single
requested campaign and report its status.

## Inline Sibling Handoff

Treat an approved inline request from the sibling grill-me workflow as the complete intake. Do
not repeat its interview, create `goal.md`, `status.json`, planning artifacts, or campaign state
outside the timestamped QA output directory. Do not stage, commit, push, or modify product files.

## Campaign Rules

- Use the actual extension in a disposable, isolated VS Code desktop instance. Standalone
  browser fixtures and mock `acquireVsCodeApi` previews are supplemental evidence only.
- Do not report a journey as exercised until a tester has seen actual VS Code screenshots and
  operated visible controls using the helper's mouse or keyboard input.
- Dispatch four separate QA tester subagents for every invocation, with two first-time and two
  experienced author perspectives. Do not substitute the orchestrator's own observations for
  these assignments.
- Use goal-based briefs, not prescribed click scripts. Tell testers not to inspect product
  source, implementation tests, or E2E scripts. Provide only their brief, synthetic fixture,
  and user-facing documentation.
- Serialize UI access. Never let two testers operate one instance concurrently. Give each
  tester a distinct isolated instance and disposable fixture; launch, observe, and close one
  tester's instance before the next begins.
- Limit each initial assignment to 15 minutes or 50 meaningful UI input actions, whichever
  occurs first. Record the stopping limit, unfinished goal, and blockers.
- For each critical/high finding, ask a different tester to reproduce it for at most five
  additional minutes or 20 meaningful UI actions, whichever occurs first. Keep unreproduced
  observations clearly labeled.
- Inspect screenshots before DOM, logs, or source diagnostics. Diagnose only after recording
  the visible issue and its evidence. Never inject internal messages to simulate user actions.
- Do not auto-fix findings, change product source/tests, install dependencies, download VS Code,
  alter persistent settings, commit, or push. Ask for setup approval before any installation,
  download, or persistent configuration change.
- Retain reports and evidence under `output/qa/markdown-okf-schema-studio/` until manually
  removed. Stop child processes and remove disposable workspace/profile data after evidence is
  collected; never delete reports or screenshots as part of cleanup.
- Do not include secrets, unrelated private documents, or unrelated desktop windows in evidence.
  Use only the generated synthetic documents and the isolated VS Code window.
- Agent observations are not human-participant research. Distinguish visible facts from inferred
  user feelings, and do not claim accessibility conformance.

## Workflow

### 1. Prepare the run

1. Read the approved `spec-qa.md` and this skill's `references/journeys.md` and
   `references/report-template.md`. Load the extension's user-facing README or help pages to
   give testers the same guidance available to users. Do not give testers source or test files.
2. Create a unique UTC timestamped run directory at
   `output/qa/markdown-okf-schema-studio/<timestamp>/`. Copy the report template to `report.md`
   and create one tester note per assignment from `references/tester-notes-template.md`.
3. Record the Git revision and dirty-worktree state without changing or cleaning existing files.
   Record the extension package version, local VS Code version, Node version, operating system,
   assigned theme/width, and eventual extension bundle hash.
4. Confirm that `runSubagent` can accept the explicit model value `GPT-5.6 Luna (copilot)`.
   Dispatch every initial and reproduction tester with the tool's explicit `model` field set to
   that exact value. A subagent's display name or persona is not evidence of model selection.
   Record the requested model, the explicit dispatch evidence, and actual model only if the
   runtime exposes it independently.
5. If the exact model cannot be selected or dispatch is rejected, do not use a default. Ask the
   user with `vscode_askQuestions` which available model to use, or whether to cancel. Proceed
   only after the user's choice, and record the approved alternative. Do not dispatch any QA
   tester before the model requirement is resolved.

### 2. Prove actual UI access

1. Check for the already-installed local VS Code executable and existing extension dependencies.
   Do not run `npm install`, `npm ci`, a VS Code download, or any package-manager command that
   installs packages. If local dependencies or the application are missing, report `blocked`,
   explain the missing prerequisite, and request setup assistance.
2. For a real local build, run the extension's existing `npm run compile` and `npm run bundle`
  scripts from the repository root. These use installed dependencies and build output only. On
  failure, do not install or repair the product; ask for setup assistance.
3. Launch the isolated instance using the bundled helper. It creates a synthetic OKF finding,
   temporary profile, temporary extension directory, and a local CDP endpoint. It does not
   download VS Code or modify persistent settings.

   ```bash
   node .agents/skills/markdown-studio-exploratory-qa/scripts/vscode-ui.mjs launch \
     --run-dir output/qa/markdown-okf-schema-studio/<timestamp>/testers/<tester-id> \
     --theme light --width 1440
   ```

   Use `--theme dark` and a width of `1050` for narrow-pane assignments. Each launch reports
   its CDP target and saves an initial screenshot under that tester's `evidence/` directory.
4. Open the returned screenshot with the available image-viewing tool. Confirm that it shows the
  actual VS Code workbench and synthetic document, not a fixture page. Exercise a harmless
  extension-owned visible control using `click`, `press`, or `type`, capture a second screenshot,
  and verify that the real UI state changed. A global Command Palette invocation alone is not
  sufficient; the smoke must include genuine visible editor/Markdown Studio input and its
  extension-owned response, with no injected preview messages or test hooks. Do not dispatch
  testers until both screenshot inspection and this control-response check have succeeded.
5. If the CDP endpoint, screenshot, actual workbench, or input check fails, stop the instance,
   mark campaign status `blocked`, preserve failure logs, request setup assistance, and do not
   claim exploratory QA occurred. A successful helper launch alone is not proof of UI access.

### 3. Run the four assignments

Dispatch all four assignments, one subagent at a time, with the explicit model selection above.
Provide each tester its persona,
journey brief, theme/width, synthetic document path, the project's user-facing documentation,
its run directory, helper commands, time/action limits, and the note template. Keep source code,
E2E scripts, internal test fixtures, and mock previews out of tester context.

Use the assignments and conditions in `references/journeys.md`. For each tester:

1. Start a fresh helper session and confirm the expected theme, width, and synthetic fixture.
2. Capture and inspect a screenshot before the first interaction. Ask the tester to explore the
   assigned user goal naturally, using both mouse and keyboard where the workflow allows.
3. Save screenshots at meaningful states. Count every meaningful click, key command, or text
   entry as an action; screenshots and passive waiting do not count. Record action and elapsed
   time totals.
4. Have the tester note what worked as well as confusion, friction, visible failures, and
   recovery behavior. Separate direct observation from inferred emotion.
5. Permit DOM/log/source diagnostics only after the tester records a visible issue and a
   screenshot. Record diagnostic timing and source evidence separately from user-visible proof.
6. Stop at the first budget limit, save unfinished goals and blockers, and stop the helper before
   starting another tester.

A custom goal may be added to the four bundled assignments, but must not remove or collapse any
assignment. Keep the persona, theme, width, fixture, and journey conditions differentiated when
carrying the custom goal into the briefs.

### 4. Reproduce, consolidate, and clean up

1. Deduplicate equivalent findings while preserving each tester's evidence, differing results,
   and disagreement. Keep severity, confidence, and reproduction status as separate fields.
2. Independently recheck every critical/high finding with a different tester and fresh instance.
   Apply the five-minute/20-action cap per finding. Do not downgrade an observation solely
   because the independent tester could not reproduce it.
3. Complete `report.md` from `references/report-template.md`. Include all required fields and
  links to real screenshots, tester notes, and retained evidence relative to `report.md`.
  In each tester note, resolve links relative to that note's own directory; do not use links to
  temporary paths or console output as evidence. Include exercised behaviors that worked,
  untested areas, and campaign limitations.
  Before cleanup, retain copies of every relevant synthetic fixture, its schema, isolated
  settings/configuration context, and diagnostics gathered after visible observation under the
  run directory; do not leave only references into temporary paths or retain private data.
4. Mark each journey `successful`, `issues found`, `blocked`, or `untested`; mark the campaign
   `completed`, `partial`, or `blocked`. Completion means the assignments finished, not that the
   product passed or every surface was tested.
5. Verify all links resolve, findings contain a complete use case and reproduction path, and
  screenshots show the actual isolated VS Code window. Keep report/evidence; stop all helpers and
  remove only disposable profile, shared-data, extension, and workspace data. Cleanup is complete
  only when process identity/termination and directory deletion are verified in retained evidence.
  Run `verify-retained` for each tester after cleanup, then run it once more at the campaign root:
  it requires the consolidated `report.md`, every tester directory and note, every tester's
  retained evidence, and links resolved from each Markdown file. Report the retained campaign
  path and cleanup evidence paths.

## Helper Commands

Run helper commands from the repository root. All commands operate on the session named by
`--run-dir`; do not reuse a tester's session for another assignment.

```bash
node .agents/skills/markdown-studio-exploratory-qa/scripts/vscode-ui.mjs status \
  --run-dir <tester-run-dir>
node .agents/skills/markdown-studio-exploratory-qa/scripts/vscode-ui.mjs screenshot \
  --run-dir <tester-run-dir> --name after-open.png
node .agents/skills/markdown-studio-exploratory-qa/scripts/vscode-ui.mjs click \
  --run-dir <tester-run-dir> --x 420 --y 180
node .agents/skills/markdown-studio-exploratory-qa/scripts/vscode-ui.mjs type \
  --run-dir <tester-run-dir> --text 'A synthetic summary'
node .agents/skills/markdown-studio-exploratory-qa/scripts/vscode-ui.mjs press \
  --run-dir <tester-run-dir> --key 'Control+Shift+P'
node .agents/skills/markdown-studio-exploratory-qa/scripts/vscode-ui.mjs inspect \
  --run-dir <tester-run-dir>
node .agents/skills/markdown-studio-exploratory-qa/scripts/vscode-ui.mjs stop \
  --run-dir <tester-run-dir>
node .agents/skills/markdown-studio-exploratory-qa/scripts/vscode-ui.mjs verify-retained \
  --run-dir output/qa/markdown-okf-schema-studio/<timestamp>
```

Choose coordinates from the latest screenshot. Use `inspect` only after visual observation; it is
a diagnostic aid, not a substitute for seeing and operating the interface. The helper records
input metadata without persisting typed text. Load `references/journeys.md` for the four briefs
and fixture details, and `references/report-template.md` for consolidated output requirements.
The final campaign-root check must pass before reporting a completed campaign; a helper launch or
text-only report is not evidence of the real UI workflow.

Validate the skill package and helper entry point without installing dependencies:

```bash
node .agents/skills/markdown-studio-exploratory-qa/scripts/validate.mjs
```
