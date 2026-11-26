/**
 * The launches of the trusted window. The full run is too long for one launch deadline, so it runs
 * as two parts, each in its own VS Code window with its own deadline. `run-tests` launches the parts
 * and passes `STUDIO_TRUSTED_PART`; `trusted-suite.ts` runs the steps of the part it received. A
 * `STUDIO_REAL_INPUT_SCENARIO` run stays one launch with no part.
 *
 * No vscode: unit-testable.
 */

/** The steps of each part, in the order they run. Both parts open with `setup` and `preview-smoke`. */
export const TRUSTED_PART_STEPS = {
  "1": [
    "setup", "preview-smoke", "project-features", "hostile-html", "stock-coexistence", "open-at-line",
    "open-at-line-probe", "open-at-line-studio", "checkbox-toggle", "radio-choice", "table-empty-column",
    "edit-toolbar-cover", "tall-block-scroll", "block-actions", "find-in-preview",
    "edit-keys", "save-key", "grid-card-editor-blur", "paste-url", "drop-files", "window-switch-keys",
    "preview-history", "export-html", "palette-mode", "label-rename", "inline-thread", "block-move",
    "block-clipboard", "empty-blocks", "blank-lines", "myst-pickers", "image-picker", "image-paste",
    "incoming-changes", "update-glow", "review-comments", "comment-write", "comment-contrast", "comment-title",
    "readme-html", "toc", "myst-blocks", "comment-anchors", "generic-markdown", "dirty-snapshots",
    "source-mapping", "diff-preview", "diff-preview-scroll", "side-preview-jump", "lifecycle",
    "myst-diagnostics", "serializer", "workspace-disposal",
  ],
  "2": ["setup", "preview-smoke", "real-input", "preview-editing"],
} as const;

export type TrustedPart = keyof typeof TRUSTED_PART_STEPS;
export type TrustedStepName = (typeof TRUSTED_PART_STEPS)[TrustedPart][number];

function isTrustedPart(value: string): value is TrustedPart {
  return Object.hasOwn(TRUSTED_PART_STEPS, value);
}

/**
 * The part `STUDIO_TRUSTED_PART` selects, or undefined for a `STUDIO_REAL_INPUT_SCENARIO` run. An
 * unknown value always fails; a missing one fails unless a scenario is set.
 */
export function trustedPartFromEnvironment(environment: NodeJS.ProcessEnv): TrustedPart | undefined {
  const value = environment.STUDIO_TRUSTED_PART ?? "";
  if (value !== "" && !isTrustedPart(value)) {
    throw new Error(`STUDIO_TRUSTED_PART must be 1 or 2, got "${value}".`);
  }
  if (environment.STUDIO_REAL_INPUT_SCENARIO !== undefined) return undefined;
  if (value === "") {
    throw new Error("STUDIO_TRUSTED_PART is not set: the full trusted run has two launches, so set it to 1 or 2 "
      + "(only a STUDIO_REAL_INPUT_SCENARIO run is a single launch).");
  }
  return value;
}

/** What tells one trusted launch from another. */
export interface TrustedLaunch {
  readonly part: TrustedPart | undefined;
  readonly suiteFile: "trusted-suite.js";
  /** Names the launch in the log and in a LAUNCH TIMEOUT or LAUNCH HANG line. */
  readonly name: string;
  /** The suite of its heartbeat: in the heartbeat file name and its `suite` field. */
  readonly suite: string;
  /** Names the part in the folder of a launch dump. */
  readonly dumpLabel: string | undefined;
  /** Whether it writes the frontmatter evidence, which the launcher completes with the suite result. */
  readonly runsPreviewEditing: boolean;
}

/** The launch of a part, or the single launch of a scenario run (undefined). */
export function trustedLaunch(part: TrustedPart | undefined): TrustedLaunch {
  const suiteFile = "trusted-suite.js";
  if (part === undefined) {
    return { part, suiteFile, name: suiteFile, suite: "trusted-suite", dumpLabel: undefined, runsPreviewEditing: false };
  }
  const steps: readonly TrustedStepName[] = TRUSTED_PART_STEPS[part];
  return {
    part,
    suiteFile,
    name: `${suiteFile} part ${part}/${Object.keys(TRUSTED_PART_STEPS).length}`,
    suite: `trusted-suite-part-${part}`,
    dumpLabel: `trusted-part-${part}`,
    runsPreviewEditing: steps.includes("preview-editing"),
  };
}

/** The trusted launches of a run, in order. */
export function trustedLaunches(environment: NodeJS.ProcessEnv): readonly TrustedLaunch[] {
  if (environment.STUDIO_REAL_INPUT_SCENARIO !== undefined) return [trustedLaunch(undefined)];
  return [trustedLaunch("1"), trustedLaunch("2")];
}
