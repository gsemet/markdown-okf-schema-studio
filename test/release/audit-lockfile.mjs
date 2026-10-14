import { readFileSync, writeFileSync } from "node:fs";
import { URL } from "node:url";

const [lockfilePath, reportPath] = process.argv.slice(2);

if (!lockfilePath || !reportPath) {
  throw new Error("Usage: audit-lockfile.mjs <lockfile> <report>");
}

const rawLockfile = readFileSync(lockfilePath, "utf8");
const lockfile = JSON.parse(rawLockfile);
const packageEntries = Object.values(lockfile.packages ?? {});
const resolvedEntries = packageEntries.filter(
  (entry) => typeof entry.resolved === "string",
);

function parseResolvedUrl(value) {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function hasCredentials(value) {
  const parsed = parseResolvedUrl(value);
  return Boolean(
    parsed &&
      (parsed.username ||
        parsed.password ||
        [...parsed.searchParams.keys()].some((key) =>
          /(?:auth|token|password|secret|key)/i.test(key),
        )),
  );
}

const resolvedUrls = resolvedEntries.map((entry) => entry.resolved);
const resolvedUrlsWithHosts = resolvedUrls
  .map(parseResolvedUrl)
  .filter((parsed) => parsed !== undefined);
const uniqueResolvedHosts = [
  ...new Set(resolvedUrlsWithHosts.map((parsed) => parsed.hostname)),
].sort();
const nonOfficialRegistryResolvedCount = resolvedEntries.filter((entry) => {
  const parsed = parseResolvedUrl(entry.resolved);
  return parsed?.protocol !== "https:" || parsed.hostname !== "registry.npmjs.org";
}).length;
const credentialResolvedCount = resolvedUrls.filter(hasCredentials).length;
const rawPublicRegistryUrlCount =
  rawLockfile.match(
    /https?:\/\/(?:registry\.npmjs\.org|registry\.yarnpkg\.com|registry\.pnpm\.io)/gi,
  )?.length ?? 0;
const report = {
  lockfileVersion: lockfile.lockfileVersion,
  packageCount: packageEntries.length,
  resolvedEntryCount: resolvedEntries.length,
  uniqueResolvedHosts,
  nonOfficialRegistryResolvedCount,
  credentialResolvedCount,
  rawPublicRegistryUrlCount,
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (
  report.nonOfficialRegistryResolvedCount > 0 ||
  report.credentialResolvedCount > 0
) {
  throw new Error(`Lockfile supply-chain audit failed: ${JSON.stringify(report)}`);
}
