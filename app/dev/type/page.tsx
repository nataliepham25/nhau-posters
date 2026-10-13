import { EB_Garamond, Playfair_Display } from "next/font/google";
import { notFound } from "next/navigation";
import { serif as cormorant } from "@/app/fonts";
import { colors } from "@/lib/design-tokens";

// Development only: candidate heading fonts side by side, to compare how each
// draws Vietnamese diacritics at display size.

const ebGaramond = EB_Garamond({ subsets: ["latin", "vietnamese"], weight: ["500"], display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin", "vietnamese"], weight: ["500"], display: "swap" });

const FONTS = [
  { name: "Cormorant Garamond (current)", className: cormorant.className },
  { name: "EB Garamond", className: ebGaramond.className },
  { name: "Playfair Display", className: playfair.className },
];

// "ê" alone and stacked forms (ố, ậ, ế) in the same words, where mismatches show.
const SAMPLES = ["Cà Phê Muối", "Anh Yêu Em", "NHẬU", "Huế · Bắc Giang · Phở"];

export default function DevTypePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main style={{ background: colors.background, color: colors.text }} className="min-h-screen p-8">
      <h1 className="mb-8 text-2xl font-semibold">Heading font comparison</h1>
      <div className="grid gap-10 lg:grid-cols-3">
        {FONTS.map((font) => (
          <section key={font.name} className="border-t pt-4" style={{ borderColor: colors.accent }}>
            <h2 className="mb-6 text-sm uppercase tracking-[0.14em]" style={{ color: colors.accent }}>
              {font.name}
            </h2>
            <div lang="vi" className={`${font.className} space-y-4`}>
              {SAMPLES.map((sample) => (
                <p
                  key={sample}
                  className={sample === "NHẬU" ? "text-5xl tracking-[0.18em]" : "text-6xl"}
                  style={{ lineHeight: 1.3, fontWeight: 500 }}
                >
                  {sample}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
