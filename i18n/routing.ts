import { defineRouting } from "next-intl/routing";
import { liveLocales, siteConfig } from "@/lib/site";

export const routing = defineRouting({
  locales: liveLocales,
  defaultLocale: siteConfig.defaultLocale,
  localePrefix: "as-needed",
});
