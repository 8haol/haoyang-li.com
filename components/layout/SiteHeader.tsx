import { getTranslations } from "next-intl/server";
import { SiteNav, type NavSection } from "./SiteNav";

/** The home page's sections, in page order; ids match the anchors in app/[locale]/page.tsx and the footer. */
const sections = [
  { id: "about", key: "about" },
  { id: "selected-work", key: "work", short: true },
  { id: "experience", key: "experience", short: true },
  { id: "open-source", key: "openSource" },
  { id: "contact", key: "contact", short: true },
] as const;

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const c = await getTranslations("common");
  const items: NavSection[] = sections.map(({ key, ...s }) => ({ ...s, label: t(key) }));
  return <SiteNav sections={items} labels={{ skip: c("skipToContent"), top: t("top"), sections: t("sections") }} />;
}
