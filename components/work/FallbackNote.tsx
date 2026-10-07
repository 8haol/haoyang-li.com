import { getTranslations } from "next-intl/server";

export async function FallbackNote() {
  const t = await getTranslations("common");
  return (
    <p role="note" className="mb-8 rounded-lg border border-border bg-muted/60 px-4 py-2 text-sm text-fg-muted">
      {t("englishOnly")}
    </p>
  );
}
