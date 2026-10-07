import { describe, it, expect } from "vitest";
import { buildAgentPrompt, VOICE_BEGIN_MESSAGE } from "@/lib/agent/prompt";
import { agentLlmConfig, agentReply, chatAgentConfig, chatBody, retellConfig, voiceAgentConfig, webCallBody } from "@/lib/agent/retell";
import { personaText } from "@/lib/agent/knowledge";
import { loadYaml } from "@/lib/content/load";
import { Persona } from "@/lib/content/schema";
import { bannedTermsIn } from "./bannedTerms";

describe("agent prompt", () => {
  const prompt = buildAgentPrompt();
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
  it("never names NDA clients and gives the email spoken on calls, written in chat", () => {
    expect(bannedTermsIn(prompt)).toEqual([]);
    expect(prompt).toContain("hello at haoyang dash li dot com");
    expect(prompt).toContain("hello@haoyang-li.com");
  });
  it("switches style on the session's channel and locale", () => {
    expect(prompt).toContain("Channel: {{channel}}. Site language: {{locale}}.");
    expect(prompt).toContain('On a voice call (channel "voice")');
    expect(prompt).toContain('In chat (channel "chat")');
    expect(prompt).toMatch(/never call end_call there/);
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
  it("feeds the agent prompt", () => {
    expect(buildAgentPrompt()).toContain("## In my own words");
  });
});

describe("retell config", () => {
  it("wires the LLM to the prompt with an end_call tool and voice defaults", () => {
    const llm = agentLlmConfig();
    expect(llm.general_prompt).toBe(buildAgentPrompt());
    expect(llm.begin_message).toBe(VOICE_BEGIN_MESSAGE);
    expect(llm.general_tools.map((t) => t.type)).toContain("end_call");
    expect(llm.default_dynamic_variables).toEqual({ channel: "voice", locale: "en" });
  });
  it("points the chat agent at the same LLM version, in English and Chinese", () => {
    const chat = chatAgentConfig("llm_x", 6);
    expect(chat.response_engine).toEqual(voiceAgentConfig("llm_x", 6).response_engine);
    expect(chat.language).toEqual(["en-GB", "zh-CN"]);
  });
  it("reads a separate agent id per channel", () => {
    const env = { RETELL_API_KEY: "k", RETELL_AGENT_ID: "agent_voice", RETELL_CHAT_AGENT_ID: "agent_chat" } as unknown as NodeJS.ProcessEnv;
    expect(retellConfig("voice", env)).toEqual({ apiKey: "k", agentId: "agent_voice" });
    expect(retellConfig("chat", env)).toEqual({ apiKey: "k", agentId: "agent_chat" });
    expect(retellConfig("chat", { RETELL_API_KEY: "k" } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
  it("points the agent at the LLM, caps call length and takes the voice from the environment", () => {
    const agent = voiceAgentConfig("llm_x", 6, "11labs-Haoyang");
    expect(agent.response_engine).toEqual({ type: "retell-llm", llm_id: "llm_x", version: 6 });
    expect(agent.voice_id).toBe("11labs-Haoyang");
    expect(agent.max_call_duration_ms).toBeLessThanOrEqual(15 * 60 * 1000);
  });
  it("pins forwarded web-call bodies to our agent and the voice channel", () => {
    const body = webCallBody({ agent_id: "agent_evil", agent_override: { x: 1 }, retell_llm_dynamic_variables: { channel: "x" }, metadata: { a: "1" }, sdk: "3" }, "agent_ours", "en", { source: "site" });
    expect(body).toEqual({ sdk: "3", agent_id: "agent_ours", retell_llm_dynamic_variables: { channel: "voice", locale: "en" }, metadata: { a: "1", source: "site" } });
    expect(webCallBody("garbage", "agent_ours", "zh", {})).toEqual({ agent_id: "agent_ours", retell_llm_dynamic_variables: { channel: "voice", locale: "zh" }, metadata: {} });
  });
  it("opens chats on our chat agent and the chat channel", () => {
    expect(chatBody("agent_chat", "zh", { source: "site" })).toEqual({ agent_id: "agent_chat", retell_llm_dynamic_variables: { channel: "chat", locale: "zh" }, metadata: { source: "site" } });
  });
  it("keeps only the agent's words from a completion", () => {
    const messages = [
      { role: "tool_call_invocation", content: "{}" },
      { role: "agent", content: " Hi there. " },
      { role: "agent", content: "" },
      { role: "agent", content: "What brings you here?" },
    ];
    expect(agentReply(messages)).toBe("Hi there.\n\nWhat brings you here?");
    expect(agentReply(undefined)).toBe("");
  });
});
