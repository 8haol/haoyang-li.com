export const siteConfig = {
  name: "Haoyang Li",
  url: "https://haoyang-li.com",
  email: "hello@haoyang-li.com",
  github: "https://github.com/8haol",
  linkedin: "https://www.linkedin.com/in/haoyangli818/",
  locales: ["en", "zh"] as const,
  defaultLocale: "en" as const,
} as const;

export type Locale = (typeof siteConfig.locales)[number];
