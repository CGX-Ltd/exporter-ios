import { NamingHelper, StringCase } from "@supernovaio/export-helpers"
import { Token, TokenGroup, TokenType } from "@supernovaio/sdk-exporters"
import { exportConfiguration } from ".."
import { TokenNameStructure } from "../../config"

/**
 * The name of the top-level group containing this token (e.g. the first segment of the
 * group chain). Returns `null` when the token sits directly under the absolute root or
 * has no parent group.
 */
function topLevelGroupName(token: Token, groups: Array<TokenGroup>): string | null {
  const parent = groups.find((group) => group.id === token.parentGroupId)
  if (!parent || parent.isRoot) {
    return null
  }
  return parent.path.length > 0 ? parent.path[0] : parent.name
}

/**
 * Whether a color token is "semantic" — i.e. lives under the configured semantic top-level
 * group (case-insensitive). Only color tokens that pass this check are emitted as colorsets;
 * primitive colors are dropped from the asset catalog entirely.
 */
export function isSemanticColorToken(token: Token, groups: Array<TokenGroup>): boolean {
  if (token.tokenType !== TokenType.color) {
    return false
  }
  const top = topLevelGroupName(token, groups)
  return !!top && top.toLowerCase() === exportConfiguration.semanticGroupName.toLowerCase()
}

/**
 * Generates the colorset name for a semantic color token. Unlike `tokenVariableName`, this
 * strips the matched top-level "semantic" segment from the path and never applies a
 * per-token-type prefix — so `Semantic / Surface / Primary` yields `surfacePrimary`.
 * `globalNamePrefix` and `tokenNameStyle` / `tokenNameStructure` are still honored.
 */
export function colorsetName(token: Token, groups: Array<TokenGroup>): string {
  const parent = groups.find((group) => group.id === token.parentGroupId)
  const chain: Array<string> = parent && !parent.isRoot ? [...parent.path, parent.name] : []

  const semanticName = exportConfiguration.semanticGroupName.toLowerCase()
  if (chain.length > 0 && chain[0].toLowerCase() === semanticName) {
    chain.shift()
  }

  const includePath = exportConfiguration.tokenNameStructure !== TokenNameStructure.NameOnly
  const fragments = includePath ? [...chain, token.name] : [token.name]
  const prefixed = exportConfiguration.globalNamePrefix
    ? [exportConfiguration.globalNamePrefix, ...fragments]
    : fragments

  return NamingHelper.codeSafeVariableName(prefixed, exportConfiguration.tokenNameStyle as StringCase)
}
