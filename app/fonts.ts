import { Be_Vietnam_Pro, Cormorant_Garamond, DM_Sans } from "next/font/google";

// Headings and cocktail names. Has a Vietnamese subset.
export const serif = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

// English body text and UI. No Vietnamese subset, so Be Vietnam Pro follows it
// in the font stack and leads it for Vietnamese text (see globals.css).
export const sans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const sansVietnamese = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  display: "swap",
});

/** Put on <html> so the CSS variables are available everywhere. */
export const fontVariables = `${serif.variable} ${sans.variable} ${sansVietnamese.variable}`;
