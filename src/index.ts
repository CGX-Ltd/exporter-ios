import { Supernova, PulsarContext, RemoteVersionIdentifier, AnyOutputFile, Token } from "@supernovaio/sdk-exporters"
import { ExporterConfiguration, ThemeExportStyle } from "../config"
import { generateStyleFiles } from "./files/style-file"
import { generateColorAssetFiles } from "./files/colorset-file"
import { themeIdentifier } from "./helpers/utils"

/** Exporter configuration, resolved from `config.json` defaults and user overrides. */
export const exportConfiguration = Pulsar.exportConfig<ExporterConfiguration>()

/**
 * Main export function that turns design tokens into SwiftUI source files.
 *
 * Responsibilities:
 * - Fetch tokens and token groups for the exported design system version
 * - Filter by brand when a brand is selected
 * - Emit color tokens as an Xcode asset catalog with light + dark appearances
 * - Apply selected themes to the remaining types in the configured mode
 * - Emit one Swift file per non-color token type
 */
Pulsar.export(async (sdk: Supernova, context: PulsarContext): Promise<Array<AnyOutputFile>> => {
  const remoteVersionIdentifier: RemoteVersionIdentifier = {
    designSystemId: context.dsId,
    versionId: context.versionId,
  }

  let tokens = await sdk.tokens.getTokens(remoteVersionIdentifier)
  let tokenGroups = await sdk.tokens.getTokenGroups(remoteVersionIdentifier)
  let themes = await sdk.tokens.getTokenThemes(remoteVersionIdentifier)

  // Filter by brand if one is selected for this export.
  if (context.brandId) {
    const brands = await sdk.brands.getBrands(remoteVersionIdentifier)
    const brand = brands.find((b) => b.id === context.brandId || b.idInVersion === context.brandId)
    if (!brand) {
      throw new Error(`Unable to find brand ${context.brandId}.`)
    }
    tokens = tokens.filter((token) => token.brandId === brand.id)
    tokenGroups = tokenGroups.filter((group) => group.brandId === brand.id)
    themes = themes.filter((theme) => theme.brandId === brand.id)
  }

  // --- Colors: always exported as an asset catalog with base (light) + dark appearances. ---
  // Independent of the pipeline's selected themes; the "dark" theme provides the dark value.
  const darkTheme = themes.find((theme) =>
    [theme.codeName, theme.name].some(
      (candidate) => candidate?.toLowerCase() === exportConfiguration.darkThemeName.toLowerCase()
    )
  )

  let darkTokensById: Map<string, Token> | null = null
  let darkOverriddenIds = new Set<string>()
  if (darkTheme) {
    const darkTokens = sdk.tokens.computeTokensByApplyingThemes(tokens, tokens, [darkTheme])
    darkTokensById = new Map(darkTokens.map((token) => [token.id, token]))
    darkOverriddenIds = new Set(darkTheme.overriddenTokens.map((token) => token.id))
  }

  const colorFiles = generateColorAssetFiles(tokens, darkTokensById, darkOverriddenIds, tokenGroups)

  // --- Everything else: SwiftUI files (color is skipped inside generateStyleFiles). ---
  let swiftFiles: Array<AnyOutputFile> = []

  if (context.themeIds && context.themeIds.length > 0) {
    const themesToApply = context.themeIds.map((themeId) => {
      const theme = themes.find((t) => t.id === themeId || t.idInVersion === themeId)
      if (!theme) {
        throw new Error(`Unable to find theme ${themeId}.`)
      }
      return theme
    })

    switch (exportConfiguration.exportThemesAs) {
      case ThemeExportStyle.ApplyDirectly: {
        const themedTokens = sdk.tokens.computeTokensByApplyingThemes(tokens, tokens, themesToApply)
        swiftFiles = generateStyleFiles(themedTokens, tokenGroups)
        break
      }
      case ThemeExportStyle.SeparateFiles: {
        const baseFiles = exportConfiguration.exportBaseValues ? generateStyleFiles(tokens, tokenGroups) : []
        const themeFiles = themesToApply.flatMap((theme) => {
          const themedTokens = sdk.tokens.computeTokensByApplyingThemes(tokens, tokens, [theme])
          return generateStyleFiles(themedTokens, tokenGroups, themeIdentifier(theme), theme)
        })
        swiftFiles = [...baseFiles, ...themeFiles]
        break
      }
      case ThemeExportStyle.MergedTheme: {
        const baseFiles = exportConfiguration.exportBaseValues ? generateStyleFiles(tokens, tokenGroups) : []
        const themedTokens = sdk.tokens.computeTokensByApplyingThemes(tokens, tokens, themesToApply)
        const mergedFiles = generateStyleFiles(themedTokens, tokenGroups, "Themed", themesToApply[0])
        swiftFiles = [...baseFiles, ...mergedFiles]
        break
      }
    }
  } else {
    swiftFiles = generateStyleFiles(tokens, tokenGroups)
  }

  return [...swiftFiles, ...colorFiles]
})
