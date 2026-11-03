/**
 * Guard for tests that create symbolic links. Windows creates one only with Developer Mode or
 * administrator rights, so a Windows machine without them skips these tests; the Linux CI always
 * runs them. A link used only to set up a scratch folder takes a `"junction"` instead, which
 * Windows creates without rights (other platforms ignore the type).
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

function canCreateSymlinks(): boolean {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "studio-symlink-probe-"));
  try {
    fs.symlinkSync(path.join(directory, "target"), path.join(directory, "link"));
    return true;
  } catch {
    return false;
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

/** Options for `test(name, needsSymlinks, fn)`: skips when this machine cannot create symbolic links. */
export const needsSymlinks: { readonly skip: string | false } = {
  skip: canCreateSymlinks() ? false : "symbolic links need Developer Mode on Windows; the Linux CI runs this test",
};
