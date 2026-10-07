import { createHash } from "node:crypto";

/**
 * Names that must never appear on the site (NDA clients). Stored as SHA-256 of the lowercased word so the
 * guard can run in public CI without publishing the list it protects. To add one:
 *   printf '%s' "name" | shasum -a 256
 */
const BANNED = new Set([
  "20b077152c09736c63e09b7287539421fef8964d9fd0ca92f082d5d50fdd96c4",
  "cb0d32ac41b366b612f8733579ae067dafbef605198af7a219d359911d2abcb6",
  "712b959653a8643ac3a6ca79b934c353f492147d1d711a9aab4c7dd571a8d128",
  "71508df592b4e7185299e7fcdf1de9165e9ff4d182085df3ab3fbbbc46adecbc",
  "5dd95c98aff2e783a09348f600def0d5e4e476f71e85e9be91de86aab36544cd",
  "b3733477164d87458b778ce7edb812a8a993e6cbbbb531b3f1b2f99b744a8242",
  "e0f401bcb6e813fab3edc10c7e69ce3619faf3a5308d717007638955f19a5f69",
]);

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** Words in `text` whose hash is on the list; a trailing possessive or plural "s" is also tried. */
export function bannedTermsIn(text: string): string[] {
  const words = new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  return [...words].filter((w) => BANNED.has(sha(w)) || (w.endsWith("s") && BANNED.has(sha(w.slice(0, -1)))));
}
