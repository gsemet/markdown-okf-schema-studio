/**
 * Preload of the Stryker `node:test` adapter (CR-450): `node --import <this> --test <files>`.
 *
 * Mechanism chosen for the test IDs: this module hooks `Module._load` so that a CommonJS
 * `require("node:test")` returns a Proxy of the real module whose `test`, `it`, `describe` and
 * `suite` (and their `skip`, `todo`, `only` forms) register wrapped functions. The wrapper gives
 * every test its stable ID (node-test-pure.mjs), sets `__stryker__.currentTestId` while the test
 * body runs, clears it afterwards, times the test and records its status. At process exit the
 * file's results and the instrumented code's coverage are written to one JSON file, which the
 * adapter reads. The compiled tests of this project are CommonJS (no `"type": "module"`).
 *
 * Environment (set by the adapter, per run):
 *   STUDIO_NT_OUT      folder for the per-file result files (required)
 *   STUDIO_NT_ROOT     the compiled test root, `<sandbox>/out/test` (required)
 *   STUDIO_NT_FILTER   JSON file: { "<relative file>": ["<test id>", ...] }; absent = run everything
 *   STUDIO_NT_ACTIVE   the active mutant id (also read by the instrumented code's own header)
 *   STUDIO_NT_HITLIMIT the infinite-loop guard of the active mutant
 */
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";

import { buildTestId, normalizeTestArguments, relativeTestFile } from "./node-test-pure.mjs";

const require = createRequire(import.meta.url);
const Module = require("node:module");

const out = process.env.STUDIO_NT_OUT;
const testRoot = process.env.STUDIO_NT_ROOT;
const mainFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

// Only the per-file child processes of `node --test` are wrapped (NODE_TEST_CONTEXT is set there);
// the parent runner, which loads this preload too, is left alone.
if (out && testRoot && mainFile && process.env.NODE_TEST_CONTEXT) install();

function install() {
  const relativeFile = relativeTestFile(mainFile, testRoot);
  const namespace = (globalThis.__stryker__ ??= {});
  if (process.env.STUDIO_NT_ACTIVE) namespace.activeMutant = process.env.STUDIO_NT_ACTIVE;
  if (process.env.STUDIO_NT_HITLIMIT) {
    namespace.hitLimit = Number(process.env.STUDIO_NT_HITLIMIT);
    namespace.hitCount = 0;
  }
  let allowed;
  if (process.env.STUDIO_NT_FILTER) {
    const filter = JSON.parse(fs.readFileSync(process.env.STUDIO_NT_FILTER, "utf8"));
    allowed = new Set(filter[relativeFile] ?? []);
  }
  const seen = new Map();
  const stack = [];
  const registered = [];
  const results = [];

  const finish = (id, name, started, error) => {
    namespace.currentTestId = undefined;
    results.push({
      id,
      name,
      status: error === undefined ? "success" : "failed",
      timeSpentMs: Math.round((performance.now() - started) * 1000) / 1000,
      ...(error === undefined ? {} : { failureMessage: String(error?.stack ?? error?.message ?? error) }),
    });
  };

  const wrapBody = (id, name, fn) => {
    const run = (call) => {
      const started = performance.now();
      namespace.currentTestId = id;
      try {
        const returned = call();
        if (returned && typeof returned.then === "function") {
          return returned.then(
            (value) => (finish(id, name, started), value),
            (error) => {
              finish(id, name, started, error ?? new Error("rejected"));
              throw error;
            },
          );
        }
        finish(id, name, started);
        return returned;
      } catch (error) {
        if (results.at(-1)?.id !== id) finish(id, name, started, error ?? new Error("thrown"));
        throw error;
      }
    };
    if (fn.length >= 2) {
      // Callback style: test(name, (t, done) => ...).
      return function (t, done) {
        const started = performance.now();
        namespace.currentTestId = id;
        try {
          return fn.call(this, t, (error) => {
            finish(id, name, started, error);
            done(error);
          });
        } catch (error) {
          finish(id, name, started, error ?? new Error("thrown"));
          throw error;
        }
      };
    }
    return function (...args) {
      return run(() => fn.apply(this, args));
    };
  };

  const registerTest = (original, args) => {
    const { name, options, fn } = normalizeTestArguments(args);
    const id = buildTestId(relativeFile, [...stack, name], seen);
    if (allowed && !allowed.has(id)) return undefined;
    registered.push(id);
    const options_ = options === undefined ? [] : [options];
    return fn ? original(name, ...options_, wrapBody(id, name, fn)) : original(name, ...options_);
  };

  const registerSuite = (original, args) => {
    const { name, options, fn } = normalizeTestArguments(args);
    const options_ = options === undefined ? [] : [options];
    if (!fn) return original(name, ...options_);
    return original(name, ...options_, function (...inner) {
      stack.push(name);
      try {
        return fn.apply(this, inner);
      } finally {
        stack.pop();
      }
    });
  };

  const forms = (original, register) => {
    const wrapped = (...args) => register(original, args);
    for (const form of ["skip", "todo", "only", "expectFailure"]) {
      if (typeof original[form] === "function") {
        wrapped[form] = (...args) => register(original[form].bind(original), args);
      }
    }
    return wrapped;
  };

  const loadOriginal = Module._load;
  let proxy;
  Module._load = function (request, ...rest) {
    const loaded = loadOriginal.call(this, request, ...rest);
    if (request !== "node:test") return loaded;
    proxy ??= makeProxy(loaded);
    return proxy;
  };

  function makeProxy(real) {
    const test = forms(real.test ?? real, registerTest);
    const suite = forms(real.describe, registerSuite);
    const overrides = { test, it: test, describe: suite, suite };
    return new Proxy(real, {
      apply: (_target, _this, args) => test(...args),
      get: (target, property) => (property in overrides ? overrides[property] : Reflect.get(target, property)),
    });
  }

  process.on("exit", () => {
    try {
      fs.mkdirSync(out, { recursive: true });
      const coverage = namespace.mutantCoverage ?? { static: {}, perTest: {} };
      const name = createHash("sha1").update(relativeFile).digest("hex").slice(0, 12);
      fs.writeFileSync(
        path.join(out, `${name}.json`),
        JSON.stringify({
          file: relativeFile,
          registered,
          tests: results,
          staticCoverage: coverage.static ?? {},
          perTest: coverage.perTest ?? {},
        }),
      );
    } catch {
      // The adapter reports the missing result file.
    }
  });
}
