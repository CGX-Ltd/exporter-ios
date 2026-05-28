import { FileHelper } from "@supernovaio/export-helpers"
import { OutputTextFile, Token, TokenGroup, TokenTheme, TokenType } from "@supernovaio/sdk-exporters"
import { exportConfiguration } from ".."
import { RenderStrategy, SWIFT_TARGETS } from "../constants/defaults"
import { convertedToken, convertedTypographyToken } from "../content/token"
import { SWIFT_SUPPORT_TYPES } from "../helpers/swiftui"
import { addDisclaimer, filterThemedTokens } from "../helpers/utils"

/**
 * Generates one Swift file per token type present in `tokens`.
 *
 * @param tokens - All tokens of the (already brand/theme-resolved) export
 * @param tokenGroups - Token groups, used for name generation
 * @param themePath - Subfolder name for themed output (empty for base files)
 * @param theme - The theme being exported, when generating themed files
 */
export function generateStyleFiles(
  tokens: Array<Token>,
  tokenGroups: Array<TokenGroup>,
  themePath: string = "",
  theme?: TokenTheme
): Array<OutputTextFile> {
  if (!exportConfiguration.exportBaseValues && !themePath) {
    return []
  }

  // Color tokens are emitted as an Xcode asset catalog (see colorset-file.ts), not Swift.
  const types = [...new Set(tokens.map((token) => token.tokenType))].filter(
    (type) => type !== TokenType.color
  )
  return types
    .map((type) => styleOutputFile(type, tokens, tokenGroups, themePath, theme))
    .filter((file): file is OutputTextFile => file !== null)
}

/** Generates the Swift file for a single token type, or null when it should be skipped. */
export function styleOutputFile(
  type: TokenType,
  tokens: Array<Token>,
  tokenGroups: Array<TokenGroup>,
  themePath: string = "",
  theme?: TokenTheme
): OutputTextFile | null {
  // Color tokens are emitted as an asset catalog, never as a Swift file.
  if (type === TokenType.color) {
    return null
  }

  const target = SWIFT_TARGETS[type]
  if (!target) {
    return null
  }

  let tokensOfType = tokens.filter((token) => token.tokenType === type)

  // For theme files that should only contain overridden tokens, filter them down.
  if (themePath && theme && exportConfiguration.exportOnlyThemedTokens) {
    tokensOfType = filterThemedTokens(tokensOfType, theme)
    if (tokensOfType.length === 0) {
      return null
    }
  }

  if (!exportConfiguration.generateEmptyFiles && tokensOfType.length === 0) {
    return null
  }

  // Map of all tokens (not just this type) so references can resolve across types.
  const mappedTokens = new Map(tokens.map((token) => [token.id, token]))

  const members = tokensOfType
    .map((token) =>
      target.strategy === RenderStrategy.Typography
        ? convertedTypographyToken(token, mappedTokens, tokenGroups)
        : convertedToken(token, mappedTokens, tokenGroups)
    )
    .join("\n\n")

  const container =
    target.container.kind === "extension"
      ? `public extension ${target.container.type} {`
      : `public enum ${target.container.name} {`

  const body = members.length > 0 ? `${container}\n${members}\n}` : `${container}\n}`

  // Any support struct (ShadowToken / BorderToken) is declared above the container.
  const support = SWIFT_SUPPORT_TYPES[type]
  const declarations = support ? `${support}\n\n${body}` : body

  let content = `import SwiftUI\n\n${declarations}\n`

  if (exportConfiguration.showGeneratedFileDisclaimer) {
    content = addDisclaimer(exportConfiguration.disclaimer, content)
  }

  const relativePath = themePath
    ? `${exportConfiguration.baseStyleFilePath}/${themePath}`
    : exportConfiguration.baseStyleFilePath

  return FileHelper.createTextFile({
    relativePath,
    fileName: target.fileName,
    content,
  })
}
