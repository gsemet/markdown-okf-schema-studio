/** Markdown rendering of the mutation summary (CR-450, spec 4.6); pure, used by scripts/mutation-report.mjs. */

const pct = (value) => (value === undefined ? "n/a" : `${value.toFixed(1)}%`);
const cell = (text) => String(text).replace(/\|/gu, "\\|").replace(/\s+/gu, " ");

const MAX_ROWS = 150;

/** A Markdown table of at most MAX_ROWS rows: summary.json holds the whole list. */
function table(header, rows) {
  if (rows.length === 0) return "None.\n";
  const shown = rows.slice(0, MAX_ROWS);
  const more = rows.length > shown.length ? `\n${rows.length - shown.length} more row(s): see summary.json.\n` : "";
  return [`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`, ...shown.map((row) => `| ${row.map(cell).join(" | ")} |`)].join("\n") + "\n" + more;
}

const statuses = (counts) => Object.entries(counts).map(([status, count]) => `${count} ${status}`).join(", ");

export function renderSummary(summary) {
  const out = [];
  out.push("# Mutation summary", "");
  out.push(`Generated ${summary.generated}. Phases: core${summary.phases.others ? ", others" : " (the others phase did not run)"}.`, "");
  out.push(`Mutants: ${statuses(summary.mutants)}. Tests that ran: ${summary.tests}.`, "");

  out.push("## Score per sub-folder of src/core", "");
  out.push(table(["folder", "score", "killed", "survived", "no coverage", "timeout", "compile error", "ignored", "holes only another layer kills", "score with other layers"],
    summary.folders.map((f) => [f.folder, pct(f.score), f.counts.Killed ?? 0, f.counts.Survived ?? 0, f.counts.NoCoverage ?? 0, f.counts.Timeout ?? 0, f.counts.CompileError ?? 0, f.counts.Ignored ?? 0, f.onlyOtherLayer, pct(f.scoreWithOtherLayers)])));

  out.push("## Score per SwRS", "", "Share of the mutants reached by the tests of the SwRS that those tests kill (a test can carry several IDs, so the shares overlap).", "");
  out.push(table(["SwRS", "tests", "mutants reached", "killed", "score"], summary.swrs.map((s) => [s.id, s.tests, s.reached, s.killed, pct(s.score)])));

  out.push("## Tests that kill nothing", "", "Tests that reach killable mutants and kill none of them (zero-kill candidates).", "");
  out.push(table(["test", "mutants reached"], summary.zeroKill.map((t) => [t.name, statuses(t.reached)])));

  out.push("## Redundant tests (greedy set)", "", `A keeper set of ${summary.keepers} test(s) kills every killed mutant; the others below add nothing the keepers do not kill. Two duplicate tests are never both listed: one of them is a keeper.`, "");
  out.push(table(["redundant test", "killed mutants", "also killed by keepers"], summary.redundant.map((t) => [t.name, t.mutants.length, [...new Set(t.mutants.flatMap((m) => m.killedAlsoBy))].length + " keeper(s), for example " + ([...new Set(t.mutants.flatMap((m) => m.killedAlsoBy))][0] ?? "").split("::")[0]])));

  out.push("## Tests not judged", "", "Tests whose mutants are all excluded, timed out or not compilable: the run cannot say whether they matter.", "");
  out.push(table(["test", "reason"], [...summary.notJudged.map((t) => [t.name, t.reason]), ...summary.reachesNothing.map((name) => [name, "reaches no mutant of the sampled files"])]));

  out.push("## Holes", "", "Mutants no test of src/core kills (survived or no coverage), labelled by the others phase.", "");
  out.push(table(["file", "line", "mutator", "replacement", "status", "label", "killed by"],
    summary.holes.map((h) => [h.file, `${h.line}:${h.column}`, h.mutator, h.replacement.slice(0, 60), h.status, h.label, h.killedBy.join("; ")])));

  out.push("## Test files left out", "");
  out.push(Object.keys(summary.testFilesLeftOut).length === 0 ? `None: all ${summary.testFilesRun.length} test files ran.\n` : table(["file", "reason"], Object.entries(summary.testFilesLeftOut)));
  return out.join("\n");
}
