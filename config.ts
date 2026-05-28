import { StringCase } from "@supernovaio/export-helpers"
import { TokenType } from "@supernovaio/sdk-exporters"

/**
 * Main configuration of the exporter - type interface. Default values for it can be set
 * through `config.json` and users can override the behavior when creating the pipelines.
 */

export enum ThemeExportStyle {
  /** Apply all selected themes directly to the exported token values (single set of files) */
  ApplyDirectly = "applyDirectly",
  /** Generate a separate set of files per theme, in a per-theme subfolder */
  SeparateFiles = "separateFiles",
  /** Generate one themed set of files with all selected themes merged together */
  MergedTheme = "mergedTheme",
}

export enum TokenNameStructure {
  /** Include the token group path and the token name (e.g. buttonPrimaryBackground) */
  PathAndName = "pathAndName",
  /** Only include the token name (e.g. background) */
  NameOnly = "nameOnly",
}

export type ExporterConfiguration = {
  /** When enabled, a disclaimer noting the file was generated automatically appears in every file */
  showGeneratedFileDisclaimer: boolean
  /** The disclaimer text rendered at the top of every generated file */
  disclaimer: string
  /** When enabled, the token description is rendered as a Swift doc comment for every token */
  showDescriptions: boolean
  /** When enabled, empty files are generated. Otherwise files with no tokens are omitted */
  generateEmptyFiles: boolean
  /** When enabled, values reference other tokens (where the token is a full alias of another) */
  useReferences: boolean
  /** Case used for generated Swift symbol names */
  tokenNameStyle: StringCase
  /** Which parts of the token identity are included in the generated name */
  tokenNameStructure: TokenNameStructure
  /** Prefix prepended to every generated symbol name (empty string for none) */
  globalNamePrefix: string
  /** When enabled, per-type prefixes from `tokenPrefixes` are applied to symbol names */
  customizeTokenPrefixes: boolean
  /** Prefix applied to each token of a specific type */
  tokenPrefixes: Record<TokenType, string>
  /** Maximum number of decimals used for numeric and color values */
  numericPrecision: number
  /** Number of spaces used to indent generated declarations */
  indent: number
  /** Directory (relative to the export root) all generated files are written to */
  baseStyleFilePath: string
  /** Controls how selected themes are exported */
  exportThemesAs: ThemeExportStyle
  /** When enabled, base (non-themed) files are exported alongside theme files */
  exportBaseValues: boolean
  /** When enabled, theme files only include tokens whose value differs from the base value */
  exportOnlyThemedTokens: boolean
  /**
   * Name of the theme whose values become the dark appearance of generated colorsets.
   * Matched case-insensitively against each theme's code name / name.
   */
  darkThemeName: string
  /** Name of the generated Xcode asset catalog that holds all color colorsets */
  colorAssetCatalogName: string
  /**
   * Only color tokens whose top-level group name matches this value (case-insensitively)
   * are exported as colorsets. Primitive colors outside this group are dropped.
   */
  semanticGroupName: string
}
