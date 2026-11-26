/**
 * Arguments of the integration launcher (`test/integration/run-tests.ts`), parsed before any
 * manifest is written and before any VS Code starts. Pure: no vscode, no playwright, unit-testable.
 */
import { GROUP_IDS, isGroupId, type GroupId } from "./e2eGroups";

/** The integration suites one launcher run asks for. */
export type IntegrationScope = "reload" | "trusted" | "reverse-migration" | "untrusted" | "scroll" | "all";

export type RunnerArgs =
  | {
    readonly mode: "integration";
    /** Which suites run. */
    readonly suites: IntegrationScope;
    /** The `scope` of `integration-manifest.json`. */
    readonly scope: IntegrationScope;
  }
  | {
    /** `--acceptance-only`: the StRS acceptance files and nothing else. */
    readonly mode: "acceptance";
    /** `--group <id>`: only that group's files; without it, every group's files. */
    readonly group?: GroupId;
  };

const FLAGS = {
  reload: "--reload-only",
  trusted: "--trusted-only",
  "reverse-migration": "--reverse-migration-only",
  untrusted: "--untrusted-only",
  scroll: "--scroll-only",
} as const;

/** With several scope flags, the first of this order decides what runs... */
const SUITES_ORDER = ["reload", "trusted", "reverse-migration", "untrusted", "scroll"] as const;
/** ...and the first of this one names the run in its manifest. */
const SCOPE_ORDER = ["reload", "trusted", "untrusted", "reverse-migration", "scroll"] as const;

function groupArgument(args: readonly string[]): GroupId | undefined {
  if (args.some((argument) => argument.startsWith("--group="))) {
    throw new Error("Write the group as `--group <id>`, not `--group=<id>`.");
  }
  const at = args.indexOf("--group");
  if (at === -1) return undefined;
  if (args.indexOf("--group", at + 1) !== -1) throw new Error("--group is given twice; one run takes one group.");
  const value = args[at + 1];
  if (value === undefined || !isGroupId(value)) {
    throw new Error(`--group needs an e2e group id, got ${value === undefined ? "nothing" : JSON.stringify(value)}. `
      + `Groups (test/shared/e2eGroups.ts): ${GROUP_IDS.join(", ")}.`);
  }
  return value;
}

/** Parses the launcher's arguments (`process.argv.slice(2)`); throws on a `--group` it refuses. */
export function parseRunnerArgs(args: readonly string[]): RunnerArgs {
  const group = groupArgument(args);
  if (args.includes("--acceptance-only")) {
    return group === undefined ? { mode: "acceptance" } : { mode: "acceptance", group };
  }
  if (group !== undefined) throw new Error("--group is only for the acceptance files: add --acceptance-only.");
  const first = (order: readonly (keyof typeof FLAGS)[]): IntegrationScope =>
    order.find((scope) => args.includes(FLAGS[scope])) ?? "all";
  return { mode: "integration", suites: first(SUITES_ORDER), scope: first(SCOPE_ORDER) };
}
