export const COMMENTS_CONFIGURATION_SECTION = "markdownOkfSchemaStudio.comments";

export interface CommentsConfigurationSource {
  get<T>(section: string, defaultValue: T): T;
}

export interface CommentsConfiguration {
  /** Author of new review comments; empty means Git user.name, then the OS user name (T43). */
  authorName: string;
}

export const DEFAULT_COMMENTS_CONFIGURATION: CommentsConfiguration = { authorName: "" };

export function readCommentsConfiguration(source: CommentsConfigurationSource): CommentsConfiguration {
  const authorName = source.get("authorName", DEFAULT_COMMENTS_CONFIGURATION.authorName);
  return { authorName: typeof authorName === "string" ? authorName : DEFAULT_COMMENTS_CONFIGURATION.authorName };
}
