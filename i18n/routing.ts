import { defineRouting } from "next-intl/routing";
import { siteConfig } from "@/lib/site";

export const routing = defineRouting({
  locales: siteConfig.locales,
  defaultLocale: siteConfig.defaultLocale,
  localePrefix: "as-needed",
});
