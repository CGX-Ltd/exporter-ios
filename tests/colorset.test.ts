import { Token, TokenGroup, TokenType } from "@supernovaio/sdk-exporters"
import { generateColorAssetFiles } from "../src/files/colorset-file"

// ---- Fixture groups: Semantic / Surface, and a separate Primitives group ----------------

const rootGroup = {
  id: "root",
  brandId: "b1",
  name: "",
  path: [],
  isRoot: true,
  childrenIds: [],
  tokenIds: [],
} as unknown as TokenGroup

const semanticGroup = {
  id: "semantic",
  brandId: "b1",
  name: "Semantic",
  path: [],
  isRoot: false,
  childrenIds: [],
  tokenIds: [],
} as unknown as TokenGroup

const surfaceGroup = {
  id: "surface",
  brandId: "b1",
  name: "Surface",
  path: ["Semantic"],
  isRoot: false,
  childrenIds: [],
  tokenIds: [],
} as unknown as TokenGroup

const primitivesGroup = {
  id: "primitives",
  brandId: "b1",
  name: "Primitives",
  path: [],
  isRoot: false,
  childrenIds: [],
  tokenIds: [],
} as unknown as TokenGroup

const groups = [rootGroup, semanticGroup, surfaceGroup, primitivesGroup]

const colorToken = (
  id: string,
  name: string,
  parentGroupId: string,
  r: number,
  g: number,
  b: number,
  a = 1
): Token =>
  ({
    id,
    name,
    description: "",
    tokenType: TokenType.color,
    parentGroupId,
    value: {
      color: { r, g, b, referencedTokenId: null },
      opacity: { unit: "Raw", measure: a, referencedTokenId: null },
      referencedTokenId: null,
    },
  }) as unknown as Token

// Semantic colors live under Semantic (directly or via a subgroup).
const semanticPrimary = (r: number, g: number, b: number, a = 1) =>
  colorToken("s1", "Primary", "semantic", r, g, b, a)
const surfaceBackground = (r: number, g: number, b: number) =>
  colorToken("s2", "Background", "surface", r, g, b)
// Primitive color: under a non-semantic top-level group.
const primitiveBlue = (r: number, g: number, b: number) =>
  colorToken("p1", "Blue 500", "primitives", r, g, b)

describe("generateColorAssetFiles", () => {
  it("emits a catalog root Contents.json when at least one semantic color exists", () => {
    const files = generateColorAssetFiles([semanticPrimary(69, 137, 255)], null, new Set(), groups)
    const root = files.find((f) => f.path === "./Styles/Colors.xcassets" && f.name === "Contents.json")
    expect(root).toBeDefined()
    expect(JSON.parse(root!.content)).toEqual({ info: { author: "xcode", version: 1 } })
  })

  it("emits a colorset for a semantic color directly under the Semantic group", () => {
    const files = generateColorAssetFiles([semanticPrimary(69, 137, 255)], null, new Set(), groups)
    const colorset = files.find((f) => f.path === "./Styles/Colors.xcassets/primary.colorset")
    expect(colorset).toBeDefined()
    expect(JSON.parse(colorset!.content).colors[0]).toEqual({
      idiom: "universal",
      color: {
        "color-space": "srgb",
        components: { alpha: "0xFF", blue: "0xFF", green: "0x89", red: "0x45" },
      },
    })
  })

  it("names nested semantic tokens without the leading Semantic segment", () => {
    const files = generateColorAssetFiles([surfaceBackground(255, 255, 255)], null, new Set(), groups)
    const colorset = files.find((f) =>
      f.path === "./Styles/Colors.xcassets/surfaceBackground.colorset"
    )
    expect(colorset).toBeDefined()
  })

  it("does not emit a colorset for primitive (non-semantic) colors", () => {
    const files = generateColorAssetFiles([primitiveBlue(0, 0, 255)], null, new Set(), groups)
    // No semantic colors → nothing emitted (not even a catalog root).
    expect(files).toHaveLength(0)
  })

  it("emits only semantic tokens when given a mix", () => {
    const files = generateColorAssetFiles(
      [semanticPrimary(69, 137, 255), primitiveBlue(0, 0, 255), surfaceBackground(255, 255, 255)],
      null,
      new Set(),
      groups
    )
    const paths = files.map((f) => `${f.path}/${f.name}`).sort()
    expect(paths).toEqual(
      [
        "./Styles/Colors.xcassets/Contents.json",
        "./Styles/Colors.xcassets/primary.colorset/Contents.json",
        "./Styles/Colors.xcassets/surfaceBackground.colorset/Contents.json",
      ].sort()
    )
  })

  it("adds a dark appearance for semantic tokens overridden by the dark theme", () => {
    const base = surfaceBackground(255, 255, 255)
    const dark = colorToken("s2", "Background", "surface", 0, 0, 0)
    const darkById = new Map([["s2", dark]])
    const files = generateColorAssetFiles([base], darkById, new Set(["s2"]), groups)
    const colorset = files.find((f) => f.path === "./Styles/Colors.xcassets/surfaceBackground.colorset")!
    const json = JSON.parse(colorset.content)
    expect(json.colors).toHaveLength(2)
    expect(json.colors[1].appearances).toEqual([{ appearance: "luminosity", value: "dark" }])
    expect(json.colors[1].color.components.red).toBe("0x00")
  })

  it("encodes alpha from the opacity measure", () => {
    const files = generateColorAssetFiles([semanticPrimary(0, 0, 0, 0.5)], null, new Set(), groups)
    const colorset = files.find((f) => f.path === "./Styles/Colors.xcassets/primary.colorset")!
    expect(JSON.parse(colorset.content).colors[0].color.components.alpha).toBe("0x80")
  })

  it("emits nothing when there are no color tokens", () => {
    const files = generateColorAssetFiles([], null, new Set(), groups)
    expect(files).toHaveLength(0)
  })
})
