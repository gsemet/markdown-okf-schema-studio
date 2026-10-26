/**
 * Companion marker files (`just check-markers`).
 *
 * A `<name>.markers.ts` file under `src/` or `test/` holds requirement markers that cannot live in
 * the file they belong to (see "Companion marker files" in
 * `requirements/guidelines/requirements.guidelines.md`). Each one must:
 *
 * 1. name its host in a `// Companion of: <repo-relative path>` line, and that host file exists;
 * 2. hold only comment lines and `export {};`;
 * 3. mark only requirement ids that exist under `requirements/tiers/`.
 *
 * Files are the ones git tracks or would track (`.gitignore` applies).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "src", "test"], {
  cwd: root,
  encoding: "utf8",
});
const companions = listed.split("\0").filter((file) => file.endsWith(".markers.ts") && existsSync(path.join(root, file)));

/** Every requirement id: the requirement files are named after their id, in one folder per scope. */
const requirementIds = new Set(
  execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "requirements/tiers"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .map((file) => /(?:StRS|SwRS)-MDOKFSTUDIO-[A-Z]+-\d+(?=\.md$)/u.exec(file)?.[0])
    .filter(Boolean),
);
const requirementFile = (id) => requirementIds.has(id);

const problems = [];
for (const file of companions) {
  const lines = readFileSync(path.join(root, file), "utf8").split("\n");
  const host = lines.map((line) => /^\/\/ Companion of: (\S+)\s*$/u.exec(line)?.[1]).find(Boolean);
  if (!host) {
    problems.push(`${file}: no "// Companion of: <path>" line naming the host file`);
  } else if (!existsSync(path.join(root, host))) {
    problems.push(`${file}: the host file ${host} does not exist (the companion outlived the file it marks)`);
  }
  let markers = 0;
  lines.forEach((line, index) => {
    const where = `${file}:${index + 1}`;
    const trimmed = line.trim();
    if (trimmed !== "" && !trimmed.startsWith("//") && trimmed !== "export {};") {
      problems.push(`${where}: a companion holds only comment lines and "export {};"`);
    }
    const marker = /^\/\/ @(implements_req|tests_req) (\S+)\s*$/u.exec(trimmed);
    if (marker) {
      markers += 1;
      if (!requirementFile(marker[2])) problems.push(`${where}: ${marker[2]} is not a requirement of requirements/tiers/`);
    } else if (/@(implements_req|tests_req)\b/u.test(trimmed)) {
      problems.push(`${where}: malformed marker`);
    }
  });
  if (markers === 0) problems.push(`${file}: no marker (delete the companion)`);
}

if (problems.length > 0) {
  console.error(`check-markers: ${problems.length} problem(s)\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`check-markers: ${companions.length} companion marker file(s) ok`);
