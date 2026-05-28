import { Token, TokenTheme } from "@supernovaio/sdk-exporters"

/**
 * Small, self-contained utilities equivalent to the parts of Supernova's
 * `ThemeHelper` / `GeneralHelper` that this exporter relies on. They live here
 * because the published `@supernovaio/export-helpers` package does not expose
 * those helpers.
 */

/** A path-safe identifier for a theme, used for per-theme folder names. */
export function themeIdentifier(theme: TokenTheme | string): string {
  if (typeof theme === "string") {
    return theme
  }
  const raw = theme.codeName && theme.codeName.length > 0 ? theme.codeName : theme.name
  // Make it a safe folder name: alphanumerics only, collapse the rest to nothing.
  return raw.replace(/[^a-zA-Z0-9]/g, "")
}

/** The human-readable name of a theme. */
export function themeName(theme: TokenTheme | string): string {
  return typeof theme === "string" ? theme : theme.name
}

/** Returns only the tokens that are overridden by the given theme. */
export function filterThemedTokens(tokens: Array<Token>, theme: TokenTheme): Array<Token> {
  const overriddenIds = new Set(theme.overriddenTokens.map((token) => token.id))
  return tokens.filter((token) => overriddenIds.has(token.id))
}

/** Whether the theme overrides at least one token of the given type. */
export function hasThemedTokensOfType(theme: TokenTheme, tokenType: string): boolean {
  return theme.overriddenTokens.some((token) => token.tokenType === tokenType)
}

/** A string of `count` spaces, used to indent generated declarations. */
export function indent(count: number): string {
  return " ".repeat(Math.max(0, count))
}

/** Prefixes `content` with a `//`-style disclaimer comment block. */
export function addDisclaimer(disclaimer: string, content: string): string {
  const comment = disclaimer
    .trim()
    .split("\n")
    .map((line) => `// ${line}`.trimEnd())
    .join("\n")
  return `${comment}\n\n${content}`
}
