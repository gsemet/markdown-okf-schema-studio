/** Parser of the `### Main paths` section of a StRS (format: requirements/guidelines/project.guidelines.md). */

export type OptionKind = "nominal" | "boundary" | "refusal";

/** A SwRS cited by a step: the way to the next state, or another outcome at the state. */
export interface PathTransition {
  readonly id: string;
  readonly label: string;
  /** The scenario kind of an `Option` bullet; it picks the scenarios of the SwRS that the option covers. */
  readonly kind?: OptionKind;
}

export interface PathStep {
  readonly state: string;
  /** The first bullet without `Option`; absent on the last state of a path. */
  readonly via?: PathTransition;
  readonly options: readonly PathTransition[];
}

export interface MainPath {
  readonly title: string;
  readonly steps: readonly PathStep[];
}

const HEADING = /^###\s+Main paths\s*$/mu;
const PATH_HEADING = /^####\s+Path\s*\d*\s*:?\s*(.*?)\s*$/u;
const STATE = /^\s*\d+\.\s+(.*?)\s*$/u;
const BULLET = /^\s+-\s+(Option\s+)?(SwRS-[A-Za-z0-9-]+?)(?:\s*\((nominal|boundary|refusal)\))?\s*:\s*(.*?)\s*$/u;

/** The paths of the section of `text` (the whole requirement file); an empty list when it has none. */
export function parseMainPaths(text: string): MainPath[] {
  const start = HEADING.exec(text);
  if (!start) return [];
  const section = text.slice(start.index + start[0].length);
  const paths: { title: string; steps: { state: string; via?: PathTransition; options: PathTransition[] }[] }[] = [];
  for (const line of section.split("\n")) {
    if (/^(?:#{1,3}\s|<!--)/u.test(line)) break;
    const heading = PATH_HEADING.exec(line);
    if (heading) {
      paths.push({ title: heading[1] ?? "", steps: [] });
      continue;
    }
    const current = paths[paths.length - 1];
    if (!current) continue;
    const state = STATE.exec(line);
    if (state && !/^\s/u.test(line)) {
      current.steps.push({ state: state[1] ?? "", options: [] });
      continue;
    }
    const bullet = BULLET.exec(line);
    const step = current.steps[current.steps.length - 1];
    if (!bullet || !step) continue;
    const transition: PathTransition = { id: bullet[2] ?? "", label: bullet[4] ?? "", ...(bullet[3] ? { kind: bullet[3] as OptionKind } : {}) };
    if (bullet[1]) step.options.push(transition);
    else if (!step.via) step.via = transition;
  }
  return paths.filter((path) => path.steps.length > 0);
}

/** Every SwRS id a list of paths cites, in order of appearance, once. */
export function citedIds(paths: readonly MainPath[]): string[] {
  const ids = new Set<string>();
  for (const path of paths) {
    for (const step of path.steps) {
      if (step.via) ids.add(step.via.id);
      for (const option of step.options) ids.add(option.id);
    }
  }
  return [...ids];
}
