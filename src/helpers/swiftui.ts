import {
  Token,
  TokenType,
  ColorTokenValue,
  AnyDimensionTokenValue,
  ShadowTokenValue,
  BorderTokenValue,
  GradientTokenValue,
  TypographyTokenValue,
  AnyStringTokenValue,
  AnyOptionTokenValue,
  BlurTokenValue,
} from "@supernovaio/sdk-exporters"

/**
 * Options that control how a token value is rendered to SwiftUI.
 */
export type SwiftUIOptions = {
  /** Maximum number of decimals for numeric / color values */
  decimals: number
  /** Whether full token aliases should be rendered as references to other tokens */
  allowReferences: boolean
  /**
   * Resolves a referenced token id to its fully-qualified Swift accessor
   * (e.g. `Color.primary`, `Spacing.small`). Returns null when the reference
   * cannot be resolved and the value should be inlined instead.
   */
  tokenToReference: (referencedTokenId: string) => string | null
}

/** Reads the strongly-typed value off a token without depending on concrete token classes. */
function valueOf<T>(token: Token): T {
  return (token as unknown as { value: T }).value
}

/** Rounds to the configured precision and renders without redundant trailing zeros. */
function num(value: number, decimals: number): string {
  const factor = Math.pow(10, decimals)
  const rounded = Math.round(value * factor) / factor
  return String(rounded)
}

/** Escapes a string for use inside a Swift double-quoted literal. */
function swiftString(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")
}

/**
 * Converts Supernova design tokens into SwiftUI value expressions.
 *
 * Each method returns the right-hand side of a Swift declaration (e.g. the
 * `Color(.sRGB, …)` in `static let primary = Color(.sRGB, …)`). Multi-layer
 * tokens (shadow, gradient) and typography are handled by dedicated methods.
 */
export class SwiftUIHelper {
  /** Renders a SwiftUI `Color(.sRGB, …)` expression from a color token value. */
  static colorValue(color: ColorTokenValue, options: SwiftUIOptions): string {
    const r = num(color.color.r / 255, options.decimals)
    const g = num(color.color.g / 255, options.decimals)
    const b = num(color.color.b / 255, options.decimals)
    const opacity = num(color.opacity.measure, options.decimals)
    return `Color(.sRGB, red: ${r}, green: ${g}, blue: ${b}, opacity: ${opacity})`
  }

  /** Renders a numeric (CGFloat / Double) literal from any dimension-like token value. */
  static dimensionValue(value: AnyDimensionTokenValue, options: SwiftUIOptions): string {
    return num(value.measure, options.decimals)
  }

  /** Renders a `[ShadowToken]` literal. Each Supernova shadow layer becomes one element. */
  static shadowValue(layers: Array<ShadowTokenValue>, options: SwiftUIOptions): string {
    const elements = layers.map((layer) => {
      const color = this.colorValue(
        { ...layer.color, ...(layer.opacity ? { opacity: layer.opacity } : {}) },
        options
      )
      const radius = num(layer.radius, options.decimals)
      const x = num(layer.x, options.decimals)
      const y = num(layer.y, options.decimals)
      return `ShadowToken(color: ${color}, radius: ${radius}, x: ${x}, y: ${y})`
    })
    return `[${elements.join(", ")}]`
  }

  /** Renders a `BorderToken(color:width:)` literal. */
  static borderValue(border: BorderTokenValue, options: SwiftUIOptions): string {
    const color = this.colorValue(border.color, options)
    const width = num(border.width.measure, options.decimals)
    return `BorderToken(color: ${color}, width: ${width})`
  }

  /**
   * Renders a `LinearGradient(...)` expression. Supernova gradients can be
   * multi-layer; SwiftUI's `LinearGradient` represents a single layer, so the
   * first layer is used. `from`/`to` map directly to SwiftUI `UnitPoint`s.
   */
  static gradientValue(layers: Array<GradientTokenValue>, options: SwiftUIOptions): string {
    const layer = layers[0]
    const stops = layer.stops
      .map((stop) => {
        const color = this.colorValue(stop.color, options)
        const location = num(stop.position, options.decimals)
        return `Gradient.Stop(color: ${color}, location: ${location})`
      })
      .join(", ")
    const start = `UnitPoint(x: ${num(layer.from.x, options.decimals)}, y: ${num(layer.from.y, options.decimals)})`
    const end = `UnitPoint(x: ${num(layer.to.x, options.decimals)}, y: ${num(layer.to.y, options.decimals)})`
    return `LinearGradient(gradient: Gradient(stops: [${stops}]), startPoint: ${start}, endPoint: ${end})`
  }

  /** Maps a Supernova font-weight string to a SwiftUI `Font.Weight`, if recognised. */
  private static fontWeight(weight: string): string | null {
    const map: Record<string, string> = {
      thin: "thin",
      "100": "thin",
      ultralight: "ultraLight",
      "200": "ultraLight",
      light: "light",
      "300": "light",
      regular: "regular",
      normal: "regular",
      "400": "regular",
      medium: "medium",
      "500": "medium",
      semibold: "semibold",
      "600": "semibold",
      bold: "bold",
      "700": "bold",
      heavy: "heavy",
      "800": "heavy",
      black: "black",
      "900": "black",
    }
    return map[weight.toLowerCase().replace(/\s/g, "")] ?? null
  }

  /**
   * Renders the body of a SwiftUI `Text` modifier function for a typography
   * token (the chain applied after `self`). Mirrors the legacy `textStyle*`
   * helpers: font, weight, tracking, line spacing, casing and decoration.
   */
  static typographyModifiers(typography: TypographyTokenValue, options: SwiftUIOptions): string[] {
    const modifiers: string[] = []
    const family = swiftString(typography.fontFamily.text)
    const size = num(typography.fontSize.measure, options.decimals)
    modifiers.push(`.font(Font.custom("${family}", size: ${size}))`)

    const weight = this.fontWeight(typography.fontWeight.text)
    if (weight) {
      modifiers.push(`.fontWeight(.${weight})`)
    }

    if (typography.letterSpacing.measure !== 0) {
      modifiers.push(`.tracking(${num(typography.letterSpacing.measure, options.decimals)})`)
    }

    if (typography.lineHeight && typography.lineHeight.measure !== 0) {
      modifiers.push(`.lineSpacing(${num(typography.lineHeight.measure, options.decimals)})`)
    }

    switch (typography.textCase.value) {
      case "Upper":
        modifiers.push(`.textCase(.uppercase)`)
        break
      case "Lower":
        modifiers.push(`.textCase(.lowercase)`)
        break
    }

    switch (typography.textDecoration.value) {
      case "Underline":
        modifiers.push(`.underline()`)
        break
      case "Strikethrough":
        modifiers.push(`.strikethrough()`)
        break
    }

    return modifiers
  }

  /** Renders a Swift string literal from a string-like token value. */
  static stringValue(value: AnyStringTokenValue): string {
    return `"${swiftString(value.text)}"`
  }

  /** Renders an option token (text case / text decoration) as a Swift string literal. */
  static optionValue(value: AnyOptionTokenValue): string {
    return `"${swiftString(value.value)}"`
  }

  /** Renders a visibility token as a Swift `Bool`. */
  static visibilityValue(value: AnyOptionTokenValue): string {
    return value.value === "Visible" ? "true" : "false"
  }

  /** Renders a blur token's radius as a numeric literal. */
  static blurValue(value: BlurTokenValue, options: SwiftUIOptions): string {
    return num(value.radius.measure, options.decimals)
  }

  /**
   * Renders the value expression for any single-value token type (everything
   * except typography, which is emitted as a `Text` modifier function).
   *
   * Honors full token aliases: when `allowReferences` is on and the token is a
   * full alias of another token, the referenced token's Swift accessor is
   * returned instead of an inlined value.
   */
  static tokenValue(token: Token, options: SwiftUIOptions): string {
    const referencedTokenId = (token as unknown as { value: { referencedTokenId: string | null } })
      .value.referencedTokenId
    if (options.allowReferences && referencedTokenId) {
      const reference = options.tokenToReference(referencedTokenId)
      if (reference) {
        return reference
      }
    }

    switch (token.tokenType) {
      case TokenType.color:
        return this.colorValue(valueOf<ColorTokenValue>(token), options)
      case TokenType.gradient:
        return this.gradientValue(valueOf<Array<GradientTokenValue>>(token), options)
      case TokenType.shadow:
        return this.shadowValue(valueOf<Array<ShadowTokenValue>>(token), options)
      case TokenType.border:
        return this.borderValue(valueOf<BorderTokenValue>(token), options)
      case TokenType.blur:
        return this.blurValue(valueOf<BlurTokenValue>(token), options)
      case TokenType.dimension:
      case TokenType.size:
      case TokenType.space:
      case TokenType.opacity:
      case TokenType.fontSize:
      case TokenType.lineHeight:
      case TokenType.letterSpacing:
      case TokenType.paragraphSpacing:
      case TokenType.borderWidth:
      case TokenType.radius:
      case TokenType.duration:
      case TokenType.zIndex:
        return this.dimensionValue(valueOf<AnyDimensionTokenValue>(token), options)
      case TokenType.string:
      case TokenType.productCopy:
      case TokenType.fontFamily:
      case TokenType.fontWeight:
        return this.stringValue(valueOf<AnyStringTokenValue>(token))
      case TokenType.textCase:
      case TokenType.textDecoration:
        return this.optionValue(valueOf<AnyOptionTokenValue>(token))
      case TokenType.visibility:
        return this.visibilityValue(valueOf<AnyOptionTokenValue>(token))
      case TokenType.typography:
        // Typography is rendered as a Text modifier function, not a value.
        throw new Error("Typography tokens are rendered via typographyModifiers, not tokenValue")
      default:
        throw new Error(`Unsupported token type for SwiftUI export: ${token.tokenType}`)
    }
  }
}

/** The Swift support structs emitted alongside shadow and border tokens. */
export const SWIFT_SUPPORT_TYPES: Partial<Record<TokenType, string>> = {
  [TokenType.shadow]:
    "public struct ShadowToken {\n" +
    "    public let color: Color\n" +
    "    public let radius: CGFloat\n" +
    "    public let x: CGFloat\n" +
    "    public let y: CGFloat\n" +
    "\n" +
    "    public init(color: Color, radius: CGFloat, x: CGFloat, y: CGFloat) {\n" +
    "        self.color = color\n" +
    "        self.radius = radius\n" +
    "        self.x = x\n" +
    "        self.y = y\n" +
    "    }\n" +
    "}",
  [TokenType.border]:
    "public struct BorderToken {\n" +
    "    public let color: Color\n" +
    "    public let width: CGFloat\n" +
    "\n" +
    "    public init(color: Color, width: CGFloat) {\n" +
    "        self.color = color\n" +
    "        self.width = width\n" +
    "    }\n" +
    "}",
}
