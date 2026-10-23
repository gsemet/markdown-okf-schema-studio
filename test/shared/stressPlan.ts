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
