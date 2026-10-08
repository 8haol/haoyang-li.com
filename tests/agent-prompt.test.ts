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
  it("grounds every fact in the material and skips TODO lines", () => {
    expect(prompt).toMatch(/only true if it is in the material/);
    expect(prompt).toMatch(/Do not derive new facts/);
    expect(prompt).toMatch(/marked TODO/);
    expect(prompt).not.toMatch(/TODO:/);
  });
  it("shows the agent how Haoyang answers and repeats the three checks after the material", () => {
    expect(prompt).toContain("### How a real exchange with me sounds");
    expect(prompt).toMatch(/Visitor: .+\nMe: .+/);
    expect(prompt.trimEnd()).toMatch(/# Before every reply[\s\S]*hand the turn over\?$/);
  });
  it("stays short enough to follow: full write-ups only for featured projects, no markdown to read out", () => {
    expect(prompt.length).toBeLessThan(40_000);
    expect(prompt.match(/^Three decisions:$/gm)).toHaveLength(3);
    expect(prompt).not.toMatch(/\*\*/);
    expect(prompt).not.toMatch(/^## (Context|Architecture)$/m);
  });
  it("knows what the real Haoyang sounds like on the line", () => {
    expect(prompt).toMatch(/If the visitor says they are Haoyang/);
    expect(prompt).toMatch(/still "I", never "he" or "他"/);
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
  it("writes both LLMs from the same prompt and model", () => {
    const voice = agentLlmConfig("voice");
    const chat = agentLlmConfig("chat");
    expect(voice.general_prompt).toBe(buildAgentPrompt());
    expect(chat.general_prompt).toBe(voice.general_prompt);
    expect(chat.model).toBe(voice.model);
    expect(voice.default_dynamic_variables).toEqual({ channel: "voice", locale: "en" });
    expect(chat.default_dynamic_variables).toEqual({ channel: "chat", locale: "en" });
  });
  it("greets and can hang up on a call, waits for the visitor in chat", () => {
    const voice = agentLlmConfig("voice");
    const chat = agentLlmConfig("chat");
    expect(voice).toMatchObject({ start_speaker: "agent", begin_message: VOICE_BEGIN_MESSAGE });
    expect(voice.general_tools.map((t) => t.type)).toContain("end_call");
    expect(chat.start_speaker).toBe("user");
    expect(chat).not.toHaveProperty("begin_message");
    expect(chat.general_tools).toEqual([]);
  });
  it("runs the chat agent on its LLM's matching version, in English and Chinese", () => {
    const chat = chatAgentConfig("llm_chat", 3);
    expect(chat.response_engine).toEqual({ type: "retell-llm", llm_id: "llm_chat", version: 3 });
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
  it("lets the visitor finish, hears the names right and says them right", () => {
    const agent = voiceAgentConfig("llm_x", 6);
    expect(agent.interruption_sensitivity).toBeLessThanOrEqual(0.7);
    expect(agent.responsiveness).toBeLessThan(1);
    expect(agent.backchannel_frequency).toBeLessThanOrEqual(0.4);
    expect(agent.begin_message_delay_ms).toBeGreaterThan(0);
    expect(agent.reminder_max_count).toBeGreaterThan(0);
    expect(agent.stt_mode).toBe("accurate");
    expect(agent.boosted_keywords).toEqual(expect.arrayContaining(["Haoyang", "Kelay", "GAIMS"]));
    expect(agent.pronunciation_dictionary.map((p) => p.word)).toEqual(expect.arrayContaining(["Haoyang", "Kelay"]));
    for (const p of agent.pronunciation_dictionary) expect(p.alphabet).toBe("ipa");
  });
  it("keeps the model close to its material and asks the post-call analysis to flag unsupported claims", () => {
    expect(agentLlmConfig("voice").model_temperature).toBeLessThanOrEqual(0.3);
    const names = (fields: { name: string }[]) => fields.map((f) => f.name);
    expect(names(voiceAgentConfig("llm_x", 1).post_call_analysis_data)).toContain("claims_to_verify");
    expect(names(chatAgentConfig("llm_x", 1).post_chat_analysis_data)).toContain("claims_to_verify");
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
