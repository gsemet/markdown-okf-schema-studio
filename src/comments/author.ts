/**
 * Author of a new review comment (T43): the `comments.authorName` setting, else the Git
 * `user.name`, else the operating system user name, else "Anonymous". Pure: the caller passes the
 * sources. The name is stored in a file, so it is cleaned: control characters become spaces and it
 * is cut at 100 characters.
 */

export const MAX_AUTHOR_LENGTH = 100;

export interface AuthorSources {
  setting?: string;
  gitName?: () => Promise<string | undefined> | string | undefined;
  osUserName?: () => string | undefined;
}

function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/gu, " ").trim().slice(0, MAX_AUTHOR_LENGTH).trim();
}

export async function resolveAuthor(sources: AuthorSources): Promise<string> {
  const fromSetting = clean(sources.setting);
  if (fromSetting !== "") return fromSetting;
  try {
    const fromGit = clean(await sources.gitName?.());
    if (fromGit !== "") return fromGit;
  } catch {
    // Git is optional: fall through.
  }
  try {
    const fromOs = clean(sources.osUserName?.());
    if (fromOs !== "") return fromOs;
  } catch {
    // No user entry for this process.
  }
  return "Anonymous";
}
