import { Token, TokenType } from "@supernovaio/sdk-exporters"
import { SwiftUIHelper, SwiftUIOptions } from "../src/helpers/swiftui"

const options: SwiftUIOptions = {
  decimals: 2,
  allowReferences: true,
  tokenToReference: () => null,
}

/** Builds a minimal token-like object for the value renderer. */
function token(tokenType: TokenType, value: unknown): Token {
  return { id: "t", name: "n", description: "", tokenType, value } as unknown as Token
}

const rawDimension = (measure: number) => ({ unit: "Pixels", measure, referencedTokenId: null })
const color = (r: number, g: number, b: number, a = 1) => ({
  color: { r, g, b, referencedTokenId: null },
  opacity: { unit: "Raw", measure: a, referencedTokenId: null },
  referencedTokenId: null,
})

describe("SwiftUIHelper value rendering", () => {
  it("renders a color as a normalized sRGB Color", () => {
    const value = SwiftUIHelper.tokenValue(token(TokenType.color, color(255, 0, 128, 0.5)), options)
    expect(value).toBe("Color(.sRGB, red: 1, green: 0, blue: 0.5, opacity: 0.5)")
  })

  it("renders a dimension as a numeric literal", () => {
    const value = SwiftUIHelper.tokenValue(token(TokenType.space, rawDimension(8)), options)
    expect(value).toBe("8")
  })

  it("rounds numeric values to the configured precision", () => {
    const value = SwiftUIHelper.tokenValue(token(TokenType.radius, rawDimension(4.567)), options)
    expect(value).toBe("4.57")
  })

  it("renders a string token as a Swift string literal", () => {
    const value = SwiftUIHelper.tokenValue(token(TokenType.fontFamily, { text: "Poppins", referencedTokenId: null }), options)
    expect(value).toBe('"Poppins"')
  })

  it("renders a shadow layer as a ShadowToken array", () => {
    const shadow = [{ color: color(0, 0, 0, 0.2), x: 0, y: 2, radius: 4, spread: 0, type: "Drop", referencedTokenId: null }]
    const value = SwiftUIHelper.tokenValue(token(TokenType.shadow, shadow), options)
    expect(value).toBe("[ShadowToken(color: Color(.sRGB, red: 0, green: 0, blue: 0, opacity: 0.2), radius: 4, x: 0, y: 2)]")
  })

  it("renders a border as a BorderToken", () => {
    const border = { color: color(16, 79, 198), width: rawDimension(1), position: "Outside", style: "Solid", referencedTokenId: null }
    const value = SwiftUIHelper.tokenValue(token(TokenType.border, border), options)
    expect(value).toContain("BorderToken(color: Color(.sRGB,")
    expect(value).toContain("width: 1)")
  })

  it("renders a linear gradient with stops and unit points", () => {
    const gradient = [
      {
        from: { x: 0, y: 0 },
        to: { x: 1, y: 1 },
        type: "Linear",
        aspectRatio: 1,
        stops: [
          { position: 0, color: color(255, 0, 0) },
          { position: 1, color: color(0, 0, 255) },
        ],
        referencedTokenId: null,
      },
    ]
    const value = SwiftUIHelper.tokenValue(token(TokenType.gradient, gradient), options)
    expect(value).toContain("LinearGradient(gradient: Gradient(stops: [")
    expect(value).toContain("Gradient.Stop(color: Color(.sRGB, red: 1, green: 0, blue: 0, opacity: 1), location: 0)")
    expect(value).toContain("startPoint: UnitPoint(x: 0, y: 0), endPoint: UnitPoint(x: 1, y: 1)")
  })

  it("renders visibility as a Bool", () => {
    expect(SwiftUIHelper.tokenValue(token(TokenType.visibility, { value: "Visible", referencedTokenId: null }), options)).toBe("true")
    expect(SwiftUIHelper.tokenValue(token(TokenType.visibility, { value: "Hidden", referencedTokenId: null }), options)).toBe("false")
  })

  it("follows full token aliases when references are enabled", () => {
    const aliased = token(TokenType.color, { ...color(0, 0, 0), referencedTokenId: "ref-1" })
    const value = SwiftUIHelper.tokenValue(aliased, { ...options, tokenToReference: () => "Color.primary" })
    expect(value).toBe("Color.primary")
  })

  it("inlines the value when references are disabled", () => {
    const aliased = token(TokenType.color, { ...color(0, 0, 0), referencedTokenId: "ref-1" })
    const value = SwiftUIHelper.tokenValue(aliased, { ...options, allowReferences: false, tokenToReference: () => "Color.primary" })
    expect(value).toBe("Color(.sRGB, red: 0, green: 0, blue: 0, opacity: 1)")
  })

  describe("typography modifiers", () => {
    const typography = (overrides: Record<string, unknown> = {}) => ({
      fontFamily: { text: "Poppins", referencedTokenId: null },
      fontWeight: { text: "Bold", referencedTokenId: null },
      fontSize: rawDimension(16),
      textDecoration: { value: "Underline", referencedTokenId: null },
      textCase: { value: "Upper", referencedTokenId: null },
      letterSpacing: rawDimension(0.5),
      lineHeight: rawDimension(20),
      paragraphIndent: rawDimension(0),
      paragraphSpacing: rawDimension(0),
      referencedTokenId: null,
      ...overrides,
    })

    it("builds the full SwiftUI Text modifier chain", () => {
      const modifiers = SwiftUIHelper.typographyModifiers(typography() as never, options)
      expect(modifiers).toEqual([
        ".underline()",
        '.font(Font.custom("Poppins", size: 16))',
        ".fontWeight(.bold)",
        ".tracking(0.5)",
        ".lineSpacing(20)",
        ".textCase(.uppercase)",
      ])
    })

    it("omits optional modifiers that are absent", () => {
      const modifiers = SwiftUIHelper.typographyModifiers(
        typography({
          letterSpacing: rawDimension(0),
          lineHeight: null,
          textCase: { value: "Original", referencedTokenId: null },
          textDecoration: { value: "None", referencedTokenId: null },
          fontWeight: { text: "Custom", referencedTokenId: null },
        }) as never,
        options
      )
      expect(modifiers).toEqual(['.font(Font.custom("Poppins", size: 16))'])
    })
  })
})
