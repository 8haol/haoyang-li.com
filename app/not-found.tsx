import type { Metadata } from "next";
import Link from "next/link";
import { fontVariables } from "@/app/fonts";
import { NotFound } from "@/components/layout/NotFound";
import "./globals.css";

export const metadata: Metadata = { title: "Not found · Haoyang Li", robots: { index: false } };

/**
 * Unknown top-level routes (anything the locale layout never sees) land here, outside every layout, so this page
 * draws its own html and body; the locale not-found covers unknown slugs inside the site.
 */
export default function RootNotFound() {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-dvh text-fg">
        <header className="shell flex h-14 items-center">
          <Link href="/" className="font-display text-[15px] font-semibold tracking-tight" aria-label="Haoyang Li, home">
            HL
          </Link>
        </header>
        <NotFound />
      </body>
    </html>
  );
}
