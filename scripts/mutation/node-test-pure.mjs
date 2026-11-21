/**
 * Pure parts of the Stryker `node:test` adapter (CR-450): no process, no file system, no Stryker
 * import, so `test/build/mutationTools.test.ts` can run them.
 *
 * A test ID is `<file>::<describe > ... > test>`: the compiled file path relative to `out/test/`
 * (slashes), then the full name chain, joined by " > ". A name used twice in one file gets a
 * ` #n` suffix on its second and later uses, so every ID is unique across the suite.
 */

export const ID_SEPARATOR = "::";
export const CHAIN_SEPARATOR = " > ";

/** Slash form of a compiled test file path, relative to the `out/test/` folder. */
export function relativeTestFile(file, testRoot) {
  const normal = file.replace(/\\/gu, "/");
  const root = `${testRoot.replace(/\\/gu, "/").replace(/\/+$/u, "")}/`;
  const index = normal.toLowerCase().lastIndexOf(root.toLowerCase());
  return index === -1 ? normal : normal.slice(index + root.length);
}

/** The ID of a test: `seen` (a Map owned by the file's registration) numbers the repeated names. */
export function buildTestId(relativeFile, chain, seen) {
  const base = `${relativeFile}${ID_SEPARATOR}${chain.join(CHAIN_SEPARATOR)}`;
  const count = (seen.get(base) ?? 0) + 1;
  seen.set(base, count);
  return count === 1 ? base : `${base} #${count}`;
}

/** The file and the readable name of an ID (the ID format above). */
export function parseTestId(id) {
  const at = id.indexOf(ID_SEPARATOR);
  return at === -1
    ? { file: "", name: id }
    : { file: id.slice(0, at), name: id.slice(at + ID_SEPARATOR.length) };
}

/** `test(name?, options?, fn?)` and its variants: the name, the options and the function. */
export function normalizeTestArguments(args) {
  let [name, options, fn] = args;
  if (typeof name === "function") {
    fn = name;
    name = undefined;
    options = undefined;
  } else if (typeof name === "object" && name !== null) {
    fn = options;
    options = name;
    name = undefined;
  } else if (typeof options === "function") {
    fn = options;
    options = undefined;
  }
  return { name: name ?? fn?.name ?? "<anonymous>", options, fn };
}

/**
 * The test files a mutant run needs: those that hold the covering tests of the filter (Stryker's
 * `testFilter`, a list of test IDs). No filter means every file.
 */
export function selectTestFiles(allFiles, testFilter) {
  if (!testFilter) return [...allFiles];
  const wanted = new Set(testFilter.map((id) => parseTestId(id).file));
  return allFiles.filter((file) => wanted.has(file));
}

/** The IDs one file may run for a filter, or undefined when the filter keeps all of them. */
export function allowedIds(testFilter, relativeFile) {
  if (!testFilter) return undefined;
  return new Set(testFilter.filter((id) => parseTestId(id).file === relativeFile));
}

const addCounts = (target, source) => {
  for (const [mutantId, hits] of Object.entries(source)) target[mutantId] = (target[mutantId] ?? 0) + hits;
};

/**
 * mt-Q9: one test file's coverage becomes per-test coverage only. `staticCoverage` is what ran while
 * the file loaded (outside any test); it is credited to every test of that file, never reported
 * as global static coverage, so a load-time mutant runs only the files that reach it.
 * `files` is `[{ tests: [id], staticCoverage, perTest: { id: { mutantId: hits } } }]`.
 */
export function mergeFileCoverage(files) {
  const perTest = {};
  for (const file of files) {
    for (const id of file.tests) {
      const entry = (perTest[id] ??= {});
      addCounts(entry, file.staticCoverage ?? {});
      addCounts(entry, file.perTest?.[id] ?? {});
    }
  }
  return { static: {}, perTest };
}

/** Test IDs that failed, in order: Stryker's `killedBy`. With bail on, only the first one. */
export function killers(results, disableBail) {
  const failed = results.filter((result) => result.status === "failed").map((result) => result.id);
  return disableBail ? failed : failed.slice(0, 1);
}
