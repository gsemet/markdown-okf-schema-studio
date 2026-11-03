/**
 * The {@link SchemaFiles} port on Node's synchronous `fs`: the schema discovery of the frontmatter
 * analysis in every host that runs the core in Node.
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type { SchemaFiles } from "../core/frontmatter/schemaFiles";

function isDirectory(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

function isFile(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-019
// The file names of a schema directory change only when an entry is added, removed or renamed,
// and that moves the directory's own modification time. A render lists the directory, so the
// listing (a readdir and one stat per entry) is kept while one stat of the directory still shows
// the same time; a changed time, or a directory that cannot be read, lists again.
// File times advance in clock steps (about 15 ms on Windows, 2 s on FAT), so an entry added in
// the same step as the listing leaves the time unchanged: a listing read while the modification
// time is younger than RECENT_CHANGE_MS is not kept.
const MAX_LISTED_DIRECTORIES = 64;
const RECENT_CHANGE_MS = 2_000;
const listings = new Map<string, { stamp: string; names: string[] }>();

function directoryStamp(dir: string): { stamp: string; modifiedMs: number } | undefined {
  try {
    const stats = fs.statSync(dir);
    return stats.isDirectory()
      ? { stamp: `${stats.mtimeMs}:${stats.ctimeMs}:${stats.ino}`, modifiedMs: stats.mtimeMs }
      : undefined;
  } catch {
    return undefined;
  }
}

function listFiles(dir: string): string[] {
  const current = directoryStamp(dir);
  if (current === undefined) {
    listings.delete(dir);
    return [];
  }
  const { stamp, modifiedMs } = current;
  const known = listings.get(dir);
  if (known?.stamp === stamp) return [...known.names];
  try {
    const names = fs.readdirSync(dir).filter((name) => {
      try {
        return fs.statSync(path.join(dir, name)).isFile();
      } catch {
        return false;
      }
    });
    if (Date.now() - modifiedMs < RECENT_CHANGE_MS) {
      listings.delete(dir);
    } else {
      if (listings.size >= MAX_LISTED_DIRECTORIES) listings.clear();
      listings.set(dir, { stamp, names });
    }
    return [...names];
  } catch {
    return [];
  }
}

/** Schema files on the local disk. */
export const nodeSchemaFiles: SchemaFiles = {
  isDirectory,
  isFile,
  listFiles,
  readText: (schemaPath) => fs.readFileSync(schemaPath, "utf8"),
};
