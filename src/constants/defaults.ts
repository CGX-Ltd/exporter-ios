import { TokenType } from "@supernovaio/sdk-exporters"

/** How the members of a generated file are assembled into Swift declarations. */
export enum RenderStrategy {
  /** `static let <name>[: <valueType>] = <value>` inside the container */
  MemberValue = "memberValue",
  /** Emits a `ShadowToken` support struct and `[ShadowToken]` members */
  Shadow = "shadow",
  /** Emits a `BorderToken` support struct and `BorderToken` members */
  Border = "border",
  /** Emits `Text` modifier funcs (`func <name>() -> some View`) */
  Typography = "typography",
}

/** Describes the Swift container that wraps a token type's declarations. */
export type SwiftContainer =
  | { kind: "extension"; type: string }
  | { kind: "enum"; name: string }

/** Full description of how a token type is rendered into a Swift file. */
export type SwiftTarget = {
  /** Default file name for this token type */
  fileName: string
  /** Container declaration wrapping the members */
  container: SwiftContainer
  /** Render strategy for the members */
  strategy: RenderStrategy
  /** Explicit Swift type annotation for members, or null to let Swift infer it */
  valueType: string | null
}

const measure = (fileName: string, name: string): SwiftTarget => ({
  fileName,
  container: { kind: "enum", name },
  strategy: RenderStrategy.MemberValue,
  valueType: "CGFloat",
})

const text = (fileName: string, name: string): SwiftTarget => ({
  fileName,
  container: { kind: "enum", name },
  strategy: RenderStrategy.MemberValue,
  valueType: "String",
})

/** The Swift rendering target for every supported token type. */
export const SWIFT_TARGETS: Record<TokenType, SwiftTarget> = {
  [TokenType.color]: {
    fileName: "ColorTokens.swift",
    container: { kind: "extension", type: "Color" },
    strategy: RenderStrategy.MemberValue,
    valueType: null,
  },
  [TokenType.gradient]: {
    fileName: "GradientTokens.swift",
    container: { kind: "extension", type: "LinearGradient" },
    strategy: RenderStrategy.MemberValue,
    valueType: null,
  },
  [TokenType.typography]: {
    fileName: "TypographyTokens.swift",
    container: { kind: "extension", type: "Text" },
    strategy: RenderStrategy.Typography,
    valueType: null,
  },
  [TokenType.shadow]: {
    fileName: "ShadowTokens.swift",
    container: { kind: "enum", name: "ShadowTokens" },
    strategy: RenderStrategy.Shadow,
    valueType: "[ShadowToken]",
  },
  [TokenType.border]: {
    fileName: "BorderTokens.swift",
    container: { kind: "enum", name: "BorderTokens" },
    strategy: RenderStrategy.Border,
    valueType: "BorderToken",
  },
  [TokenType.radius]: measure("RadiusTokens.swift", "Radius"),
  [TokenType.borderWidth]: measure("BorderWidthTokens.swift", "BorderWidth"),
  [TokenType.dimension]: measure("DimensionTokens.swift", "Dimension"),
  [TokenType.size]: measure("SizeTokens.swift", "Size"),
  [TokenType.space]: measure("SpaceTokens.swift", "Space"),
  [TokenType.fontSize]: measure("FontSizeTokens.swift", "FontSize"),
  [TokenType.lineHeight]: measure("LineHeightTokens.swift", "LineHeight"),
  [TokenType.letterSpacing]: measure("LetterSpacingTokens.swift", "LetterSpacing"),
  [TokenType.paragraphSpacing]: measure("ParagraphSpacingTokens.swift", "ParagraphSpacing"),
  [TokenType.blur]: measure("BlurTokens.swift", "Blur"),
  [TokenType.opacity]: {
    fileName: "OpacityTokens.swift",
    container: { kind: "enum", name: "Opacity" },
    strategy: RenderStrategy.MemberValue,
    valueType: "Double",
  },
  [TokenType.duration]: {
    fileName: "DurationTokens.swift",
    container: { kind: "enum", name: "Duration" },
    strategy: RenderStrategy.MemberValue,
    valueType: "Double",
  },
  [TokenType.zIndex]: {
    fileName: "ZIndexTokens.swift",
    container: { kind: "enum", name: "ZIndex" },
    strategy: RenderStrategy.MemberValue,
    valueType: "Double",
  },
  [TokenType.visibility]: {
    fileName: "VisibilityTokens.swift",
    container: { kind: "enum", name: "Visibility" },
    strategy: RenderStrategy.MemberValue,
    valueType: "Bool",
  },
  [TokenType.fontFamily]: text("FontFamilyTokens.swift", "FontFamily"),
  [TokenType.fontWeight]: text("FontWeightTokens.swift", "FontWeight"),
  [TokenType.string]: text("StringTokens.swift", "Strings"),
  [TokenType.productCopy]: text("ProductCopyTokens.swift", "ProductCopy"),
  [TokenType.textCase]: text("TextCaseTokens.swift", "TextCaseTokens"),
  [TokenType.textDecoration]: text("TextDecorationTokens.swift", "TextDecorationTokens"),
}
