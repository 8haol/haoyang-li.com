import { siteConfig } from "@/lib/site";

export function PersonJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.name,
    url: siteConfig.url,
    email: `mailto:${siteConfig.email}`,
    jobTitle: "AI Systems Architect",
    sameAs: [siteConfig.github, siteConfig.linkedin],
    address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
