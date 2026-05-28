import { FileHelper } from "@supernovaio/export-helpers"
import { ColorTokenValue, OutputTextFile, Token, TokenGroup, TokenType } from "@supernovaio/sdk-exporters"
import { exportConfiguration } from ".."
import { colorsetName, isSemanticColorToken } from "../content/color-naming"

/** A single channel formatted as a `0x`-prefixed two-digit hex string (e.g. `0x45`). */
function hexChannel(value: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(value)))
  return `0x${clamped.toString(16).toUpperCase().padStart(2, "0")}`
}

/** Extracts the sRGB 8-bit hex components of a color token value. */
function colorComponents(value: ColorTokenValue): {
  red: string
  green: string
  blue: string
  alpha: string
} {
  return {
    red: hexChannel(value.color.r),
    green: hexChannel(value.color.g),
    blue: hexChannel(value.color.b),
    alpha: hexChannel(value.opacity.measure * 255),
  }
}

/** Builds one entry of a colorset's `colors` array (universal, optionally dark appearance). */
function colorEntry(value: ColorTokenValue, dark: boolean): object {
  const components = colorComponents(value)
  const entry: Record<string, unknown> = {
    idiom: "universal",
    color: {
      "color-space": "srgb",
      components: {
        alpha: components.alpha,
        blue: components.blue,
        green: components.green,
        red: components.red,
      },
    },
  }
  if (dark) {
    entry.appearances = [{ appearance: "luminosity", value: "dark" }]
  }
  return entry
}

/** Reads the strongly-typed color value off a token. */
function colorValueOf(token: Token): ColorTokenValue {
  return (token as unknown as { value: ColorTokenValue }).value
}

/** Builds the `Contents.json` content of a single colorset. */
function colorsetContents(base: ColorTokenValue, dark: ColorTokenValue | null): string {
  const colors: Array<object> = [colorEntry(base, false)]
  if (dark) {
    colors.push(colorEntry(dark, true))
  }
  const contents = {
    colors,
    info: { author: "xcode", version: 1 },
  }
  return JSON.stringify(contents, null, 2) + "\n"
}

/**
 * Generates an Xcode asset catalog (`<catalog>.xcassets`) of color colorsets.
 *
 * Each color token becomes a `<name>.colorset` whose universal appearance is the token's
 * base value. When the dark theme overrides the token, a dark appearance is added from the
 * dark-theme-applied value. A catalog root `Contents.json` is always emitted.
 *
 * @param baseTokens - All tokens of the export (color tokens are filtered out internally)
 * @param darkTokensById - Dark-theme-applied tokens keyed by id, or null when no dark theme
 * @param darkOverriddenIds - Ids of tokens the dark theme actually overrides
 * @param tokenGroups - Token groups, used for name generation
 */
export function generateColorAssetFiles(
  baseTokens: Array<Token>,
  darkTokensById: Map<string, Token> | null,
  darkOverriddenIds: Set<string>,
  tokenGroups: Array<TokenGroup>
): Array<OutputTextFile> {
  const colorTokens = baseTokens.filter(
    (token) => token.tokenType === TokenType.color && isSemanticColorToken(token, tokenGroups)
  )

  if (!exportConfiguration.generateEmptyFiles && colorTokens.length === 0) {
    return []
  }

  const catalogPath = `${exportConfiguration.baseStyleFilePath}/${exportConfiguration.colorAssetCatalogName}`
  const files: Array<OutputTextFile> = []

  // Catalog root Contents.json
  files.push(
    FileHelper.createTextFile({
      relativePath: catalogPath,
      fileName: "Contents.json",
      content: JSON.stringify({ info: { author: "xcode", version: 1 } }, null, 2) + "\n",
    })
  )

  // One Contents.json per colorset
  for (const token of colorTokens) {
    const name = colorsetName(token, tokenGroups)
    const base = colorValueOf(token)

    let dark: ColorTokenValue | null = null
    if (darkTokensById && darkOverriddenIds.has(token.id)) {
      const darkToken = darkTokensById.get(token.id)
      if (darkToken) {
        dark = colorValueOf(darkToken)
      }
    }

    files.push(
      FileHelper.createTextFile({
        relativePath: `${catalogPath}/${name}.colorset`,
        fileName: "Contents.json",
        content: colorsetContents(base, dark),
      })
    )
  }

  return files
}
