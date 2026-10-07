import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { siteConfig } from "./lib/site";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Temporary, so old /zh links land on the English page while the Chinese site is off.
  async redirects() {
    if (siteConfig.showChinese) return [];
    return [
      { source: "/zh", destination: "/", permanent: false },
      { source: "/zh/:path*", destination: "/:path*", permanent: false },
    ];
  },
};

export default withNextIntl(nextConfig);
