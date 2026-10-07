/**
 * Which backdrop the home hero uses. Change HERO_BACKDROP to switch the site's cover; `?hero=silk` or `?hero=wash`
 * previews the other one without a code change (and `?tune` opens the watercolour's shader panel in development).
 *  - "silk": the silk particle photo with white type.
 *  - "wash": the grey ink-wash watercolour with the site's normal dark type.
 */
export type HeroBackdrop = "silk" | "wash";

export const HERO_BACKDROP: HeroBackdrop = "silk";

export function parseHeroBackdrop(value: string | null): HeroBackdrop | null {
  return value === "silk" || value === "wash" ? value : null;
}
