export const siteConfig = {
  name: "Haoyang Li",
  url: "https://haoyang-li.com",
  email: "hello@haoyang-li.com",
  github: "https://github.com/8haol",
  linkedin: "https://www.linkedin.com/in/haoyangli818/",
  locales: ["en", "zh"] as const,
  defaultLocale: "en" as const,
  /** The home page's open-source section and its nav link; the content stays in content/open-source.yaml. */
  showOpenSource: false,
  /** The /zh routes, the language switcher and hreflang; the translations stay in messages/ and content/. */
  showChinese: false,
} as const;

export type Locale = (typeof siteConfig.locales)[number];

/** Locales the site actually serves. */
export const liveLocales: readonly Locale[] = siteConfig.showChinese ? siteConfig.locales : [siteConfig.defaultLocale];
