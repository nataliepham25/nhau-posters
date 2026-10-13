// NHAU brand tokens, from nhauculture.com. The poster background uses the
// colors already; the rest of the site adopts them in the design pass.

export const colors = {
  background: "#1D3030",
  card: "#243838",
  /** Cream, for text on dark backgrounds. */
  text: "#EFE5D2",
  /** Gold. */
  accent: "#C2B499",
} as const;

export const fonts = {
  /** Has a Vietnamese subset in next/font. */
  heading: "Cormorant Garamond",
  /**
   * English body text. No Vietnamese subset in next/font (latin and latin-ext
   * only), so letters like "ở" and "ế" are missing.
   */
  body: "DM Sans",
  /**
   * Vietnamese body text: /vi pages and anything marked lang="vi". Also the
   * fallback after DM Sans, so Vietnamese words on English pages (e.g. "Huế",
   * "phở spices") pick up its glyphs instead of a system font.
   */
  bodyVietnamese: "Be Vietnam Pro",
} as const;
