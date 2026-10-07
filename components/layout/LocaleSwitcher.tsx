"use client";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const next = locale === "en" ? "zh" : "en";
  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { locale: next })}
      className="rounded-full border border-border px-3 py-1 font-mono text-xs hover:bg-muted"
      aria-label={next === "zh" ? "切换到中文" : "Switch to English"}
    >
      {next === "zh" ? "中文" : "EN"}
    </button>
  );
}
