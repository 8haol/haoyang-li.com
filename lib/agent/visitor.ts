import { createHmac } from "node:crypto";

/** The address a request came from, as Vercel reports it; "local" in dev. */
export const clientIp = (headers: Headers) => headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

/** Vercel sends the city URI-encoded ("S%C3%A3o%20Paulo"); a malformed one is dropped rather than shown garbled. */
function decoded(value: string | null): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

/** Just the host of a URL, or "" for anything that is not one. */
function hostOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function pathOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).pathname.slice(0, 200);
  } catch {
    return "";
  }
}

/** "iPhone · Safari": enough to tell a phone from a laptop without keeping the whole user agent. */
export function deviceOf(ua: string | null): string {
  if (!ua) return "";
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X|Macintosh/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return [os, browser].filter(Boolean).join(" · ");
}

/**
 * Where a conversation came from, attached to it as Retell metadata so each chat and call in the Retell dashboard
 * (and in the summary email) shows it. Location is Vercel's IP lookup; the address itself is kept only as a keyed
 * hash, enough to see the same visitor come back without storing the IP.
 */
export function visitorContext(headers: Headers, secret: string): Record<string, string> {
  const ip = clientIp(headers);
  const context: Record<string, string> = {
    city: decoded(headers.get("x-vercel-ip-city")),
    region: headers.get("x-vercel-ip-country-region") ?? "",
    country: headers.get("x-vercel-ip-country") ?? "",
    visitor: createHmac("sha256", secret).update(ip).digest("hex").slice(0, 12),
    page: pathOf(headers.get("referer")),
    // The page that sent them to the site (document.referrer), which the browser passes along; host only.
    referrer: hostOf(headers.get("x-referrer")),
    device: deviceOf(headers.get("user-agent")),
  };
  return Object.fromEntries(Object.entries(context).filter(([, v]) => v));
}
