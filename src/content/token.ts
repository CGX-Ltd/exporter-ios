import { NamingHelper, StringCase } from "@supernovaio/export-helpers"
import { Token, TokenGroup, TokenType, TypographyTokenValue } from "@supernovaio/sdk-exporters"
import { exportConfiguration } from ".."
import { TokenNameStructure } from "../../config"
import { SWIFT_TARGETS } from "../constants/defaults"
import { SwiftUIHelper, SwiftUIOptions } from "../helpers/swiftui"
import { indent } from "../helpers/utils"

/** The per-type prefix applied to a token name, based on configuration. */
function getTokenPrefix(tokenType: TokenType): string {
  return exportConfiguration.customizeTokenPrefixes ? exportConfiguration.tokenPrefixes[tokenType] : ""
}

/**
 * Generates the code-safe Swift symbol name for a token, honoring the
 * configured case, name structure and prefixes.
 */
export function tokenVariableName(token: Token, tokenGroups: Array<TokenGroup>): string {
  const parent = tokenGroups.find((group) => group.id === token.parentGroupId) ?? null
  const includeParent = exportConfiguration.tokenNameStructure !== TokenNameStructure.NameOnly
  const prefix =
    [exportConfiguration.globalNamePrefix, getTokenPrefix(token.tokenType)].filter(Boolean).join(" ") || null

  return NamingHelper.codeSafeVariableNameForToken(
    token,
    exportConfiguration.tokenNameStyle as StringCase,
    includeParent ? parent : null,
    prefix
  )
}

/**
 * Fully-qualified Swift accessor for a token, used when one token references
 * another (e.g. `Color.primary`, `Spacing.small`).
 */
export function qualifiedReference(token: Token, tokenGroups: Array<TokenGroup>): string {
  const target = SWIFT_TARGETS[token.tokenType]
  const name = tokenVariableName(token, tokenGroups)
  const container = target.container.kind === "extension" ? target.container.type : target.container.name
  return `${container}.${name}`
}

/** Builds the SwiftUI rendering options, wiring reference resolution to token names. */
function swiftUIOptions(mappedTokens: Map<string, Token>, tokenGroups: Array<TokenGroup>): SwiftUIOptions {
  return {
    decimals: exportConfiguration.numericPrecision,
    allowReferences: exportConfiguration.useReferences,
    tokenToReference: (referencedTokenId: string) => {
      const referenced = mappedTokens.get(referencedTokenId)
      return referenced ? qualifiedReference(referenced, tokenGroups) : null
    },
  }
}

/** Renders a token's description as an indented Swift doc comment, or "" when disabled/empty. */
function docComment(description: string, indentString: string): string {
  if (!exportConfiguration.showDescriptions || !description || description.trim().length === 0) {
    return ""
  }
  return (
    description
      .trim()
      .split("\n")
      .map((line) => `${indentString}/// ${line}`.trimEnd())
      .join("\n") + "\n"
  )
}

/**
 * Converts a single-value token into its Swift `static let` declaration,
 * including an optional doc comment. Typography tokens are handled by
 * {@link convertedTypographyToken} instead.
 */
export function convertedToken(
  token: Token,
  mappedTokens: Map<string, Token>,
  tokenGroups: Array<TokenGroup>
): string {
  const target = SWIFT_TARGETS[token.tokenType]
  const name = tokenVariableName(token, tokenGroups)
  const value = SwiftUIHelper.tokenValue(token, swiftUIOptions(mappedTokens, tokenGroups))
  const annotation = target.valueType ? `: ${target.valueType}` : ""
  const indentString = indent(exportConfiguration.indent)
  // Members of a `public extension` are implicitly public; `enum` namespaces need explicit `public`.
  const access = target.container.kind === "extension" ? "" : "public "

  return `${docComment(token.description, indentString)}${indentString}${access}static let ${name}${annotation} = ${value}`
}

/**
 * Converts a typography token into a SwiftUI `Text` modifier function:
 * `func <name>() -> some View { self.font(...)... }`.
 */
export function convertedTypographyToken(
  token: Token,
  mappedTokens: Map<string, Token>,
  tokenGroups: Array<TokenGroup>
): string {
  const name = tokenVariableName(token, tokenGroups)
  const value = (token as unknown as { value: TypographyTokenValue }).value
  const modifiers = SwiftUIHelper.typographyModifiers(value, swiftUIOptions(mappedTokens, tokenGroups))

  const indentString = indent(exportConfiguration.indent)
  const bodyIndent = indent(exportConfiguration.indent * 2)
  const chainIndent = indent(exportConfiguration.indent * 3)

  const chain = [`${bodyIndent}self`, ...modifiers.map((modifier) => `${chainIndent}${modifier}`)].join("\n")

  return (
    `${docComment(token.description, indentString)}` +
    `${indentString}func ${name}() -> some View {\n` +
    `${chain}\n` +
    `${indentString}}`
  )
}
