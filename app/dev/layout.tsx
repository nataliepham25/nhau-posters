import type { Metadata } from "next";
import "../globals.css";

// Separate root layout for development tools, outside the [locale] routes.
export const metadata: Metadata = {
  title: "Dev · NHAU",
  robots: { index: false, follow: false },
};

export default function DevLayout({ children }: LayoutProps<"/dev">) {
  return (
    <html lang="en">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
