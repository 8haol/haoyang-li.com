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
} as const;

export type Locale = (typeof siteConfig.locales)[number];
