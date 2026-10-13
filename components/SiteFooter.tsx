import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/types";

export function SiteFooter({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);

  return (
    <footer className="mt-auto border-t border-border">
      <div className="container-page flex flex-col gap-2 py-10 text-ui text-muted sm:flex-row sm:items-baseline sm:justify-between">
        <p>
          {dict.footerCredit} ·{" "}
          <a
            href="https://nhauculture.com"
            className="text-text underline decoration-accent underline-offset-[6px] transition-colors hover:text-accent"
          >
            nhauculture.com
          </a>
        </p>
        <p>{dict.footerPosters}</p>
      </div>
    </footer>
  );
}
