import { describe, it, expect } from "vitest";
import { buildVoicePrompt, VOICE_BEGIN_MESSAGE } from "@/lib/agent/voicePrompt";
import { voiceAgentConfig, voiceLlmConfig, webCallBody } from "@/lib/agent/retell";
import { buildSystemPrompt, personaText } from "@/lib/agent/knowledge";
import { loadYaml } from "@/lib/content/load";
import { Persona } from "@/lib/content/schema";
import { bannedTermsIn } from "./bannedTerms";

describe("voice prompt", () => {
  const prompt = buildVoicePrompt();
  it("speaks as Haoyang in the first person and admits to being an AI", () => {
    expect(prompt).toMatch(/You are Haoyang Li/);
    expect(prompt).toMatch(/first person/);
    expect(prompt).toMatch(/Never claim to be human/);
    expect(VOICE_BEGIN_MESSAGE).toMatch(/AI version/);
  });
  it("carries the CV, the case studies and the persona", () => {
    expect(prompt).toContain("GAIMS");
    expect(prompt).toContain("Kelay");
    expect(prompt).toContain("London School of Economics");
    expect(prompt).toContain("### How I talk");
  });
  it("never names NDA clients and never spells out the email as a URL", () => {
    expect(bannedTermsIn(prompt)).toEqual([]);
    expect(prompt).toContain("hello at haoyang dash li dot com");
  });
  it("tells the agent not to invent and not to read TODO lines", () => {
    expect(prompt).toMatch(/Never invent/);
    expect(prompt).toMatch(/marked TODO/);
  });
});

describe("persona", () => {
  const persona = loadYaml("persona.yaml", Persona);
  it("drops TODO placeholders from the prompt text", () => {
    const text = personaText({ ...persona, facts: ["real fact", "TODO: fill me"], faq: [{ q: "q", a: "TODO: later" }] });
    expect(text).toContain("real fact");
    expect(text).not.toMatch(/TODO/);
    expect(text).not.toContain("Questions people ask me");
  });
  it("also feeds the text assistant", () => {
    expect(buildSystemPrompt("en")).toContain("In Haoyang's own words");
  });
});

describe("retell config", () => {
  it("wires the LLM to the prompt with an end_call tool", () => {
    const llm = voiceLlmConfig();
    expect(llm.general_prompt).toBe(buildVoicePrompt());
    expect(llm.begin_message).toBe(VOICE_BEGIN_MESSAGE);
    expect(llm.general_tools.map((t) => t.type)).toContain("end_call");
  });
  it("points the agent at the LLM, caps call length and takes the voice from the environment", () => {
    const agent = voiceAgentConfig("llm_x", "11labs-Haoyang");
    expect(agent.response_engine).toEqual({ type: "retell-llm", llm_id: "llm_x" });
    expect(agent.voice_id).toBe("11labs-Haoyang");
    expect(agent.max_call_duration_ms).toBeLessThanOrEqual(15 * 60 * 1000);
  });
  it("pins forwarded web-call bodies to our agent", () => {
    const body = webCallBody({ agent_id: "agent_evil", agent_override: { x: 1 }, metadata: { a: "1" }, sdk: "3" }, "agent_ours", { source: "site" });
    expect(body).toEqual({ sdk: "3", agent_id: "agent_ours", metadata: { a: "1", source: "site" } });
    expect(webCallBody("garbage", "agent_ours", {})).toEqual({ agent_id: "agent_ours", metadata: {} });
  });
});
