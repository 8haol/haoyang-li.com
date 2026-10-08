import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { fontVariables } from "@/app/fonts";
import { siteConfig } from "@/lib/site";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PersonJsonLd } from "@/components/seo/PersonJsonLd";
import "../globals.css";
import { HERO_BACKDROP } from "@/lib/hero";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} · AI Systems Architect & Full-Stack Engineer, London`, template: `%s · ${siteConfig.name}` },
  description: "AI systems architect and full-stack engineer delivering enterprise AI from discovery to production.",
  // Each page sets its own canonical; a shared "/" here would fold every project page into the home page.
  alternates: { languages: siteConfig.showChinese ? { en: "/", zh: "/zh" } : undefined },
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
    <html lang={locale} className={`${fontVariables} h-full antialiased`} data-hero={HERO_BACKDROP} suppressHydrationWarning>
      <body className="min-h-dvh text-fg">
        <PersonJsonLd />
        <NextIntlClientProvider>
          <SmoothScroll />
          <SiteHeader />
          {children}
          {modal}
          <SiteFooter />
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
