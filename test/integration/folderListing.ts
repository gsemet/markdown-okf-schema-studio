import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Describes a folder for a test failure message. It never throws: a file that is renamed or deleted
 * between the listing and the stat (the host's hidden `.partial` file) is reported as gone.
 */
export function describeFolder(
  directory: string,
  statFile: (file: string) => { size: number } | undefined = (file) => fs.statSync(file, { throwIfNoEntry: false }),
): string {
  let names: string[];
  try {
    names = fs.readdirSync(directory);
  } catch (error) {
    return `<cannot list ${directory}: ${String(error)}>`;
  }
  return names.map((name) => {
    try {
      const stat = statFile(path.join(directory, name));
      return stat ? `${name} (${stat.size} B)` : `${name} (gone during listing)`;
    } catch {
      return `${name} (gone during listing)`;
    }
  }).join(", ");
}
