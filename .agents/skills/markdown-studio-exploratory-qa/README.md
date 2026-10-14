# Markdown Studio Exploratory QA

Run a focused exploratory review of the Markdown OKF-Schema Studio extension in an isolated
VS Code window. The tester works with a synthetic Markdown document and reports what worked,
what was confusing, and any visible issues. No product files are changed by the campaign.

## Run a Campaign

Ask Copilot to "Run the full Markdown Studio usability campaign" or give it a focused goal such
as "Review first-time editing" or "Explore OKF metadata authoring." Every invocation covers all
four bundled journeys; a focused goal adds an observation target to the differentiated
assignments. Add a custom natural-language goal to the request.

The skill first builds the local extension from already-installed dependencies, then checks that
an isolated VS Code instance can show real screenshots and accept visible mouse/keyboard input
through an extension-owned control. A Command Palette-only action does not satisfy this gate.
It will stop and request setup help if either check fails. It does not install packages or download
VS Code. The exact requested tester model is `GPT-5.6 Luna (copilot)`; Copilot will ask before
using another model if that selection is unavailable.

Missing dependencies are a setup blocker. The workflow does not run `npm ci`, download VS Code,
or change a persistent profile without asking first.

Every invocation runs all four bundled persona/condition assignments. An optional custom goal is
added to those assignments and never reduces their count.

Reports and evidence are retained under:

```text
output/qa/markdown-okf-schema-studio/<timestamp>/
```

Initial assignments stop after 15 minutes or 50 meaningful UI actions. Critical and high findings
receive an independent reproduction attempt by a different tester, capped at five minutes or 20
actions. Findings are not fixed during QA.

## Example Requests

- "Review first-time editing and report what helped or got in the way."
- "Explore OKF metadata authoring in a narrow pane and report reproducible issues."
- "Run the full campaign and include recovery after invalid metadata."

Reports are agent observations, not human-participant research or an accessibility certification.
Remove retained run folders manually when they are no longer needed.
