import { describe, it, expect } from "vitest";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";

function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

function get(o: Record<string, unknown>, k: string): unknown {
  return k.split(".").reduce<unknown>((a, p) => (a as Record<string, unknown>)?.[p], o);
}

describe("messages", () => {
  it("en and zh message files have identical key sets", () => {
    expect(keys(zh).sort()).toEqual(keys(en).sort());
  });
  it("has no empty strings", () => {
    const empties = [...keys(en), ...keys(zh)].filter((k) => get(en, k) === "" || get(zh, k) === "");
    expect(empties).toEqual([]);
  });
});
