import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}`, request.url));
  }

  // Unknown locales (e.g. /fr) would otherwise reach the [locale] root layout,
  // whose notFound() can only show Next's bare default 404. Rewriting here
  // serves app/global-not-found.tsx with a real 404 status instead.
  const [, firstSegment] = pathname.split("/");
  if (!isLocale(firstSegment)) {
    return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
  }
}

export const config = {
  // Skip Next internals and files with an extension (favicon.ico, /next.svg, ...).
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
