/**
 * What the acceptance runner (`test/integration/acceptanceRunner.ts`) decides before and after its
 * VS Code launches: which files run, in which kind of window, and under which campaign identity.
 * Pure: no vscode, no playwright, unit-testable. It reads names and file contents, never the
 * modules, which import vscode.
 */
import { GROUPS, isGroupId, type GroupId } from "./e2eGroups";

/** How a file's window is launched; the file exports it as `windowKind`. */
export type WindowKind = "trusted" | "restricted" | "vsix";

/** Folder of the acceptance files, from the extension root. */
export const ACCEPTANCE_SOURCE_DIR = "test/integration/acceptance";

export interface AcceptanceFile {
  /** `<group>.acceptance` or `<group>.<kind>.acceptance`: the file name without its extension. */
  readonly name: string;
  readonly group: GroupId;
}

const FILE_NAME = /^(?<name>(?<group>[a-z0-9-]+)(?:\.[a-z0-9-]+)?\.acceptance)\.ts$/u;
const ANY_ACCEPTANCE_NAME = /\.acceptance\.ts$/u;

/**
 * The acceptance files among the names of {@link ACCEPTANCE_SOURCE_DIR}, in `GROUPS` order, then by
 * name. `group` keeps one group's files. Throws for a file whose name names no group, and when
 * nothing is left to run.
 */
export function selectAcceptanceFiles(fileNames: readonly string[], group?: GroupId): AcceptanceFile[] {
  const files: AcceptanceFile[] = [];
  for (const fileName of fileNames.filter((name) => ANY_ACCEPTANCE_NAME.test(name))) {
    const parts = FILE_NAME.exec(fileName)?.groups;
    if (!parts || !isGroupId(parts.group!)) {
      throw new Error(`${ACCEPTANCE_SOURCE_DIR}/${fileName} is not named <group>[.<kind>].acceptance.ts `
        + "after a group of test/shared/e2eGroups.ts.");
    }
    files.push({ name: parts.name!, group: parts.group as GroupId });
  }
  const order = (file: AcceptanceFile): number => GROUPS.findIndex((candidate) => candidate.id === file.group);
  const selected = files
    .filter((file) => group === undefined || file.group === group)
    .sort((left, right) => order(left) - order(right) || (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
  if (selected.length === 0) {
    throw new Error(group === undefined
      ? `No acceptance file under ${ACCEPTANCE_SOURCE_DIR}/.`
      : `Group ${group} has no acceptance file (${ACCEPTANCE_SOURCE_DIR}/${group}.acceptance.ts).`);
  }
  return selected;
}

const WINDOW_KIND = /^export const windowKind(?:: WindowKind)? = "(trusted|restricted|vsix)";\r?$/gmu;

/** The window kind a file's source declares. */
export function windowKindOf(source: string, fileName: string): WindowKind {
  const declared = [...source.matchAll(WINDOW_KIND)];
  if (declared.length !== 1) {
    throw new Error(`${fileName} must declare its window once, as one line `
      + '`export const windowKind: WindowKind = "trusted" | "restricted" | "vsix"` with one of the three values.');
  }
  return declared[0]![1] as WindowKind;
}

/**
 * True when the run id of this run was pinned by the CI workflow: the campaign file that
 * `e2e-campaign.mjs begin acceptance` wrote says so, and it is the campaign of this environment.
 * A file left by another campaign never marks this run as pinned.
 */
export function pinnedRunIdOf(campaign: unknown, environment: NodeJS.ProcessEnv): boolean {
  if (typeof campaign !== "object" || campaign === null) return false;
  const { runId, startedAt, pinnedRunId } = campaign as Record<string, unknown>;
  return pinnedRunId === true && typeof runId === "string" && runId === environment.STUDIO_E2E_RUN_ID
    && typeof startedAt === "string" && startedAt === environment.STUDIO_E2E_STARTED_AT;
}
