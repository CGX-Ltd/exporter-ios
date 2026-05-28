import { Supernova, PulsarContext, RemoteVersionIdentifier, AnyOutputFile } from "@supernovaio/sdk-exporters"
import { ExporterConfiguration, ThemeExportStyle } from "../config"
import { generateStyleFiles } from "./files/style-file"
import { themeIdentifier } from "./helpers/utils"

/** Exporter configuration, resolved from `config.json` defaults and user overrides. */
export const exportConfiguration = Pulsar.exportConfig<ExporterConfiguration>()

/**
 * Main export function that turns design tokens into SwiftUI source files.
 *
 * Responsibilities:
 * - Fetch tokens and token groups for the exported design system version
 * - Filter by brand when a brand is selected
 * - Apply selected themes in the configured mode (direct, separate, or merged)
 * - Emit one Swift file per token type
 */
Pulsar.export(async (sdk: Supernova, context: PulsarContext): Promise<Array<AnyOutputFile>> => {
  const remoteVersionIdentifier: RemoteVersionIdentifier = {
    designSystemId: context.dsId,
    versionId: context.versionId,
  }

  let tokens = await sdk.tokens.getTokens(remoteVersionIdentifier)
  let tokenGroups = await sdk.tokens.getTokenGroups(remoteVersionIdentifier)

  // Filter by brand if one is selected for this export.
  if (context.brandId) {
    const brands = await sdk.brands.getBrands(remoteVersionIdentifier)
    const brand = brands.find((b) => b.id === context.brandId || b.idInVersion === context.brandId)
    if (!brand) {
      throw new Error(`Unable to find brand ${context.brandId}.`)
    }
    tokens = tokens.filter((token) => token.brandId === brand.id)
    tokenGroups = tokenGroups.filter((group) => group.brandId === brand.id)
  }

  let outputFiles: Array<AnyOutputFile> = []

  if (context.themeIds && context.themeIds.length > 0) {
    const themes = await sdk.tokens.getTokenThemes(remoteVersionIdentifier)
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
        outputFiles = generateStyleFiles(themedTokens, tokenGroups)
        break
      }
      case ThemeExportStyle.SeparateFiles: {
        const baseFiles = exportConfiguration.exportBaseValues ? generateStyleFiles(tokens, tokenGroups) : []
        const themeFiles = themesToApply.flatMap((theme) => {
          const themedTokens = sdk.tokens.computeTokensByApplyingThemes(tokens, tokens, [theme])
          return generateStyleFiles(themedTokens, tokenGroups, themeIdentifier(theme), theme)
        })
        outputFiles = [...baseFiles, ...themeFiles]
        break
      }
      case ThemeExportStyle.MergedTheme: {
        const baseFiles = exportConfiguration.exportBaseValues ? generateStyleFiles(tokens, tokenGroups) : []
        const themedTokens = sdk.tokens.computeTokensByApplyingThemes(tokens, tokens, themesToApply)
        const mergedFiles = generateStyleFiles(themedTokens, tokenGroups, "Themed", themesToApply[0])
        outputFiles = [...baseFiles, ...mergedFiles]
        break
      }
    }
  } else {
    outputFiles = generateStyleFiles(tokens, tokenGroups)
  }

  return outputFiles
})
