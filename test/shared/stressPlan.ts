/**
 * Stress mode of the real-input suite (`just ci-stress`): the flake-prone scenarios run again and
 * again in one VS Code window, so a race shows up on CI instead of once a week. A pass of N rounds
 * is the evidence that a flake fix holds; a retry never is.
 *
 * - `STUDIO_STRESS_REPEAT`: rounds, an integer from 1 to 100 (default `defaultRepeat`).
 * - `STUDIO_STRESS_SCENARIOS`: optional comma-separated names to run, in the order given; every
 *   name must be one of `available` (default: all of them, in their own order).
 */
export interface StressPlan {
  repeat: number;
  scenarios: string[];
}

export const MAX_STRESS_REPEAT = 100;

export function stressPlan(
  environment: { STUDIO_STRESS_REPEAT?: string; STUDIO_STRESS_SCENARIOS?: string },
  available: readonly string[],
  defaultRepeat = 10,
): StressPlan {
  const rawRepeat = environment.STUDIO_STRESS_REPEAT?.trim() ?? "";
  const repeat = rawRepeat === "" ? defaultRepeat : Number(rawRepeat);
  if (!/^\d*$/u.test(rawRepeat) || !Number.isSafeInteger(repeat) || repeat < 1 || repeat > MAX_STRESS_REPEAT) {
    throw new Error(`STUDIO_STRESS_REPEAT must be an integer from 1 to ${MAX_STRESS_REPEAT}, got "${rawRepeat}"`);
  }
  const requested = (environment.STUDIO_STRESS_SCENARIOS ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");
  const unknown = requested.filter((name) => !available.includes(name));
  if (unknown.length > 0) {
    throw new Error(`Unknown stress scenario(s) ${unknown.join(", ")}; available: ${available.join(", ")}`);
  }
  const scenarios = requested.length > 0 ? [...new Set(requested)] : [...available];
  if (scenarios.length === 0) throw new Error("No stress scenario to run");
  return { repeat, scenarios };
}

/**
 * The two VS Code windows the stress job opens: the trusted one (`--trusted-only`, the real-input
 * suite) and the Restricted Mode one (`--untrusted-only`). Each window runs only its own names.
 */
export type StressHost = "trusted" | "untrusted";

/**
 * Every stress scenario, by the window that runs it (CI rule 12: a new real-window scenario is added
 * here and proved by the `stress` job before it stays in the required integration job). The
 * trusted list is the key list of the real-input suite's stress table, which checks it at start.
 */
export const STRESS_SCENARIOS_BY_HOST: Readonly<Record<StressHost, readonly string[]>> = {
  trusted: [
    // CR 041: each failed on CI as a race at least once.
    "frontmatter-rename",
    "frontmatter-title",
    "table-tab",
    "list-editor",
    "flush-cell-frontmatter",
    "flush-frontmatter-typed",
    // CR 043 (P9 T2): new real-window captures.
    "incoming-changes",
    "review-threads",
    "image-paste",
    // CR 044: the watcher event of a linked target's save.
    "linked-target-save",
    // CR 048: the slash menu once did not open after a line break in a full local run.
    "slash-menu",
    "save-position",
    "alert-dropdown",
    // The edit toggle right after a host theme change: three clicks once did not switch it.
    "toc",
    // Find in preview: a late block editor focus once failed it on a heavy run only.
    "find-in-preview",
  ],
  untrusted: ["untrusted-read-only"],
};

/**
 * The plan of one window. `STUDIO_STRESS_SCENARIOS` may name scenarios of either window (unknown
 * names fail in both); the window keeps the ones it runs. `undefined`: nothing to run here.
 */
export function hostStressPlan(
  environment: { STUDIO_STRESS_REPEAT?: string; STUDIO_STRESS_SCENARIOS?: string },
  host: StressHost,
  defaultRepeat = 10,
): StressPlan | undefined {
  const all = [...STRESS_SCENARIOS_BY_HOST.trusted, ...STRESS_SCENARIOS_BY_HOST.untrusted];
  const plan = stressPlan(environment, all, defaultRepeat);
  const own = STRESS_SCENARIOS_BY_HOST[host];
  const scenarios = plan.scenarios.filter((name) => own.includes(name));
  return scenarios.length === 0 ? undefined : { repeat: plan.repeat, scenarios };
}
