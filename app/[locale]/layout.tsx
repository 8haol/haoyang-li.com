import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Bricolage_Grotesque, Geist, Geist_Mono, Instrument_Serif, Noto_Sans_SC } from "next/font/google";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PersonJsonLd } from "@/components/seo/PersonJsonLd";
import "../globals.css";
import { HERO_BACKDROP } from "@/lib/hero";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", axes: ["wdth", "opsz"] });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif" });
const cjk = Noto_Sans_SC({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-cjk", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: "AI systems architect and full-stack engineer delivering enterprise AI from discovery to production.",
  alternates: { canonical: "/", languages: { en: "/", zh: "/zh" } },
  openGraph: { type: "website", siteName: siteConfig.name, locale: "en_GB" },
  twitter: { card: "summary_large_image" },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  modal,
  params,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} className={`${sans.variable} ${mono.variable} ${display.variable} ${serif.variable} ${cjk.variable} h-full antialiased`} data-hero={HERO_BACKDROP} suppressHydrationWarning>
      <body className="min-h-dvh text-fg">
        <PersonJsonLd />
        <NextIntlClientProvider>
          <SmoothScroll />
          <SiteHeader />
          {children}
          {modal}
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
