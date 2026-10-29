/**
 * The TEST PROFILE of the real VS Code windows: user settings and command-line flags that switch
 * off what can move the keyboard focus inside the workbench while a real-window step types or
 * clicks (a chat view that opens, a toast, a walkthrough, an update notice). They are written to
 * the per-launch user-data directory (`User/settings.json`) by the integration launcher
 * (`test/integration/run-tests.ts`) and the reload suite (`reload-suite.ts`); the command-line
 * flags are passed only by `run-tests.ts` (the reload window gets the settings alone). The product
 * never reads this file. User settings, not workspace settings: several of them are application-scoped,
 * which VS Code ignores in a `.code-workspace`.
 *
 * Every name was checked against the VS Code build the harness runs (1.143: the setting schemas of
 * `workbench.desktop.main.js` and of the built-in `git` and `copilot` extensions). Not set on
 * purpose:
 * - `git.autoRepositoryDetection`: the incoming-changes scenario needs the Git extension to open
 *   the repository of its fixture.
 * - `security.workspace.trust.enabled` and `--disable-workspace-trust` in the Restricted Mode
 *   window: the untrusted suite checks that the workspace stays untrusted (runTests already passes
 *   `--disable-workspace-trust` to the trusted windows).
 * - `window.restoreWindows`: every launch gets a fresh user-data directory, there is nothing to
 *   restore.
 *
 * | Setting or flag | Value | Why it is off in the test profile |
 * | --- | --- | --- |
 * | `chat.disableAIFeatures` | `true` | Chat and Copilot (bundled since 1.10x) open views, setup prompts and model selection in the window; CI hang logs of a block editor that lost the focus show `ChatModelSelection` lines. |
 * | `workbench.secondarySideBar.defaultVisibility` | `"hidden"` | The default (`visibleInWorkspace`) opens the auxiliary bar with the chat view when the workspace opens. |
 * | `github.copilot.enable` | `{"*": false}` | No Copilot inline completion triggered in an editor of the test window. |
 * | `github.copilot.nextEditSuggestions.enabled` | `false` | No next-edit suggestion widget over an editor. |
 * | `editor.inlineSuggest.enabled` | `false` | No inline suggestion (ghost text) from any provider over an editor. |
 * | `workbench.startupEditor` | `"none"` | No Welcome or agent sessions page opened at startup. |
 * | `workbench.welcomePage.walkthroughs.openOnInstall` | `false` | No walkthrough editor opened when an extension is installed or enabled. |
 * | `workbench.tips.enabled` | `false` | No tips in an empty editor group. |
 * | `update.mode` | `"none"` | No update check and no "restart to update" notification (with `--disable-updates`). |
 * | `update.showReleaseNotes` | `false` | No release notes editor after a version change (with `--skip-release-notes`). |
 * | `extensions.ignoreRecommendations` | `true` | No extension recommendation toast (Markdown, YAML, Python files in the workspace). |
 * | `extensions.autoCheckUpdates` | `false` | No extension update check from the gallery. |
 * | `extensions.autoUpdate` | `"off"` | No extension update and no "reload to update" notification. |
 * | `telemetry.telemetryLevel` | `"off"` | No telemetry notice and no telemetry traffic from the test window. |
 * | `workbench.enableExperiments` | `false` | No online experiment that flips a default (chat, agents, layout) during a run. |
 * | `git.openRepositoryInParentFolders` | `"never"` | No "a Git repository was found in the parent folders" notification for the `/tmp` workspace folder. |
 * | `security.workspace.trust.startupPrompt` | `"never"` | No modal trust dialog at startup; the trust state itself is unchanged (the Restricted Mode window stays untrusted). |
 * | `--disable-extension GitHub.copilot-chat` | flag | The Copilot Chat extension is built into VS Code and activates on startup finished; disabled in the test windows the launcher starts directly or through runTests. |
 */
import * as fs from "node:fs";
import * as path from "node:path";

export interface TestProfileEntry {
  /** Setting name, or the command-line flag for a flag entry. */
  readonly name: string;
  /** Setting value; `undefined` for a flag. */
  readonly value?: unknown;
  readonly reason: string;
}

/** User settings of the test profile, with the reason of each (the table above). */
export const TEST_PROFILE_SETTINGS: readonly TestProfileEntry[] = Object.freeze([
  { name: "chat.disableAIFeatures", value: true,
    reason: "chat and Copilot open views, setup prompts and model selection in the window" },
  { name: "workbench.secondarySideBar.defaultVisibility", value: "hidden",
    reason: "the default opens the auxiliary bar with the chat view when the workspace opens" },
  { name: "github.copilot.enable", value: { "*": false },
    reason: "no Copilot inline completion in an editor of the test window" },
  { name: "github.copilot.nextEditSuggestions.enabled", value: false,
    reason: "no next-edit suggestion widget over an editor" },
  { name: "editor.inlineSuggest.enabled", value: false,
    reason: "no inline suggestion (ghost text) over an editor" },
  { name: "workbench.startupEditor", value: "none",
    reason: "no Welcome or agent sessions page at startup" },
  { name: "workbench.welcomePage.walkthroughs.openOnInstall", value: false,
    reason: "no walkthrough editor when an extension is installed or enabled" },
  { name: "workbench.tips.enabled", value: false,
    reason: "no tips in an empty editor group" },
  { name: "update.mode", value: "none",
    reason: "no update check and no restart-to-update notification" },
  { name: "update.showReleaseNotes", value: false,
    reason: "no release notes editor after a version change" },
  { name: "extensions.ignoreRecommendations", value: true,
    reason: "no extension recommendation toast" },
  { name: "extensions.autoCheckUpdates", value: false,
    reason: "no extension update check" },
  { name: "extensions.autoUpdate", value: "off",
    reason: "no extension update and no reload-to-update notification" },
  { name: "telemetry.telemetryLevel", value: "off",
    reason: "no telemetry notice and no telemetry traffic" },
  { name: "workbench.enableExperiments", value: false,
    reason: "no online experiment that flips a default during a run" },
  { name: "git.openRepositoryInParentFolders", value: "never",
    reason: "no parent-folder repository notification for the /tmp workspace folder" },
  { name: "security.workspace.trust.startupPrompt", value: "never",
    reason: "no modal trust dialog at startup; the trust state is unchanged" },
] as const);

/** Command-line flags of the test profile, with the reason of each (the table above). */
export const TEST_PROFILE_FLAGS: readonly TestProfileEntry[] = Object.freeze([
  { name: "--disable-extension=GitHub.copilot-chat",
    reason: "the built-in Copilot Chat extension activates on startup finished" },
] as const);

/** The `User/settings.json` object of the test profile. */
export function testProfileUserSettings(): Record<string, unknown> {
  return Object.fromEntries(TEST_PROFILE_SETTINGS.map((entry) => [entry.name, entry.value]));
}

/** The command-line flags of the test profile, ready to append to a VS Code launch. */
export function testProfileLaunchArgs(): string[] {
  return TEST_PROFILE_FLAGS.map((entry) => entry.name);
}

/** Writes the test profile's `User/settings.json` into a fresh VS Code user-data directory. */
export function writeTestProfileSettings(userDataDirectory: string): void {
  fs.mkdirSync(path.join(userDataDirectory, "User"), { recursive: true });
  fs.writeFileSync(path.join(userDataDirectory, "User", "settings.json"),
    JSON.stringify(testProfileUserSettings(), null, 2));
}
